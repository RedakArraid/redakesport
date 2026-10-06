import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Match } from '../../types/database'
import { bracketLayout, CARD_HEIGHT, CARD_WIDTH } from '../../lib/bracketLayout'
import { bracketMatchStatusLabel } from '../../lib/labels'
import { Btn } from './index'

export function BracketTree({
  matches,
  names,
  base,
  fromGroups = false,
  cancelled = false,
}: {
  matches: Match[]
  names: Record<string, string>
  base: string
  fromGroups?: boolean
  cancelled?: boolean
}) {
  const double = matches.some((m) => m.bracket_position?.side === 'grand_final')
  const [mode, setMode] = useState<'classic' | 'mirror'>('mirror')
  const [scale, setScale] = useState(1)
  const viewport = useRef<HTMLDivElement>(null)
  const graph = bracketLayout(matches, double ? 'classic' : mode)
  const byId = new Map(matches.map((m) => [m.id, m]))
  function centerFinal() {
    const node = graph.nodes.find((n) => n.match.id === graph.finalId)
    if (!node || !viewport.current) return
    viewport.current.scrollTo({
      left: (node.x + CARD_WIDTH / 2) * scale - viewport.current.clientWidth / 2,
      top: (node.y + CARD_HEIGHT / 2) * scale - viewport.current.clientHeight / 2,
      behavior: 'smooth',
    })
  }
  function showSide(side: string) {
    const node = graph.nodes.find((n) => n.match.bracket_position?.side === side)
    if (!node || !viewport.current) return
    viewport.current.scrollTo({
      left: Math.max(0, (node.x - 40) * scale),
      top: Math.max(0, (node.y - 64) * scale),
      behavior: 'smooth',
    })
  }
  return (
    <section aria-label="Arbre de progression">
      <div className="action-row" style={{ marginBottom: 12 }}>
        {!double && (
          <>
            {(['mirror', 'classic'] as const).map((value) => (
              <button
                key={value}
                className={`topnav-item ${mode === value ? 'active' : ''}`}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {value === 'mirror' ? 'Arbre symétrique' : 'Arbre classique'}
              </button>
            ))}
          </>
        )}
        {double && (
          <>
            <Btn variant="secondary" size="sm" onClick={() => showSide('winners')}>
              Tableau principal
            </Btn>
            {matches.some((m) => m.bracket_position?.side === 'losers') && (
              <Btn variant="secondary" size="sm" onClick={() => showSide('losers')}>
                Voir les repêchages
              </Btn>
            )}
          </>
        )}
        <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          Zoom
          <select
            aria-label="Zoom du tableau"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            style={{ width: 'auto', margin: 0 }}
          >
            {[0.5, 0.75, 1, 1.25].map((value) => (
              <option key={value} value={value}>
                {value * 100} %
              </option>
            ))}
          </select>
        </label>
        <Btn variant="secondary" size="sm" onClick={centerFinal}>
          Centrer la finale
        </Btn>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>
        Les branches relient chaque match à la rencontre suivante.{' '}
        {double && 'Les pointillés indiquent le passage du perdant en repêchage. '}Fais défiler le
        tableau pour explorer les rondes.
      </p>
      <div
        ref={viewport}
        role="region"
        aria-label="Tableau des rencontres"
        tabIndex={0}
        className="bracket-viewport"
      >
        <div
          style={{ width: graph.width * scale, height: graph.height * scale, position: 'relative' }}
        >
          <div
            style={{
              width: graph.width,
              height: graph.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
            }}
          >
            <svg
              aria-label="Connexions entre les rencontres"
              width={graph.width}
              height={graph.height}
              style={{ position: 'absolute', inset: 0 }}
            >
              {graph.edges.map((edge) => (
                <path
                  key={`${edge.from}-${edge.to}-${edge.kind}`}
                  data-bracket-edge={edge.kind}
                  data-from={edge.from}
                  data-to={edge.to}
                  data-slot={edge.slot}
                  d={edge.path}
                  fill="none"
                  stroke={edge.confirmed ? '#337a59' : '#a4a097'}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeDasharray={edge.kind === 'loser' ? '5 5' : undefined}
                >
                  <title>
                    {edge.kind === 'loser'
                      ? 'Perdant'
                      : edge.kind === 'reset'
                        ? 'Finale décisive si nécessaire'
                        : 'Vainqueur'}{' '}
                    du match {byId.get(edge.from)?.match_number} vers le match{' '}
                    {byId.get(edge.to)?.match_number}
                  </title>
                </path>
              ))}
            </svg>
            {graph.headings.map((heading, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: heading.x,
                  top: heading.y,
                  width: CARD_WIDTH,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}
              >
                {heading.text}
              </div>
            ))}
            {graph.nodes.map(({ match: m, x, y }) => (
              <Link
                key={m.id}
                data-bracket-match={m.id}
                to={`${base}/matches/${m.id}`}
                className={`bracket-match ${m.id === graph.finalId ? 'is-final' : ''}`}
                style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
              >
                <div className="bracket-match-heading">
                  <span>
                    Match {m.match_number} · BO{m.best_of}
                  </span>
                  <span>{bracketMatchStatusLabel(m, cancelled)}</span>
                </div>
                {[1, 2].map((slot) => {
                  const team = slot === 1 ? m.team1_id : m.team2_id,
                    score = slot === 1 ? m.score_team1 : m.score_team2
                  const incoming = graph.edges.find((e) => e.to === m.id && e.slot === slot)
                  const source = incoming ? byId.get(incoming.from) : null
                  const name = team
                    ? names[team] || 'Participant'
                    : m.status === 'completed'
                      ? 'Exempt'
                      : m.bracket_position?.side === 'reset'
                        ? slot === 1
                          ? 'Finaliste du tableau principal'
                          : 'Finaliste du repêchage'
                        : source
                          ? source.status === 'completed' &&
                            !(incoming?.kind === 'loser' ? source.loser_id : source.winner_id)
                            ? 'Exempt'
                            : `${incoming?.kind === 'loser' ? 'Perdant' : 'Vainqueur'} match ${source.match_number}`
                          : fromGroups && m.round === 1
                            ? `${slot === 1 ? '1er' : '2e'} du groupe ${(m.bracket_position?.position === 0) === (slot === 1) ? 'A' : 'B'}`
                            : 'À déterminer'
                  return (
                    <div
                      key={slot}
                      className={`bracket-team ${team && m.winner_id === team ? 'is-winner' : ''}`}
                    >
                      <span title={name}>{name}</span>
                      <strong>
                        {(cancelled && m.status !== 'completed') ||
                        (m.status === 'completed' && (!m.team1_id || !m.team2_id))
                          ? '–'
                          : ['completed', 'live'].includes(m.status)
                            ? score
                            : '–'}
                      </strong>
                    </div>
                  )
                })}
                <div className="bracket-match-footer" title={m.forfeit_reason ?? undefined}>
                  {cancelled && m.status !== 'completed'
                    ? 'Tournoi annulé'
                    : m.result_kind === 'forfeit'
                      ? `Forfait : ${m.forfeit_reason}`
                      : m.bracket_position?.side === 'reset' && !m.team1_id
                        ? 'Si le repêché gagne la grande finale'
                        : m.scheduled_at
                          ? new Date(m.scheduled_at).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : m.status === 'completed'
                            ? m.team1_id && m.team2_id
                              ? 'Résultat confirmé'
                              : m.winner_id
                                ? 'Qualification automatique'
                                : 'Rencontre non jouée'
                            : 'Horaire à définir'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
