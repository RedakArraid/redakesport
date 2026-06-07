import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Card, SectionTitle, Spinner } from '../../components/ui'
import type { Match } from '../../types/database'

interface StandingRow {
  team_id: string
  name: string
  wins: number
  losses: number
  draws: number
  points: number
  map_diff: number
}

export function StandingsPage() {
  const { id: tournamentId } = useParams<{ id: string }>()

  const { data: standings, isLoading } = useQuery({
    queryKey: ['standings', tournamentId],
    queryFn: async () => {
      // Try dedicated standings table first
      const { data: s } = await supabase
        .from('standings')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .order('points', { ascending: false })

      if (s && s.length > 0) return s

      // Fallback: compute from completed matches
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .eq('status', 'completed')
      if (error) throw error
      return computeStandings(matches as Match[])
    },
    enabled: !!tournamentId,
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 20, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Classement</div>

      {!standings || standings.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 700 }}>Aucun match joué pour le moment</div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--mute-bg)' }}>
                {['#', 'Équipe', 'V', 'D', 'N', 'Pts'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: h === 'Équipe' ? 'left' : 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => (
                <StandingRowCmp key={row.team_id} row={row} rank={idx + 1} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function StandingRowCmp({ row, rank }: { row: StandingRow; rank: number }) {
  const { data: name } = useQuery({
    queryKey: ['team-name', row.team_id],
    queryFn: async () => {
      const { data } = await supabase.from('clubs').select('name').eq('id', row.team_id).maybeSingle()
      if (data) return data.name
      const { data: p } = await supabase.from('profiles').select('username').eq('id', row.team_id).maybeSingle()
      return p?.username ?? row.team_id.slice(0, 8)
    },
    staleTime: Infinity,
  })

  const isTop = rank <= 2
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', background: isTop ? 'rgba(37,71,255,0.02)' : undefined }}>
      <td style={{ padding: '12px 14px', textAlign: 'center', width: 40 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
          color: rank === 1 ? '#c9a227' : rank === 2 ? 'var(--muted)' : 'var(--ink)',
        }}>{rank}</span>
      </td>
      <td style={{ padding: '12px 14px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
          {name ?? '...'}
        </span>
      </td>
      {[row.wins ?? 0, row.losses ?? 0, row.draws ?? 0].map((v, i) => (
        <td key={i} style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{v}</td>
      ))}
      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: isTop ? 'var(--blue)' : 'var(--ink)' }}>
          {row.points ?? 0}
        </span>
      </td>
    </tr>
  )
}

function computeStandings(matches: Match[]): StandingRow[] {
  const map = new Map<string, StandingRow>()

  const get = (id: string): StandingRow => {
    if (!map.has(id)) map.set(id, { team_id: id, name: id, wins: 0, losses: 0, draws: 0, points: 0, map_diff: 0 })
    return map.get(id)!
  }

  for (const m of matches) {
    if (!m.winner_id || !m.loser_id) continue
    get(m.winner_id).wins++
    get(m.winner_id).points += 3
    get(m.loser_id).losses++
  }

  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.wins - a.wins)
}
