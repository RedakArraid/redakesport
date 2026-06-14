import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Card, Badge, Btn, Spinner } from '../../components/ui'

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
    case 'scheduled': return 'var(--blue)'
    case 'ongoing': return '#22c55e'
    case 'completed': return 'var(--muted)'
    case 'disputed': return 'var(--accent)'
    default: return 'var(--muted)'
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    scheduled: 'Programmé',
    ongoing: 'En cours',
    completed: 'Terminé',
    disputed: 'Litige',
    cancelled: 'Annulé',
  }
  return map[status] ?? status
}

function generateICS(matches: MatchRow[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Redak Esport//Calendar//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const m of matches) {
    const dt = parseISO(m.scheduled_at)
    const dtStr = format(dt, "yyyyMMdd'T'HHmmss")
    const endStr = format(new Date(dt.getTime() + 60 * 60 * 1000), "yyyyMMdd'T'HHmmss")
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.id}@redakesport.com`,
      `DTSTART:${dtStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${m.team1_name ?? 'Équipe 1'} vs ${m.team2_name ?? 'Équipe 2'}`,
      `DESCRIPTION:Tournoi: ${m.tournament_name ?? ''} | Statut: ${statusLabel(m.status)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

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

  const { data: myTeamIds } = useQuery({
    queryKey: ['my-team-ids', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('player_id', user.id)
      return (data ?? []).map(r => r.club_id)
    },
    enabled: !!user,
  })

  const { data: matches, isLoading } = useQuery({
    queryKey: ['calendar-matches', filter, myTeamIds],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select('id, scheduled_at, team1_id, team2_id, status, tournament_id')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true })

      if (filter === 'mine' && myTeamIds && myTeamIds.length > 0) {
        query = query.or(`team1_id.in.(${myTeamIds.join(',')}),team2_id.in.(${myTeamIds.join(',')})`)
      }

      const { data: rawMatches, error } = await query
      if (error) throw error
      if (!rawMatches || rawMatches.length === 0) return []

      // Enrich with tournament names
      const tournamentIds = [...new Set(rawMatches.map(m => m.tournament_id).filter(Boolean))]
      const teamIds = [...new Set([
        ...rawMatches.map(m => m.team1_id),
        ...rawMatches.map(m => m.team2_id),
      ].filter(Boolean))]

      const [{ data: tournaments }, { data: clubs }, { data: profiles }] = await Promise.all([
        supabase.from('tournaments').select('id, name').in('id', tournamentIds),
        supabase.from('clubs').select('id, name').in('id', teamIds),
        supabase.from('profiles').select('id, username').in('id', teamIds),
      ])

      const tMap: Record<string, string> = {}
      for (const t of tournaments ?? []) tMap[t.id] = t.name

      const teamMap: Record<string, string> = {}
      for (const c of clubs ?? []) teamMap[c.id] = c.name
      for (const p of profiles ?? []) if (!teamMap[p.id]) teamMap[p.id] = p.username

      return rawMatches.map(m => ({
        ...m,
        tournament_name: m.tournament_id ? tMap[m.tournament_id] : undefined,
        team1_name: teamMap[m.team1_id] ?? 'Équipe 1',
        team2_name: teamMap[m.team2_id] ?? 'Équipe 2',
      })) as MatchRow[]
    },
    enabled: filter === 'all' || !!myTeamIds,
  })

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
    transition: 'all 0.15s',
  })

  return (
    <div className="screen-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
          Calendrier des matches
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={filterBtnStyle(filter === 'all')} onClick={() => setFilter('all')}>Tous</button>
            <button style={filterBtnStyle(filter === 'mine')} onClick={() => setFilter('mine')}>Mes matches</button>
          </div>
          {matches && matches.length > 0 && (
            <Btn variant="secondary" size="sm" onClick={() => downloadICS(matches)}>
              📅 Exporter iCal
            </Btn>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={32} />
        </div>
      ) : groupedByDay.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Aucun match programmé</div>
          <div style={{ fontSize: 13 }}>
            {filter === 'mine' ? 'Vous n\'avez pas de match à venir.' : 'Aucun match avec une date programmée.'}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groupedByDay.map(group => (
            <div key={group.dateKey}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 14,
                textTransform: 'capitalize',
                color: 'var(--muted)',
                marginBottom: 10,
                letterSpacing: '0.02em',
              }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.matches.map(match => (
                  <Card key={match.id} style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--muted)',
                        minWidth: 48,
                      }}>
                        {format(parseISO(match.scheduled_at), 'HH:mm')}
                      </div>

                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)' }}>
                          {match.team1_name}
                        </span>
                        <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 12 }}>vs</span>
                        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)' }}>
                          {match.team2_name}
                        </span>
                      </div>

                      {match.tournament_name && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                          {match.tournament_name}
                        </div>
                      )}

                      <div style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        background: statusColor(match.status) + '22',
                        color: statusColor(match.status),
                        border: `1px solid ${statusColor(match.status)}44`,
                      }}>
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
