import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Card, Badge, Btn, SectionTitle, Spinner } from '../../components/ui'
import type { Match, ScoreSubmission } from '../../types/database'

type Tab = 'submit' | 'pending' | 'history'

export function ScoresPage() {
  const [tab, setTab] = useState<Tab>('submit')
  const { user } = useAuthStore()

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Scores</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Soumission et validation des scores</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['submit', 'pending', 'history'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`topnav-item${tab === t ? ' active' : ''}`}>
            {t === 'submit' ? '✏️ Soumettre' : t === 'pending' ? '⏳ En attente' : '📜 Historique'}
          </button>
        ))}
      </div>

      {tab === 'submit' && <SubmitScoreTab userId={user?.id} />}
      {tab === 'pending' && <PendingTab userId={user?.id} />}
      {tab === 'history' && <HistoryTab userId={user?.id} />}
    </div>
  )
}

function SubmitScoreTab({ userId }: { userId?: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  const { data: matches, isLoading } = useQuery({
    queryKey: ['my-matches', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .in('status', ['pending', 'live'])
        .limit(20)
      if (error) throw error
      return data as Match[]
    },
    enabled: !!userId,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('score-submit', {
        body: {
          match_id: selectedMatch!.id,
          score_team1: score1,
          score_team2: score2,
          screenshot_urls: [],
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      addToast('success', 'Score soumis ! En attente de confirmation par l\'adversaire.')
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
          En attente de confirmation par l'équipe adverse. Tu seras notifié quand le score sera validé.
        </div>
        <Btn onClick={() => { setStep(1); setSelectedMatch(null); setScore1(0); setScore2(0) }} variant="secondary">
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
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step >= s ? 'var(--ink)' : 'var(--mute-bg)',
              color: step >= s ? '#fff' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)',
            }}>{s}</div>
            {s < 2 && <div style={{ flex: 1, height: 2, background: step > s ? 'var(--ink)' : 'var(--border)' }} />}
          </React.Fragment>
        ))}
        <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--muted)' }}>
          {step === 1 ? 'Sélectionner le match' : 'Entrer le score'}
        </span>
      </div>

      {step === 1 && (
        <Card>
          <SectionTitle>Sélectionne ton match</SectionTitle>
          {isLoading ? <Spinner /> : matches?.length === 0 ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Aucun match en attente de score</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matches?.map((m) => (
                <button key={m.id} onClick={() => { setSelectedMatch(m); setStep(2) }} style={{
                  padding: '14px 16px', borderRadius: 10, border: '1.5px solid var(--border)',
                  background: 'var(--bg)', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>Match #{m.match_number ?? m.id.slice(0, 8)}</span>
                  <Badge label={m.status} />
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === 2 && selectedMatch && (
        <Card>
          <SectionTitle>Score du match #{selectedMatch.match_number ?? selectedMatch.id.slice(0, 8)}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Équipe 1</div>
              <input
                type="number" min={0} max={99} value={score1}
                onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '16px', textAlign: 'center', fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', border: '2px solid var(--border)', borderRadius: 12, background: 'var(--bg)', outline: 'none' }}
              />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--muted)' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Équipe 2</div>
              <input
                type="number" min={0} max={99} value={score2}
                onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '16px', textAlign: 'center', fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', border: '2px solid var(--border)', borderRadius: 12, background: 'var(--bg)', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            ⚠️ L'équipe adverse devra confirmer ce score. En cas de désaccord, un litige sera ouvert.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={() => setStep(1)}>Retour</Btn>
            <Btn onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
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
    queryKey: ['submissions', 'pending', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('score_submissions').select('*').eq('status', 'pending')
      if (error) throw error
      return data as ScoreSubmission[]
    },
    enabled: !!userId,
  })

  const confirmMutation = useMutation({
    mutationFn: async (sub: ScoreSubmission) => {
      const { error } = await supabase.functions.invoke('score-submit', {
        body: {
          match_id: sub.match_id,
          score_team1: sub.score_team1,
          score_team2: sub.score_team2,
          screenshot_urls: [],
        },
      })
      if (error) throw error
    },
    onSuccess: () => { addToast('success', 'Score confirmé !'); qc.invalidateQueries({ queryKey: ['submissions'] }) },
    onError: (e: Error) => addToast('error', e.message),
  })

  return (
    <div>
      {isLoading ? <Spinner /> : submissions?.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Aucun score en attente</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {submissions?.map((s) => (
            <Card key={s.id} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 15 }}>
                    Match · {s.score_team1} — {s.score_team2}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Soumis le {new Date(s.submitted_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Btn onClick={() => confirmMutation.mutate(s)} loading={confirmMutation.isPending} size="sm">
                  Confirmer
                </Btn>
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
    queryKey: ['submissions', 'history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('score_submissions').select('*')
        .in('status', ['confirmed', 'disputed'])
        .order('submitted_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as ScoreSubmission[]
    },
    enabled: !!userId,
  })

  return (
    <div>
      {isLoading ? <Spinner /> : submissions?.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Aucun score validé</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {submissions?.map((s) => (
            <Card key={s.id} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {s.score_team1} — {s.score_team2}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(s.submitted_at).toLocaleDateString('fr-FR')}</span>
                <Badge label={s.status} color={s.status === 'confirmed' ? '#1a7a4a' : 'var(--accent)'} bg={s.status === 'confirmed' ? '#e6f7ef' : '#fee'} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
