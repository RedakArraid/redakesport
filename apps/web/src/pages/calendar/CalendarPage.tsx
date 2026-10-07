import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { db, rowsByIds } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { Card, Btn, Spinner } from '../../components/ui'

type FilterMode = 'all' | 'mine'

interface MatchRow {
  id: string
  scheduled_at: string
  team1_id: string
  team2_id: string
  status: string
  tournament_id: string
  tournament_name?: string
  team1_name?: string
  team2_name?: string
}

function statusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'var(--blue)'
    case 'live':
      return '#22c55e'
    case 'completed':
      return 'var(--muted)'
    case 'disputed':
      return 'var(--accent)'
    default:
      return 'var(--muted)'
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Programmé',
    live: 'En cours',
    completed: 'Terminé',
    disputed: 'Litige',
    cancelled: 'Annulé',
  }
  return map[status] ?? status
}

import { generateICS } from '../../lib/calendar'

function downloadICS(matches: MatchRow[]) {
  const content = generateICS(matches)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'redak-esport-matches.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export function CalendarPage() {
  const { user } = useAuthStore()
  const [filter, setFilter] = useState<FilterMode>('all')

  const teamsQuery = useQuery({
    queryKey: ['my-team-ids', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await db
        .from('club_members')
        .select('club_id')
        .eq('player_id', user.id)
      if (error) throw error
      return [user.id, ...(data ?? []).map((r) => r.club_id)]
    },
    enabled: !!user,
  })
  const myTeamIds = teamsQuery.data

  const matchesQuery = useQuery({
    queryKey: ['calendar-matches', filter, myTeamIds],
    queryFn: async () => {
      let query = db
        .from('matches')
        .select('id, scheduled_at, team1_id, team2_id, status, tournament_id')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true })

      if (filter === 'mine' && myTeamIds && myTeamIds.length > 0) {
        query = query.or(
          `team1_id.in.(${myTeamIds.join(',')}),team2_id.in.(${myTeamIds.join(',')})`,
        )
      }

      const { data: rawMatches, error } = await query.all()
      if (error) throw error
      if (!rawMatches || rawMatches.length === 0) return []

      // Enrich with tournament names
      const tournamentIds = [
        ...new Set(rawMatches.map((m) => m.tournament_id).filter((id): id is string => !!id)),
      ]
      const teamIds = [
        ...new Set(
          [...rawMatches.map((m) => m.team1_id), ...rawMatches.map((m) => m.team2_id)].filter(
            (id): id is string => !!id,
          ),
        ),
      ]

      const [tournaments, clubs, profiles] = await Promise.all([
        rowsByIds('tournaments', tournamentIds, 'id,name,status'),
        rowsByIds('clubs', teamIds, 'id,name'),
        rowsByIds('profiles', teamIds, 'id,username'),
      ])

      const tMap: Record<string, string> = {}
      for (const t of tournaments ?? []) tMap[t.id] = t.name

      const teamMap: Record<string, string> = {}
      for (const c of clubs ?? []) teamMap[c.id] = c.name
      for (const p of profiles ?? []) if (!teamMap[p.id]) teamMap[p.id] = p.username

      const cancelled = new Set(
        tournaments.filter((t) => t.status === 'cancelled').map((t) => t.id),
      )
      return rawMatches
        .filter((m) => m.status === 'completed' || !cancelled.has(m.tournament_id))
        .map((m) => ({
          ...m,
          tournament_name: m.tournament_id ? tMap[m.tournament_id] : undefined,
          team1_name: teamMap[m.team1_id ?? ''] ?? 'Équipe 1',
          team2_name: teamMap[m.team2_id ?? ''] ?? 'Équipe 2',
        })) as MatchRow[]
    },
    enabled: filter === 'all' || teamsQuery.isSuccess,
  })
  const matches = matchesQuery.data
  const isLoading = matchesQuery.isLoading || (filter === 'mine' && teamsQuery.isPending)
  const error = matchesQuery.error || (filter === 'mine' && teamsQuery.error)

  // Group by day
  const groupedByDay: { dateKey: string; label: string; matches: MatchRow[] }[] = []
  if (matches) {
    const seen: Record<string, number> = {}
    for (const m of matches) {
      const d = parseISO(m.scheduled_at)
      const key = format(d, 'yyyy-MM-dd')
      if (seen[key] === undefined) {
        seen[key] = groupedByDay.length
        groupedByDay.push({
          dateKey: key,
          label: format(d, 'EEEE d MMMM yyyy', { locale: fr }),
          matches: [],
        })
      }
      groupedByDay[seen[key]].matches.push(m)
    }
  }

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 18px',
    borderRadius: 999,
    border: '1.5px solid var(--border)',
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? '#fff' : 'var(--ink)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  })

  return (
    <div className="screen-enter">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: -0.5,
          }}
        >
          Calendrier des matches
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={filterBtnStyle(filter === 'all')} onClick={() => setFilter('all')}>
              Tous
            </button>
            <button style={filterBtnStyle(filter === 'mine')} onClick={() => setFilter('mine')}>
              Mes matches
            </button>
          </div>
          {!error && matches && matches.length > 0 && (
            <Btn variant="secondary" size="sm" onClick={() => downloadICS(matches)}>
              📅 Exporter iCal
            </Btn>
          )}
        </div>
      </div>

      {error ? (
        <Card role="alert">
          <h2>Calendrier indisponible</h2>
          <p>Les rencontres n’ont pas pu être chargées. Réessaie dans quelques instants.</p>
          <Btn
            onClick={() => {
              if (filter === 'mine' && teamsQuery.error) void teamsQuery.refetch()
              else void matchesQuery.refetch()
            }}
          >
            Réessayer
          </Btn>
        </Card>
      ) : isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={32} />
        </div>
      ) : groupedByDay.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            Aucun match programmé
          </div>
          <div style={{ fontSize: 13 }}>
            {filter === 'mine'
              ? "Vous n'avez pas de match à venir."
              : 'Aucun match avec une date programmée.'}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groupedByDay.map((group) => (
            <div key={group.dateKey}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 14,
                  textTransform: 'capitalize',
                  color: 'var(--muted)',
                  marginBottom: 10,
                  letterSpacing: '0.02em',
                }}
              >
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.matches.map((match) => (
                  <Card key={match.id} style={{ padding: '14px 18px' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: 13,
                          color: 'var(--muted)',
                          minWidth: 48,
                        }}
                      >
                        {format(parseISO(match.scheduled_at), 'HH:mm')}
                      </div>

                      <div
                        style={{
                          flex: '1 1 220px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          {match.team1_name}
                        </span>
                        <span
                          style={{
                            color: 'var(--muted)',
                            fontWeight: 600,
                            fontSize: 12,
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          vs
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          {match.team2_name}
                        </span>
                      </div>

                      {match.tournament_name && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--muted)',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          {match.tournament_name}
                        </div>
                      )}

                      <div
                        style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          background: `color-mix(in srgb, ${statusColor(match.status)} 12%, transparent)`,
                          color: statusColor(match.status),
                          border: `1px solid color-mix(in srgb, ${statusColor(match.status)} 25%, transparent)`,
                        }}
                      >
                        {statusLabel(match.status)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
