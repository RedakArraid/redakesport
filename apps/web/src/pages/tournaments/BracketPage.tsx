import { BracketTree } from '../../components/ui/BracketTree'
import { useParticipantNames } from '../../hooks/useParticipants'
import { bracketMatchStatusLabel, formatLabels, tournamentStatusLabels } from '../../lib/labels'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { Spinner, Card, Badge, Btn } from '../../components/ui'
import type { Match } from '../../types/database'

export function BracketPage() {
  const { id } = useParams(),
    base = useLocation().pathname.startsWith('/app') ? '/app' : ''
  const tournamentQuery = useQuery({
    queryKey: ['bracket-tournament', id],
    queryFn: async () => {
      const { data, error } = await db
        .from('tournaments')
        .select('name,status,format,best_of,game:games(name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    refetchInterval: 5000,
  })
  const tournament = tournamentQuery.data
  const matchesQuery = useQuery({
    queryKey: ['bracket', id],
    queryFn: async () => {
      const { data, error } = await db
        .from('matches')
        .select('*, group:groups(name)')
        .eq('tournament_id', id!)
        .order('round')
        .order('match_number')
        .all()
      if (error) throw error
      return data
    },
    refetchInterval: (query) => ((query.state.data?.length ?? 0) > 1000 ? 30000 : 5000),
  })
  const matches = matchesQuery.data ?? []
  const namesQuery = useParticipantNames(matches.flatMap((m) => [m.team1_id, m.team2_id]))
  const names = namesQuery.data ?? {}
  if (tournamentQuery.isLoading || matchesQuery.isLoading) return <Spinner />
  if (tournamentQuery.error || matchesQuery.error || !tournament)
    return (
      <Card>
        <h1>Tableau indisponible</h1>
        <p>
          {tournamentQuery.error || !tournament
            ? 'Ce tournoi est privé, n’existe plus ou ne peut pas être chargé.'
            : 'Les rencontres n’ont pas pu être chargées. Réessaie dans quelques instants.'}
        </p>
        <div className="action-row">
          <Btn
            onClick={() => {
              void tournamentQuery.refetch()
              void matchesQuery.refetch()
            }}
          >
            Réessayer
          </Btn>
          <Link to={`${base}/tournaments`}>Voir les tournois</Link>
        </div>
      </Card>
    )
  const cancelled = tournament.status === 'cancelled'
  const tree = matches.filter(
    (m) =>
      ['winners', 'losers', 'grand_final', 'reset'].includes(
        m.bracket_position?.side ?? 'winners',
      ) && !(m.bracket_position?.side === 'reset' && m.status === 'completed' && !m.team1_id),
  )
  const roundMatches = matches.filter((m) =>
    ['group', 'swiss'].includes(m.bracket_position?.side ?? ''),
  )
  const sections = [...new Set(roundMatches.map((m) => m.group_id ?? 'swiss'))]
    .map((key) => {
      const list = roundMatches.filter((m) => (m.group_id ?? 'swiss') === key)
      return {
        key,
        name: list[0]?.group?.name ?? (key === 'swiss' ? 'Rondes suisses' : 'Poule'),
        list,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const fromGroups = roundMatches.some((m) => m.bracket_position?.side === 'group')
  return (
    <div className="screen-enter">
      <Link to={`${base}/tournaments/${id}`}>← Tournoi</Link>
      <h1>Tableau des rencontres</h1>
      <p className="bracket-tournament-name">{tournament.name}</p>
      <div className="action-row" style={{ marginBottom: 20 }}>
        <Badge label={tournamentStatusLabels[tournament.status]} />
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {tournament.game?.name ? `${tournament.game.name} · ` : ''}
          {formatLabels[tournament.format]} · BO{tournament.best_of}
        </span>
      </div>
      {namesQuery.error && <p role="alert">Les noms des participants n’ont pas pu être chargés.</p>}
      {cancelled && (
        <Card style={{ marginBottom: 16 }}>
          Tournoi annulé : les résultats sont figés et les rencontres restantes ne seront pas
          jouées.
        </Card>
      )}
      {tournament.status === 'completed' && (
        <p>
          Tournoi terminé.{' '}
          <Link to={`${base}/tournaments/${id}/standings`}>Voir le classement final →</Link>
        </p>
      )}
      {tree.length > 0 && (
        <>
          {fromGroups && <h2>Phase finale</h2>}
          <BracketTree
            matches={tree}
            names={names}
            base={base}
            fromGroups={fromGroups}
            cancelled={cancelled}
          />
        </>
      )}
      {!matches.length && (
        <Card>
          {cancelled
            ? 'Ce tournoi a été annulé avant la création des rencontres.'
            : tournament.status === 'draft'
              ? 'Tournoi en préparation. Les rencontres seront générées après l’ouverture et la validation des inscriptions.'
              : tournament.status === 'registration'
                ? 'Les inscriptions sont ouvertes. Le tableau apparaîtra après la validation des participants et le lancement du tournoi.'
                : 'Aucune rencontre disponible pour ce tournoi.'}
        </Card>
      )}
      {fromGroups && tree.length > 0 && <h2>Phase de poules</h2>}
      {sections.map(({ key, name, list }) => {
        const rounds = [...new Set(list.map((m) => m.round || 1))].sort((a, b) => a - b)
        return (
          <section key={key} aria-label={name} style={{ marginBottom: 28 }}>
            {fromGroups && tree.length > 0 ? <h3>{name}</h3> : <h2>{name}</h2>}
            {rounds.length > 1 && (
              <p className="table-hint">
                Fais défiler horizontalement pour consulter toutes les rondes.
              </p>
            )}
            <div
              className="rounds-viewport"
              role="region"
              aria-label={`Rencontres — ${name}`}
              tabIndex={0}
            >
              <div className="rounds-columns">
                {rounds.map((round) => (
                  <div key={round} className="round-column">
                    <h3>Ronde {round}</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {list
                        .filter((m) => (m.round || 1) === round)
                        .map((m) => (
                          <Link
                            key={m.id}
                            data-round-match={m.id}
                            data-group-id={m.group_id ?? undefined}
                            to={`${base}/matches/${m.id}`}
                          >
                            <Card
                              className="round-match-card"
                              style={{
                                padding: 14,
                                borderColor: m.status === 'completed' ? '#86b99e' : 'var(--border)',
                              }}
                            >
                              <div className="bracket-match-heading">
                                <span>
                                  Match {m.match_number} · BO{m.best_of}
                                </span>
                                <span>{bracketMatchStatusLabel(m, cancelled)}</span>
                              </div>
                              {[m.team1_id, m.team2_id].map((team, index) => (
                                <div
                                  key={index}
                                  className={`bracket-team ${team && m.winner_id === team ? 'is-winner' : ''}`}
                                >
                                  <span title={team ? names[team] : undefined}>
                                    {team
                                      ? names[team] || 'Participant'
                                      : m.status === 'completed'
                                        ? 'Exempt'
                                        : 'À déterminer'}
                                  </span>
                                  <strong>
                                    {(!cancelled || m.status === 'completed') &&
                                    ['completed', 'live'].includes(m.status) &&
                                    m.team1_id &&
                                    m.team2_id
                                      ? index === 0
                                        ? m.score_team1
                                        : m.score_team2
                                      : '–'}
                                  </strong>
                                </div>
                              ))}
                              <div
                                className="bracket-match-footer"
                                title={m.forfeit_reason ?? undefined}
                              >
                                {roundMatchFooter(m, cancelled)}
                              </div>
                            </Card>
                          </Link>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function roundMatchFooter(match: Match, cancelled: boolean) {
  if (cancelled && match.status !== 'completed') return 'Tournoi annulé'
  if (match.result_kind === 'forfeit') return `Forfait : ${match.forfeit_reason}`
  if (match.status === 'completed' && (!match.team1_id || !match.team2_id))
    return match.winner_id
      ? match.bracket_position?.side === 'swiss'
        ? 'Exemption de cette ronde'
        : 'Qualification automatique'
      : 'Rencontre non jouée'
  if (match.scheduled_at)
    return new Date(match.scheduled_at).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  return match.status === 'completed' ? 'Résultat confirmé' : 'Horaire à définir'
}
