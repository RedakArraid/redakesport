import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useMediaUpload } from '../../hooks/useMediaUpload'
import { Card, Badge, Btn, SectionTitle, Spinner } from '../../components/ui'
import type { Match, ScoreSubmission } from '../../types/database'

type Tab = 'submit' | 'pending' | 'disputes' | 'history'

export function ScoresPage() {
  const [tab, setTab] = useState<Tab>('submit')
  const { user } = useAuthStore()

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Scores</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Soumission et validation des résultats</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['submit', 'pending', 'disputes', 'history'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`topnav-item${tab === t ? ' active' : ''}`}>
            {t === 'submit' ? '✏️ Soumettre' : t === 'pending' ? '⏳ En attente' : t === 'disputes' ? '⚠️ Litiges' : '📜 Historique'}
          </button>
        ))}
      </div>

      {tab === 'submit' && <SubmitScoreTab userId={user?.id} />}
      {tab === 'pending' && <PendingTab userId={user?.id} />}
      {tab === 'disputes' && <DisputesTab />}
      {tab === 'history' && <HistoryTab userId={user?.id} />}
    </div>
  )
}

function SubmitScoreTab({ userId }: { userId?: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const { addToast } = useUIStore()
  const qc = useQueryClient()
  const { upload, isUploading, progress } = useMediaUpload()

  // Fetch matches where user's club or user is a participant
  const { data: matches, isLoading } = useQuery({
    queryKey: ['my-matches', userId],
    queryFn: async () => {
      // Get user's club first
      const { data: club } = await supabase
        .from('clubs').select('id').eq('captain_id', userId!).maybeSingle()

      // Get matches involving user as team1 or team2 (club or player)
      const conditions = [`team1_id.eq.${userId},team2_id.eq.${userId}`]
      if (club?.id) conditions[0] += `,team1_id.eq.${club.id},team2_id.eq.${club.id}`

      const { data, error } = await supabase
        .from('matches')
        .select('*, tournaments(name)')
        .in('status', ['pending', 'live'])
        .or(conditions[0])
        .order('scheduled_at', { ascending: true })
        .limit(30)

      if (error) {
        // Fallback: show all pending matches if RLS allows
        const { data: fallback } = await supabase
          .from('matches').select('*, tournaments(name)').in('status', ['pending', 'live']).limit(20)
        return (fallback ?? []) as (Match & { tournaments: { name: string } | null })[]
      }
      return (data ?? []) as (Match & { tournaments: { name: string } | null })[]
    },
    enabled: !!userId,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      let screenshotUrls: string[] = []

      if (screenshotFile) {
        const path = `${selectedMatch!.id}/${Date.now()}-${screenshotFile.name}`
        const { url } = await upload(screenshotFile, 'score-screenshots', path)
        screenshotUrls = [url]
      }

      const { error } = await supabase.functions.invoke('score-submit', {
        body: { match_id: selectedMatch!.id, score_team1: score1, score_team2: score2, screenshot_urls: screenshotUrls },
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      addToast('success', 'Score soumis ! En attente de confirmation.')
      setStep(3)
      qc.invalidateQueries({ queryKey: ['my-matches'] })
    },
    onError: (e: Error) => addToast('error', e.message),
  })

  if (step === 3) {
    return (
      <Card style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Score soumis !</div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
          En attente de confirmation par l'équipe adverse.
        </div>
        <Btn onClick={() => { setStep(1); setSelectedMatch(null); setScore1(0); setScore2(0); setScreenshotFile(null) }} variant="secondary">
          Soumettre un autre score
        </Btn>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
      {/* Steps indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: step >= s ? 'var(--ink)' : 'var(--mute-bg)',
              color: step >= s ? '#fff' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{s}</div>
            {s < 2 && <div style={{ flex: 1, height: 2, background: step > s ? 'var(--ink)' : 'var(--border)' }} />}
          </React.Fragment>
        ))}
        <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--muted)' }}>
          {step === 1 ? 'Sélectionner le match' : 'Entrer le score + preuve'}
        </span>
      </div>

      {step === 1 && (
        <Card>
          <SectionTitle>Sélectionne ton match</SectionTitle>
          {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            : matches?.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
                Aucun match en attente de score pour toi
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matches?.map((m) => (
                  <button key={m.id} onClick={() => { setSelectedMatch(m); setStep(2) }} style={{
                    padding: '14px 16px', borderRadius: 10, border: '1.5px solid var(--border)',
                    background: 'var(--bg)', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                        Match #{m.match_number ?? m.id.slice(0, 8)}
                      </div>
                      {m.tournaments && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.tournaments.name}</div>
                      )}
                    </div>
                    <Badge label={m.status === 'live' ? 'LIVE' : 'À jouer'}
                      color={m.status === 'live' ? '#fff' : 'var(--muted)'}
                      bg={m.status === 'live' ? 'var(--accent)' : 'var(--mute-bg)'} />
                  </button>
                ))}
              </div>
            )}
        </Card>
      )}

      {step === 2 && selectedMatch && (
        <Card>
          <SectionTitle>Score du match #{selectedMatch.match_number ?? selectedMatch.id.slice(0, 8)}</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Équipe 1</div>
              <input type="number" min={0} max={99} value={score1}
                onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '16px', textAlign: 'center', fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', border: '2px solid var(--border)', borderRadius: 12, background: 'var(--bg)', outline: 'none' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--muted)' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Équipe 2</div>
              <input type="number" min={0} max={99} value={score2}
                onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '16px', textAlign: 'center', fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', border: '2px solid var(--border)', borderRadius: 12, background: 'var(--bg)', outline: 'none' }} />
            </div>
          </div>

          {/* Screenshot upload */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
              Capture d'écran (recommandé)
            </label>
            <input type="file" accept="image/*"
              onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 13 }} />
            {screenshotFile && (
              <div style={{ fontSize: 12, color: '#1a7a4a', marginTop: 4 }}>✓ {screenshotFile.name}</div>
            )}
            {isUploading && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 4, background: 'var(--mute-bg)', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--ink)', borderRadius: 999, transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Upload {progress}%...</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            ⚠️ L'équipe adverse devra confirmer ce score. Litige ouvert en cas de désaccord.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={() => setStep(1)}>Retour</Btn>
            <Btn onClick={() => submitMutation.mutate()} loading={submitMutation.isPending || isUploading}>
              Soumettre le score
            </Btn>
          </div>
        </Card>
      )}
    </div>
  )
}

function PendingTab({ userId }: { userId?: string }) {
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', 'pending'],
    queryFn: async () => {
      const { data } = await supabase
        .from('score_submissions').select('*, matches(match_number, tournaments(name))')
        .eq('status', 'pending').order('submitted_at', { ascending: false })
      return (data ?? []) as (ScoreSubmission & { matches: { match_number: number | null; tournaments: { name: string } | null } | null })[]
    },
    enabled: !!userId,
  })

  const confirmMutation = useMutation({
    mutationFn: async (sub: ScoreSubmission) => {
      const { error } = await supabase.functions.invoke('score-submit', {
        body: { match_id: sub.match_id, score_team1: sub.score_team1, score_team2: sub.score_team2, screenshot_urls: [] },
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { addToast('success', 'Score confirmé !'); qc.invalidateQueries({ queryKey: ['submissions'] }) },
    onError: (e: Error) => addToast('error', e.message),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>

  return (
    <div>
      {submissions?.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Aucun score en attente de confirmation</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {submissions?.map((s) => (
            <Card key={s.id} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16 }}>
                    {s.score_team1} — {s.score_team2}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Match #{s.matches?.match_number ?? s.match_id.slice(0, 8)}
                    {s.matches?.tournaments?.name && ` · ${s.matches.tournaments.name}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    Soumis le {new Date(s.submitted_at).toLocaleDateString('fr-FR')}
                  </div>
                  {s.screenshot_urls?.length > 0 && (
                    <a href={s.screenshot_urls[0]} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: 'var(--blue)', marginTop: 4, display: 'inline-block' }}>
                      📷 Voir la preuve
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn size="sm" onClick={() => confirmMutation.mutate(s)} loading={confirmMutation.isPending}>
                    Confirmer
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function DisputesTab() {
  const { data: disputed, isLoading } = useQuery({
    queryKey: ['matches', 'disputed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, score_submissions(*), tournaments(name)')
        .eq('status', 'disputed')
      return data ?? []
    },
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>

  return (
    <div>
      {disputed?.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700 }}>Aucun litige en cours</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputed?.map((m: Record<string, unknown>) => (
            <Card key={m.id as string} style={{ padding: '16px 20px', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Badge label="⚠️ Litige" color="var(--accent)" bg="#fee" />
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  Match #{(m.match_number as number | null) ?? (m.id as string).slice(0, 8)}
                  {(m as Record<string, unknown>).tournaments && ` · ${((m as Record<string, unknown>).tournaments as { name: string }).name}`}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Les deux équipes ont soumis des scores contradictoires. L'organisateur doit résoudre ce litige dans le panneau Admin.
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryTab({ userId }: { userId?: string }) {
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', 'history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('score_submissions').select('*, matches(match_number, tournaments(name))')
        .in('status', ['confirmed', 'disputed'])
        .order('submitted_at', { ascending: false }).limit(30)
      return (data ?? []) as (ScoreSubmission & { matches: { match_number: number | null; tournaments: { name: string } | null } | null })[]
    },
    enabled: !!userId,
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>

  return (
    <div>
      {submissions?.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Aucun score dans l'historique</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {submissions?.map((s) => (
            <Card key={s.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {s.score_team1} — {s.score_team2}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {s.matches?.tournaments?.name ?? 'Tournoi'} · {new Date(s.submitted_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {s.screenshot_urls?.length > 0 && (
                  <a href={s.screenshot_urls[0]} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue)' }}>📷</a>
                )}
                <Badge
                  label={s.status === 'confirmed' ? '✓ Validé' : '⚠️ Litige'}
                  color={s.status === 'confirmed' ? '#1a7a4a' : 'var(--accent)'}
                  bg={s.status === 'confirmed' ? '#e6f7ef' : '#fee'}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
