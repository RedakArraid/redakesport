import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Card, Spinner } from '../../components/ui'

type RoleFilter = 'all' | 'player' | 'captain'

const PAGE_SIZE = 20

const MEDALS = ['🥇', '🥈', '🥉']

interface Profile {
  id: string
  username: string
  elo_rating: number | null
  role: string | null
  country: string | null
  avatar_url: string | null
}

function roleLabel(role: string | null) {
  const map: Record<string, string> = {
    player: 'Joueur',
    captain: 'Capitaine',
    organizer: 'Organisateur',
    caster: 'Caster',
    admin: 'Admin',
  }
  return role ? (map[role] ?? role) : '—'
}

function roleColor(role: string | null) {
  switch (role) {
    case 'captain': return 'var(--blue)'
    case 'organizer': return '#f59e0b'
    case 'admin': return 'var(--accent)'
    default: return 'var(--muted)'
  }
}

export function LeaderboardPage() {
  const { user } = useAuthStore()
  const [page, setPage] = useState(0)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', roleFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, username, elo_rating, role, country, avatar_url', { count: 'exact' })
        .not('elo_rating', 'is', null)
        .order('elo_rating', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { profiles: (data ?? []) as Profile[], total: count ?? 0 }
    },
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 999,
    border: '1.5px solid var(--border)',
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? '#fff' : 'var(--ink)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 12,
    transition: 'all 0.15s',
  })

  return (
    <div className="screen-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
          Classement ELO
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={filterBtnStyle(roleFilter === 'all')} onClick={() => { setRoleFilter('all'); setPage(0) }}>Tous</button>
          <button style={filterBtnStyle(roleFilter === 'player')} onClick={() => { setRoleFilter('player'); setPage(0) }}>Joueurs</button>
          <button style={filterBtnStyle(roleFilter === 'captain')} onClick={() => { setRoleFilter('captain'); setPage(0) }}>Capitaines</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={32} />
        </div>
      ) : !data || data.profiles.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏅</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Aucun joueur classé</div>
        </Card>
      ) : (
        <>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--mute-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Joueur', 'Pays', 'Rôle', 'ELO'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: i === 0 ? 'center' : i === 4 ? 'right' : 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-display)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.profiles.map((profile, i) => {
                  const rank = page * PAGE_SIZE + i + 1
                  const isMe = profile.id === user?.id
                  const isTop3 = rank <= 3 && page === 0

                  return (
                    <tr
                      key={profile.id}
                      style={{
                        background: isMe
                          ? 'var(--blue)18'
                          : isTop3
                          ? i % 2 === 0 ? 'var(--mute-bg)' : 'transparent'
                          : i % 2 === 0 ? 'transparent' : 'var(--mute-bg)',
                        borderBottom: '1px solid var(--border)',
                        outline: isMe ? '2px solid var(--blue)' : undefined,
                        outlineOffset: isMe ? '-2px' : undefined,
                      }}
                    >
                      <td style={{
                        padding: '12px 14px',
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: isTop3 ? 20 : 13,
                        color: isTop3 ? undefined : 'var(--muted)',
                        width: 52,
                      }}>
                        {isTop3 && page === 0 ? MEDALS[i] : rank}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'var(--mute-bg)',
                            border: '1.5px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800, fontSize: 13,
                            color: 'var(--ink)',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}>
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              profile.username?.[0]?.toUpperCase() ?? '?'
                            )}
                          </div>
                          <div>
                            <div style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 700,
                              fontSize: 14,
                              color: 'var(--ink)',
                            }}>
                              {profile.username}
                              {isMe && (
                                <span style={{
                                  marginLeft: 8,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: 'var(--blue)',
                                  background: 'var(--blue)20',
                                  padding: '2px 7px',
                                  borderRadius: 999,
                                }}>Vous</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                        {profile.country ?? '—'}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          color: roleColor(profile.role),
                          background: roleColor(profile.role) + '18',
                          padding: '3px 9px', borderRadius: 999,
                        }}>
                          {roleLabel(profile.role)}
                        </span>
                      </td>

                      <td style={{
                        padding: '12px 14px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: isTop3 ? 17 : 14,
                        color: isTop3 ? 'var(--ink)' : 'var(--ink)',
                      }}>
                        {profile.elo_rating?.toLocaleString('fr-FR') ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: '8px 18px', borderRadius: 999,
                  border: '1.5px solid var(--border)',
                  background: 'transparent', color: 'var(--ink)',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === 0 ? 0.4 : 1,
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                }}
              >
                ← Précédent
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: '8px 18px', borderRadius: 999,
                  border: '1.5px solid var(--border)',
                  background: 'transparent', color: 'var(--ink)',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages - 1 ? 0.4 : 1,
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
