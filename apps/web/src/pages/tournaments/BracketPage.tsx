import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Spinner, Badge } from '../../components/ui'
import type { Match } from '../../types/database'
import { useRealtimeChannel } from '../../hooks/useRealtime'
import { useQueryClient } from '@tanstack/react-query'

export function BracketPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: matches, isLoading } = useQuery({
    queryKey: ['bracket', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true })
      if (error) throw error
      return data as Match[]
    },
    enabled: !!tournamentId,
  })

  // Realtime: bracket updates live
  useRealtimeChannel(
    `bracket:${tournamentId}`,
    {
      table: 'matches',
      filter: `tournament_id=eq.${tournamentId}`,
      onUpdate: () => qc.invalidateQueries({ queryKey: ['bracket', tournamentId] }),
    },
    [tournamentId],
  )

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>

  if (!matches || matches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Bracket pas encore généré</div>
        <div style={{ fontSize: 14 }}>L'organisateur générera le bracket après la clôture des inscriptions.</div>
      </div>
    )
  }

  // Group matches by round
  const rounds = groupByRound(matches)
  const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const totalRounds = roundNums.length

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Bracket</div>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', alignItems: 'center' }}>
          <Dot color="var(--blue)" /> En cours
          <Dot color="#1a7a4a" /> Terminé
          <Dot color="var(--border)" /> À venir
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{
          display: 'flex', gap: 0, alignItems: 'stretch',
          minWidth: roundNums.length * 240,
        }}>
          {roundNums.map((round, roundIdx) => {
            const roundMatches = rounds[round]
            const label = round === totalRounds ? 'Finale' : round === totalRounds - 1 ? 'Demi-finale' : `Round ${round}`

            return (
              <div key={round} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Round header */}
                <div style={{
                  textAlign: 'center', padding: '8px 12px',
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                  letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)',
                  borderBottom: '1px solid var(--border)', marginBottom: 8,
                }}>
                  {label}
                </div>

                {/* Matches column */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-around',
                  padding: '8px 8px',
                  gap: 8,
                }}>
                  {roundMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === 'live'
  const isDone = match.status === 'completed'
  const isPending = match.status === 'pending'

  const borderColor = isLive ? 'var(--blue)' : isDone ? '#1a7a4a' : 'var(--border)'
  const bgColor = isLive ? 'rgba(37,71,255,0.04)' : 'var(--card)'

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`,
      borderRadius: 10, background: bgColor,
      overflow: 'hidden', minWidth: 200,
      position: 'relative',
    }}>
      {isLive && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: 'var(--blue)', color: '#fff',
          fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
          fontFamily: 'var(--font-mono)', letterSpacing: 0.5,
          animation: 'pulse 1.5s infinite',
        }}>LIVE</div>
      )}
      <TeamRow
        teamId={match.team1_id}
        score={match.score_team1}
        isWinner={match.winner_id === match.team1_id}
        isDone={isDone}
        borderBottom
      />
      <TeamRow
        teamId={match.team2_id}
        score={match.score_team2}
        isWinner={match.winner_id === match.team2_id}
        isDone={isDone}
      />
      {match.best_of > 1 && (
        <div style={{
          fontSize: 9, color: 'var(--muted)', textAlign: 'center',
          padding: '2px 0 4px', fontFamily: 'var(--font-mono)',
        }}>
          BO{match.best_of}
        </div>
      )}
    </div>
  )
}

function TeamRow({ teamId, score, isWinner, isDone, borderBottom }: {
  teamId: string | null
  score: number
  isWinner: boolean
  isDone: boolean
  borderBottom?: boolean
}) {
  const { data: name } = useQuery({
    queryKey: ['team-name', teamId],
    queryFn: async () => {
      if (!teamId) return null
      const { data } = await supabase.from('clubs').select('name').eq('id', teamId).maybeSingle()
      if (data) return data.name
      const { data: p } = await supabase.from('profiles').select('username').eq('id', teamId).maybeSingle()
      return p?.username ?? teamId.slice(0, 8)
    },
    enabled: !!teamId,
    staleTime: Infinity,
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px',
      borderBottom: borderBottom ? '1px solid var(--border)' : undefined,
      background: isWinner && isDone ? 'rgba(26,122,74,0.06)' : undefined,
    }}>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: isWinner ? 800 : 600,
        fontSize: 12, color: teamId ? 'var(--ink)' : 'var(--muted)',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: 120,
      }}>
        {teamId ? (name ?? '...') : 'TBD'}
      </span>
      {isDone && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13,
          color: isWinner ? '#1a7a4a' : 'var(--muted)', marginLeft: 8,
        }}>
          {score}
        </span>
      )}
      {isWinner && isDone && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
}

function groupByRound(matches: Match[]): Record<number, Match[]> {
  const groups: Record<number, Match[]> = {}
  for (const m of matches) {
    const r = m.round ?? 1
    if (!groups[r]) groups[r] = []
    groups[r].push(m)
  }
  return groups
}
