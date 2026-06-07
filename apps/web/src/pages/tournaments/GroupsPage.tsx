import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Card, SectionTitle, Spinner } from '../../components/ui'

interface Group {
  id: string
  tournament_id: string
  name: string
}

interface GroupMember {
  id: string
  group_id: string
  team_id: string
  team_name?: string
}

interface Match {
  id: string
  tournament_id: string
  team1_id: string
  team2_id: string
  winner_id: string | null
  score_team1: number | null
  score_team2: number | null
  status: string
  group_id: string | null
}

interface Standing {
  team_id: string
  team_name: string
  played: number
  wins: number
  draws: number
  losses: number
  pts: number
  gf: number
  ga: number
}

function computeGroupStandings(members: GroupMember[], matches: Match[]): Standing[] {
  const map: Record<string, Standing> = {}
  for (const m of members) {
    map[m.team_id] = {
      team_id: m.team_id,
      team_name: m.team_name ?? m.team_id.slice(0, 8),
      played: 0, wins: 0, draws: 0, losses: 0, pts: 0, gf: 0, ga: 0,
    }
  }
  for (const match of matches) {
    if (match.status !== 'completed') continue
    const t1 = map[match.team1_id]
    const t2 = map[match.team2_id]
    if (!t1 || !t2) continue
    const s1 = match.score_team1 ?? 0
    const s2 = match.score_team2 ?? 0
    t1.played++; t2.played++
    t1.gf += s1; t1.ga += s2
    t2.gf += s2; t2.ga += s1
    if (match.winner_id === match.team1_id) {
      t1.wins++; t1.pts += 3; t2.losses++
    } else if (match.winner_id === match.team2_id) {
      t2.wins++; t2.pts += 3; t1.losses++
    } else {
      t1.draws++; t1.pts++; t2.draws++; t2.pts++
    }
  }
  return Object.values(map).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga))
}

export function GroupsPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, format')
        .eq('id', tournamentId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!tournamentId,
  })

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['groups', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .order('name')
      if (error) throw error
      return data as Group[]
    },
    enabled: !!tournamentId,
  })

  const { data: groupMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['group_members', tournamentId],
    queryFn: async () => {
      if (!groups || groups.length === 0) return []
      const groupIds = groups.map(g => g.id)
      const { data: members, error } = await supabase
        .from('group_members')
        .select('id, group_id, team_id')
        .in('group_id', groupIds)
      if (error) throw error

      // Fetch team names (try clubs then profiles)
      const teamIds = [...new Set((members ?? []).map(m => m.team_id))]
      const { data: clubs } = await supabase
        .from('clubs')
        .select('id, name')
        .in('id', teamIds)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', teamIds)

      const nameMap: Record<string, string> = {}
      for (const c of clubs ?? []) nameMap[c.id] = c.name
      for (const p of profiles ?? []) if (!nameMap[p.id]) nameMap[p.id] = p.username

      return (members ?? []).map(m => ({ ...m, team_name: nameMap[m.team_id] ?? m.team_id.slice(0, 8) })) as GroupMember[]
    },
    enabled: !!groups,
  })

  const { data: matches, isLoading: loadingMatches } = useQuery({
    queryKey: ['group_matches', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .not('group_id', 'is', null)
      if (error) throw error
      return data as Match[]
    },
    enabled: !!tournamentId,
  })

  // Realtime subscription on matches
  useEffect(() => {
    if (!tournamentId) return
    const channel = supabase
      .channel(`group-matches-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['group_matches', tournamentId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, qc])

  const isLoading = loadingGroups || loadingMembers || loadingMatches

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={32} />
      </div>
    )
  }

  // If tournament is bracket format or no groups
  if (!groups || groups.length === 0) {
    return (
      <div className="screen-enter">
        <div style={{ marginBottom: 20, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
          Phase de groupes
        </div>
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Format bracket, pas de phase de groupes</div>
          <div style={{ fontSize: 13 }}>Ce tournoi utilise un format à élimination directe.</div>
        </Card>
      </div>
    )
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--muted)',
    fontFamily: 'var(--font-display)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '11px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    borderBottom: '1px solid var(--border)',
  }
  const tdNum: React.CSSProperties = { ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 24, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
        Phase de groupes {tournament ? `— ${tournament.name}` : ''}
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        {groups.map(group => {
          const members = (groupMembers ?? []).filter(m => m.group_id === group.id)
          const groupMatches = (matches ?? []).filter(m => m.group_id === group.id)
          const standings = computeGroupStandings(members, groupMatches)

          return (
            <Card key={group.id} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '14px 18px',
                background: 'var(--mute-bg)',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '-0.02em',
              }}>
                {group.name}
              </div>

              {standings.length === 0 ? (
                <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                  Aucune équipe dans ce groupe
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--mute-bg)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ ...thStyle, width: 32 }}>#</th>
                      <th style={thStyle}>Équipe</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>J</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>V</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>N</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>D</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>GF</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>GA</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.team_id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--mute-bg)' }}>
                        <td style={{ ...tdStyle, color: 'var(--muted)', fontWeight: 700, width: 32 }}>{i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.team_name}</td>
                        <td style={tdNum}>{row.played}</td>
                        <td style={{ ...tdNum, color: '#22c55e' }}>{row.wins}</td>
                        <td style={tdNum}>{row.draws}</td>
                        <td style={{ ...tdNum, color: 'var(--accent)' }}>{row.losses}</td>
                        <td style={tdNum}>{row.gf}</td>
                        <td style={tdNum}>{row.ga}</td>
                        <td style={{ ...tdNum, fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
