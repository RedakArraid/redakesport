import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Card, Btn, Spinner } from '../../components/ui'

type Tab = 'disputes' | 'tournaments' | 'users'

const ROLES = ['player', 'captain', 'organizer', 'caster', 'admin']

const TOURNAMENT_STATUSES = ['draft', 'registration', 'ongoing', 'completed', 'cancelled'] as const
type TournamentStatus = typeof TOURNAMENT_STATUSES[number]

interface DisputedMatch {
  id: string
  tournament_id: string
  team1_id: string
  team2_id: string
  status: string
  winner_id: string | null
  tournament_name?: string
  team1_name?: string
  team2_name?: string
  submissions?: ScoreSubmission[]
}

interface ScoreSubmission {
  id: string
  match_id: string
  submitted_by: string
  score_team1: number
  score_team2: number
  winner_id: string
  submitter_name?: string
}

interface Tournament {
  id: string
  name: string
  status: TournamentStatus
  organizer_id: string
  game: string | null
  created_at: string
}

interface Profile {
  id: string
  username: string
  email: string | null
  role: string | null
  country: string | null
  elo_rating: number | null
}

function statusColor(status: string) {
  switch (status) {
    case 'ongoing': return '#22c55e'
    case 'registration': return 'var(--blue)'
    case 'completed': return 'var(--muted)'
    case 'cancelled': return 'var(--accent)'
    case 'disputed': return '#f59e0b'
    default: return 'var(--muted)'
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Brouillon', registration: 'Inscriptions', ongoing: 'En cours',
    completed: 'Terminé', cancelled: 'Annulé', disputed: 'Litige',
    scheduled: 'Programmé',
  }
  return map[status] ?? status
}

export function AdminPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('disputes')
  const [userSearch, setUserSearch] = useState('')
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)

  // ── Disputed matches ──
  const { data: disputedMatches, isLoading: loadingDisputes } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'disputed')
      if (error) throw error
      if (!matches || matches.length === 0) return []

      const tIds = [...new Set(matches.map(m => m.tournament_id).filter(Boolean))]
      const teamIds = [...new Set([...matches.map(m => m.team1_id), ...matches.map(m => m.team2_id)])]
      const matchIds = matches.map(m => m.id)

      const [{ data: tournaments }, { data: clubs }, { data: profiles }, { data: submissions }] = await Promise.all([
        supabase.from('tournaments').select('id, name').in('id', tIds),
        supabase.from('clubs').select('id, name').in('id', teamIds),
        supabase.from('profiles').select('id, username').in('id', teamIds),
        supabase.from('score_submissions').select('*').in('match_id', matchIds),
      ])

      const tMap: Record<string, string> = {}
      for (const t of tournaments ?? []) tMap[t.id] = t.name
      const teamMap: Record<string, string> = {}
      for (const c of clubs ?? []) teamMap[c.id] = c.name
      for (const p of profiles ?? []) if (!teamMap[p.id]) teamMap[p.id] = p.username

      const subsByMatch: Record<string, ScoreSubmission[]> = {}
      for (const s of submissions ?? []) {
        if (!subsByMatch[s.match_id]) subsByMatch[s.match_id] = []
        subsByMatch[s.match_id].push({
          ...s,
          submitter_name: teamMap[s.submitted_by] ?? s.submitted_by?.slice(0, 8),
        })
      }

      return matches.map(m => ({
        ...m,
        tournament_name: m.tournament_id ? tMap[m.tournament_id] : undefined,
        team1_name: teamMap[m.team1_id] ?? 'Équipe 1',
        team2_name: teamMap[m.team2_id] ?? 'Équipe 2',
        submissions: subsByMatch[m.id] ?? [],
      })) as DisputedMatch[]
    },
  })

  const validateScore = useMutation({
    mutationFn: async ({ matchId, submission }: { matchId: string; submission: ScoreSubmission }) => {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_id: submission.winner_id,
          score_team1: submission.score_team1,
          score_team2: submission.score_team2,
        })
        .eq('id', matchId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-disputes'] }),
  })

  // ── Tournaments ──
  const { data: tournaments, isLoading: loadingTournaments } = useQuery({
    queryKey: ['admin-tournaments', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, status, organizer_id, game, created_at')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Tournament[]
    },
    enabled: !!user,
  })

  const updateTournamentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TournamentStatus }) => {
      const { error } = await supabase.from('tournaments').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tournaments'] }),
  })

  // ── Users ──
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, username, role, country, elo_rating')
        .order('username')
        .limit(50)
      if (userSearch.trim()) {
        query = query.ilike('username', `%${userSearch.trim()}%`)
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })

  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '9px 20px',
    borderRadius: 999,
    border: 'none',
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    transition: 'all 0.15s',
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'disputes', label: 'Litiges' },
    { id: 'tournaments', label: 'Tournois' },
    { id: 'users', label: 'Utilisateurs' },
  ]

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 6, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
        Administration
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        Espace réservé aux organisateurs
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: 'var(--mute-bg)', borderRadius: 999,
        padding: 4, width: 'fit-content',
      }}>
        {tabs.map(t => (
          <button key={t.id} style={tabStyle(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Litiges ── */}
      {tab === 'disputes' && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            Matches en litige ({disputedMatches?.length ?? 0})
          </div>
          {loadingDisputes ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
          ) : !disputedMatches || disputedMatches.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚖️</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Aucun litige en cours</div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {disputedMatches.map(match => (
                <Card key={match.id} style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                    onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                  >
                    <div style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: 11,
                      fontWeight: 700, fontFamily: 'var(--font-display)',
                      background: '#f59e0b20', color: '#f59e0b',
                    }}>LITIGE</div>
                    <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                      {match.team1_name} vs {match.team2_name}
                    </div>
                    {match.tournament_name && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{match.tournament_name}</div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {expandedMatch === match.id ? '▲' : '▼'}
                    </div>
                  </div>

                  {expandedMatch === match.id && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                      {match.submissions && match.submissions.length === 0 ? (
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune soumission trouvée.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Soumissions contradictoires
                          </div>
                          {match.submissions?.map(sub => (
                            <div key={sub.id} style={{
                              display: 'flex', alignItems: 'center', gap: 14,
                              padding: '12px 14px', borderRadius: 10,
                              background: 'var(--mute-bg)', border: '1px solid var(--border)',
                              flexWrap: 'wrap',
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                                  Score: <span style={{ fontFamily: 'var(--font-mono)' }}>{sub.score_team1} – {sub.score_team2}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                  Soumis par: {sub.submitter_name} · Gagnant: {sub.winner_id === match.team1_id ? match.team1_name : match.team2_name}
                                </div>
                              </div>
                              <Btn
                                size="sm"
                                onClick={() => validateScore.mutate({ matchId: match.id, submission: sub })}
                                loading={validateScore.isPending}
                              >
                                ✓ Valider ce score
                              </Btn>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tournois ── */}
      {tab === 'tournaments' && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            Mes tournois ({tournaments?.length ?? 0})
          </div>
          {loadingTournaments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
          ) : !tournaments || tournaments.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🏆</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Aucun tournoi créé</div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tournaments.map(t => (
                <Card key={t.id} style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                      {t.game && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.game}</div>}
                    </div>

                    <div style={{
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                      background: statusColor(t.status) + '20',
                      color: statusColor(t.status),
                    }}>
                      {statusLabel(t.status)}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['registration', 'ongoing', 'completed'] as TournamentStatus[])
                        .filter(s => s !== t.status)
                        .map(s => (
                          <button
                            key={s}
                            onClick={() => updateTournamentStatus.mutate({ id: t.id, status: s })}
                            disabled={updateTournamentStatus.isPending}
                            style={{
                              padding: '5px 12px', borderRadius: 999,
                              border: '1.5px solid var(--border)',
                              background: 'transparent', color: 'var(--ink)',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11,
                              opacity: updateTournamentStatus.isPending ? 0.5 : 1,
                              transition: 'all 0.12s',
                            }}
                          >
                            → {statusLabel(s)}
                          </button>
                        ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Utilisateurs ── */}
      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
              Utilisateurs
            </div>
            <input
              style={{
                flex: 1, maxWidth: 280,
                padding: '8px 14px', borderRadius: 999,
                border: '1.5px solid var(--border)',
                background: 'var(--mute-bg)', color: 'var(--ink)',
                fontFamily: 'var(--font-body)', fontSize: 13,
              }}
              placeholder="Rechercher un username..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          {loadingUsers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
          ) : !users || users.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Aucun utilisateur trouvé</div>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--mute-bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Utilisateur', 'Pays', 'ELO', 'Rôle'].map((h, i) => (
                      <th key={h} style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: 'var(--muted)', fontFamily: 'var(--font-display)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--mute-bg)',
                    }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{u.username}</div>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--muted)' }}>
                        {u.country ?? '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {u.elo_rating ?? '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <select
                          value={u.role ?? 'player'}
                          onChange={e => updateUserRole.mutate({ id: u.id, role: e.target.value })}
                          style={{
                            padding: '5px 10px', borderRadius: 8,
                            border: '1.5px solid var(--border)',
                            background: 'var(--mute-bg)', color: 'var(--ink)',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
