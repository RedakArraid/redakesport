import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { db } from '../../lib/api'
export function OverlayPage() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    mode = params.get('view') || 'scoreboard'
  useEffect(() => {
    document.body.classList.add('overlay')
    return () => document.body.classList.remove('overlay')
  }, [])
  const { data: match } = useQuery({
    queryKey: ['overlay-match', id],
    queryFn: async () => {
      const { data, error } = await db.from('matches').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
    refetchInterval: 5000,
    retry: false,
  })
  const { data: matches = [] } = useQuery({
    queryKey: ['overlay-bracket', match?.tournament_id],
    queryFn: async () => {
      const { data, error } = await db
        .from('matches')
        .select('*')
        .eq('tournament_id', match!.tournament_id)
        .order('round')
        .all()
      if (error) throw error
      return data
    },
    enabled: mode === 'bracket' && !!match?.tournament_id,
    refetchInterval: (query) => ((query.state.data?.length ?? 0) > 1000 ? 30000 : 5000),
  })
  const ids = [
    ...new Set(
      [
        match?.team1_id,
        match?.team2_id,
        ...matches.flatMap((m) => [m.team1_id, m.team2_id]),
      ].filter((id): id is string => !!id),
    ),
  ]
  const { data: names = {} } = useQuery({
    queryKey: ['overlay-names', ids],
    queryFn: async () => {
      const [clubs, players] = await Promise.all([
        db.from('clubs').select('id,name').in('id', ids),
        db.from('profiles').select('id,username').in('id', ids),
      ])
      return Object.fromEntries([
        ...(clubs.data || []).map((c) => [c.id, c.name]),
        ...(players.data || []).map((p) => [p.id, p.username]),
      ])
    },
    enabled: ids.length > 0,
  })
  if (!match) return <div style={{ padding: 24 }}>Match indisponible ou privé</div>
  if (mode === 'winner' && !match.winner_id) return null
  const style = {
    background: '#101014ee',
    color: 'white',
    borderRadius: 16,
    padding: 24,
    fontSize: 28,
    fontWeight: 800,
    margin: 24,
  }
  if (mode === 'bracket')
    return (
      <div style={style}>
        {matches.map((m) => (
          <div key={m.id} style={{ padding: 12, fontSize: 20 }}>
            R{m.round} · BO{m.best_of}
            {m.result_kind === 'forfeit' ? ' · Forfait' : ''} ·{' '}
            {names[m.team1_id || ''] || (m.status === 'completed' ? 'Exempt' : 'À déterminer')}{' '}
            {['completed', 'live'].includes(m.status) && m.team1_id && m.team2_id
              ? m.score_team1
              : '–'}{' '}
            —{' '}
            {['completed', 'live'].includes(m.status) && m.team1_id && m.team2_id
              ? m.score_team2
              : '–'}{' '}
            {names[m.team2_id || ''] || (m.status === 'completed' ? 'Exempt' : 'À déterminer')}
          </div>
        ))}
      </div>
    )
  return (
    <div style={{ ...style, display: 'inline-flex', gap: 36, alignItems: 'center' }}>
      {mode === 'winner' ? (
        <>
          🏆 {names[match.winner_id!] || 'Vainqueur'}
          {match.result_kind === 'forfeit' && ' · par forfait'}
        </>
      ) : (
        <>
          <small style={{ fontSize: 14 }}>
            BO{match.best_of}
            {match.result_kind === 'forfeit' && ' · Forfait'}
          </small>
          <span>
            {names[match.team1_id || ''] ||
              (match.status === 'completed' ? 'Exempt' : 'À déterminer')}
          </span>
          <strong>
            {['completed', 'live'].includes(match.status) && match.team1_id && match.team2_id
              ? match.score_team1
              : '–'}{' '}
            —{' '}
            {['completed', 'live'].includes(match.status) && match.team1_id && match.team2_id
              ? match.score_team2
              : '–'}
          </strong>
          <span>
            {names[match.team2_id || ''] ||
              (match.status === 'completed' ? 'Exempt' : 'À déterminer')}
          </span>
        </>
      )}
    </div>
  )
}
