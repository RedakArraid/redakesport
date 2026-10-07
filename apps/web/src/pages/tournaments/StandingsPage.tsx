import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { db, rowsByIds } from '../../lib/api'
import { Btn, Card, Spinner } from '../../components/ui'

interface StandingRow {
  team_id: string
  name: string
  wins: number
  losses: number
  draws: number
  points: number
  buchholz: number
  sonneborn_berger: number | string
  map_diff: number
}

export function StandingsPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const base = useLocation().pathname.startsWith('/app') ? '/app' : ''

  const tournamentQuery = useQuery({
    queryKey: ['standings-format', tournamentId],
    queryFn: async () => {
      const { data, error } = await db
        .from('tournaments')
        .select('name,format,status')
        .eq('id', tournamentId!)
        .single()
      if (error) throw error
      return data
    },
  })
  const tournament = tournamentQuery.data
  const swiss = tournament?.format === 'swiss'
  const standingsQuery = useQuery({
    queryKey: ['standings', tournamentId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await db
        .from('standings')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .all()
      if (error) throw error
      const ids = data.map((row) => row.team_id)
      const [clubs, profiles] = await Promise.all([
        rowsByIds('clubs', ids, 'id,name'),
        rowsByIds('profiles', ids, 'id,username'),
      ])
      const names = new Map([
        ...clubs.map((c) => [c.id, c.name] as const),
        ...profiles.map((p) => [p.id, p.username] as const),
      ])
      return data
        .map((row) => ({
          ...row,
          name: names.get(row.team_id) ?? row.team_id.slice(0, 8),
          map_diff: row.map_wins - row.map_losses,
        }))
        .sort(
          (a, b) =>
            (a.position ?? Infinity) - (b.position ?? Infinity) ||
            b.points - a.points ||
            b.buchholz - a.buchholz ||
            Number(b.sonneborn_berger) - Number(a.sonneborn_berger) ||
            b.map_diff - a.map_diff ||
            a.team_id.localeCompare(b.team_id),
        )
    },
    enabled: !!tournamentId,
  })
  const standings = standingsQuery.data

  if (tournamentQuery.isLoading || standingsQuery.isLoading)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={32} />
      </div>
    )

  if (tournamentQuery.error || standingsQuery.error || !tournament)
    return (
      <Card>
        <h1>Classement indisponible</h1>
        <p>
          {tournamentQuery.error || !tournament
            ? 'Ce tournoi est privé, n’existe plus ou ne peut pas être chargé.'
            : 'Le classement n’a pas pu être chargé. Réessaie dans quelques instants.'}
        </p>
        <div className="action-row">
          <Btn
            onClick={() => {
              void tournamentQuery.refetch()
              void standingsQuery.refetch()
            }}
          >
            Réessayer
          </Btn>
          <Link to={`${base}/tournaments/${tournamentId}`}>Revenir au tournoi</Link>
        </div>
      </Card>
    )

  return (
    <div className="screen-enter">
      <Link to={`${base}/tournaments/${tournamentId}`}>← Tournoi</Link>
      <h1>{tournament.status === 'completed' ? 'Classement final' : 'Classement'}</h1>
      <p className="bracket-tournament-name">{tournament.name}</p>

      {!standings || standings.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 700 }}>Aucun match joué pour le moment</div>
        </Card>
      ) : (
        <Card className="table-scroll" style={{ padding: 0, overflowX: 'auto' }}>
          {swiss && (
            <p className="table-hint">
              Départage : points, Buchholz (BH), Sonneborn-Berger (SB), différence de scores, puis
              identifiant. Fais défiler pour voir toutes les colonnes.
            </p>
          )}
          <table
            style={{ width: '100%', minWidth: swiss ? 540 : undefined, borderCollapse: 'collapse' }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--mute-bg)' }}>
                {['#', 'Participant', 'V', 'D', 'N', 'Pts', ...(swiss ? ['BH', 'SB'] : [])].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 8px',
                        textAlign: h === 'Participant' ? 'left' : 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        color: 'var(--muted)',
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => (
                <StandingRowCmp
                  key={row.team_id}
                  row={row}
                  rank={row.position ?? idx + 1}
                  swiss={swiss}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function StandingRowCmp({ row, rank, swiss }: { row: StandingRow; rank: number; swiss: boolean }) {
  const isTop = rank <= 2
  return (
    <tr
      style={{
        borderBottom: '1px solid var(--border)',
        background: isTop ? 'rgba(37,71,255,0.02)' : undefined,
      }}
    >
      <td style={{ padding: '12px 8px', textAlign: 'center', width: 40 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 14,
            color: rank === 1 ? '#c9a227' : rank === 2 ? 'var(--muted)' : 'var(--ink)',
          }}
        >
          {rank}
        </span>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
          {row.name}
        </span>
      </td>
      {[row.wins ?? 0, row.losses ?? 0, row.draws ?? 0].map((v, i) => (
        <td
          key={i}
          style={{
            padding: '12px 8px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {v}
        </td>
      ))}
      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 15,
            color: isTop ? 'var(--blue)' : 'var(--ink)',
          }}
        >
          {row.points ?? 0}
        </span>
      </td>
      {swiss && (
        <>
          <td style={{ padding: '12px 8px', textAlign: 'center' }}>{row.buchholz}</td>
          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
            {Number(row.sonneborn_berger).toLocaleString('fr-FR')}
          </td>
        </>
      )}
    </tr>
  )
}
