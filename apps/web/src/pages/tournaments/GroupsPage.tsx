import React from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { Btn, Card, Spinner } from '../../components/ui'

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
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pts: 0,
      gf: 0,
      ga: 0,
    }
  }
  for (const match of matches) {
    if (match.status !== 'completed') continue
    const t1 = map[match.team1_id]
    const t2 = map[match.team2_id]
    if (!t1 || !t2) continue
    const s1 = match.score_team1 ?? 0
    const s2 = match.score_team2 ?? 0
    t1.played++
    t2.played++
    t1.gf += s1
    t1.ga += s2
    t2.gf += s2
    t2.ga += s1
    if (match.winner_id === match.team1_id) {
      t1.wins++
      t1.pts += 3
      t2.losses++
    } else if (match.winner_id === match.team2_id) {
      t2.wins++
      t2.pts += 3
      t1.losses++
    } else {
      t1.draws++
      t1.pts++
      t2.draws++
      t2.pts++
    }
  }
  return Object.values(map).sort(
    (a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || a.team_id.localeCompare(b.team_id),
  )
}

export function GroupsPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const base = useLocation().pathname.startsWith('/app') ? '/app' : ''

  const tournamentQuery = useQuery({
    queryKey: ['tournament-summary', tournamentId],
    queryFn: async () => {
      const { data, error } = await db
        .from('tournaments')
        .select('id, name, format')
        .eq('id', tournamentId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!tournamentId,
  })
  const tournament = tournamentQuery.data

  const groupsQuery = useQuery({
    queryKey: ['groups', tournamentId],
    queryFn: async () => {
      const { data, error } = await db
        .from('groups')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .order('name')
      if (error) throw error
      return data as Group[]
    },
    enabled: !!tournamentId,
  })
  const groups = groupsQuery.data

  const membersQuery = useQuery({
    queryKey: ['group_members', tournamentId],
    queryFn: async () => {
      if (!groups || groups.length === 0) return []
      const groupIds = groups.map((g) => g.id)
      const { data: rawMembers, error } = await db
        .from('group_members')
        .select('group_id, club_id, player_id')
        .in('group_id', groupIds)
      if (error) throw error

      const members = (rawMembers ?? []).map((m) => ({
        group_id: m.group_id,
        team_id: (m.club_id ?? m.player_id)!,
        id: `${m.group_id}-${m.club_id ?? m.player_id}`,
      }))
      // Fetch team names (try clubs then profiles)
      const teamIds = [...new Set((members ?? []).map((m) => m.team_id))]
      const { data: clubs, error: clubsError } = await db
        .from('clubs')
        .select('id, name')
        .in('id', teamIds)
      const { data: profiles, error: profilesError } = await db
        .from('profiles')
        .select('id, username')
        .in('id', teamIds)
      if (clubsError || profilesError) throw clubsError || profilesError

      const nameMap: Record<string, string> = {}
      for (const c of clubs ?? []) nameMap[c.id] = c.name
      for (const p of profiles ?? []) if (!nameMap[p.id]) nameMap[p.id] = p.username

      return (members ?? []).map((m) => ({
        ...m,
        team_name: nameMap[m.team_id] ?? m.team_id.slice(0, 8),
      })) as GroupMember[]
    },
    enabled: !!groups,
  })
  const groupMembers = membersQuery.data

  const matchesQuery = useQuery({
    queryKey: ['group_matches', tournamentId],
    refetchInterval: (query) => ((query.state.data?.length ?? 0) > 1000 ? 30000 : 5000),
    queryFn: async () => {
      const { data, error } = await db
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .not('group_id', 'is', null)
        .all()
      if (error) throw error
      return data as Match[]
    },
    enabled: !!tournamentId,
  })
  const matches = matchesQuery.data

  const isLoading =
    tournamentQuery.isLoading ||
    groupsQuery.isLoading ||
    membersQuery.isLoading ||
    matchesQuery.isLoading

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (
    tournamentQuery.error ||
    groupsQuery.error ||
    membersQuery.error ||
    matchesQuery.error ||
    !tournament
  ) {
    return (
      <Card>
        <h1>Poules indisponibles</h1>
        <p>
          {tournamentQuery.error || !tournament
            ? 'Ce tournoi est privé, n’existe plus ou ne peut pas être chargé.'
            : 'Les poules n’ont pas pu être chargées. Réessaie dans quelques instants.'}
        </p>
        <div className="action-row">
          <Btn
            onClick={() => {
              void tournamentQuery.refetch()
              void groupsQuery.refetch()
              if (groups?.length) void membersQuery.refetch()
              void matchesQuery.refetch()
            }}
          >
            Réessayer
          </Btn>
          <Link to={`${base}/tournaments/${tournamentId}`}>Revenir au tournoi</Link>
        </div>
      </Card>
    )
  }

  // If tournament is bracket format or no groups
  if (!groups || groups.length === 0) {
    return (
      <div className="screen-enter">
        <Link to={`${base}/tournaments/${tournamentId}`}>← Tournoi</Link>
        <h1>Phase de poules</h1>
        <p className="bracket-tournament-name">{tournament.name}</p>
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            Aucune phase de groupes disponible
          </div>
          <div style={{ fontSize: 13 }}>
            {['round_robin', 'hybrid'].includes(tournament.format)
              ? 'Les poules apparaissent après le lancement du tournoi.'
              : 'Ce format de compétition ne comporte pas de phase de poules.'}
          </div>
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
  const tdNum: React.CSSProperties = {
    ...tdStyle,
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  }

  return (
    <div className="screen-enter">
      <Link to={`${base}/tournaments/${tournamentId}`}>← Tournoi</Link>
      <h1>Phase de poules</h1>
      <p className="bracket-tournament-name">{tournament.name}</p>

      <div style={{ display: 'grid', gap: 24 }}>
        {groups.map((group) => {
          const members = (groupMembers ?? []).filter((m) => m.group_id === group.id)
          const groupMatches = (matches ?? []).filter((m) => m.group_id === group.id)
          const standings = computeGroupStandings(members, groupMatches)

          return (
            <Card key={group.id} style={{ padding: 0, overflowX: 'auto' }}>
              <div
                style={{
                  padding: '14px 18px',
                  background: 'var(--mute-bg)',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '-0.02em',
                }}
              >
                {group.name}
              </div>

              {standings.length === 0 ? (
                <div
                  style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}
                >
                  Aucun participant dans cette poule
                </div>
              ) : (
                <>
                  <p className="table-hint">
                    Fais glisser le tableau pour voir toutes les colonnes.
                  </p>
                  <table style={{ minWidth: 520, width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr
                        style={{
                          background: 'var(--mute-bg)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <th style={{ ...thStyle, width: 32 }}>#</th>
                        <th style={thStyle}>Participant</th>
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
                        <tr
                          key={row.team_id}
                          style={{ background: i % 2 === 0 ? 'transparent' : 'var(--mute-bg)' }}
                        >
                          <td
                            style={{
                              ...tdStyle,
                              color: 'var(--muted)',
                              fontWeight: 700,
                              width: 32,
                            }}
                          >
                            {i + 1}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{row.team_name}</td>
                          <td style={tdNum}>{row.played}</td>
                          <td style={{ ...tdNum, color: '#22c55e' }}>{row.wins}</td>
                          <td style={tdNum}>{row.draws}</td>
                          <td style={{ ...tdNum, color: 'var(--accent)' }}>{row.losses}</td>
                          <td style={tdNum}>{row.gf}</td>
                          <td style={tdNum}>{row.ga}</td>
                          <td
                            style={{ ...tdNum, fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}
                          >
                            {row.pts}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
