import type { Match } from '../types/database'

export const CARD_WIDTH = 236
export const CARD_HEIGHT = 144
const GAP = 72,
  ROW = 180,
  MARGIN = 40,
  TOP = 48
type Mode = 'classic' | 'mirror'
export interface BracketNode {
  match: Match
  x: number
  y: number
}
export interface BracketEdge {
  from: string
  to: string
  slot: number
  kind: 'winner' | 'loser' | 'reset'
  path: string
  confirmed: boolean
}

export function bracketLayout(matches: Match[], mode: Mode = 'classic') {
  const nodes: BracketNode[] = []
  const headings: { x: number; y: number; text: string }[] = []
  const side = (m: Match) => m.bracket_position?.side ?? 'winners'
  const sort = (a: Match, b: Match) =>
    (a.bracket_position?.position ?? a.match_number ?? 0) -
    (b.bracket_position?.position ?? b.match_number ?? 0)
  const winners = matches.filter((m) => side(m) === 'winners')
  const lower = matches.filter((m) => side(m) === 'losers')
  const maxRound = Math.max(1, ...winners.map((m) => m.round ?? 1))
  const final = winners.find((m) => !winners.some((target) => target.id === m.next_match_id))
  const double = matches.some((m) => side(m) === 'grand_final')
  let width: number, height: number
  const add = (m: Match, col: number, center: number) =>
    nodes.push({
      match: m,
      x: MARGIN + col * (CARD_WIDTH + GAP),
      y: TOP + center - CARD_HEIGHT / 2,
    })
  const heading = (col: number, text: string, y = 12) =>
    headings.push({ x: MARGIN + col * (CARD_WIDTH + GAP), y, text })

  if (mode === 'mirror' && !double && final && winners.length > 1) {
    const halves = [new Set<string>(), new Set<string>()]
    const visit = (id: string, half: Set<string>) => {
      if (half.has(id)) return
      half.add(id)
      for (const m of winners) if (m.next_match_id === id) visit(m.id, half)
    }
    for (const m of winners)
      if (m.next_match_id === final.id) visit(m.id, halves[(m.next_match_slot ?? 1) - 1])
    const rows = Math.max(
      1,
      ...halves.map((half) => winners.filter((m) => half.has(m.id) && m.round === 1).length),
    )
    const extent = rows * ROW
    for (let round = 1; round < maxRound; round++)
      for (let h = 0; h < 2; h++) {
        const list = winners.filter((m) => halves[h].has(m.id) && m.round === round).sort(sort)
        const col = h === 0 ? round - 1 : 2 * maxRound - round - 1
        heading(col, round === maxRound - 1 ? 'Demi-finale' : `Ronde ${round}`)
        list.forEach((m, i) => add(m, col, (extent * (i + 0.5)) / list.length))
      }
    heading(maxRound - 1, 'Finale')
    add(final, maxRound - 1, extent / 2)
    width = MARGIN * 2 + (2 * maxRound - 2) * (CARD_WIDTH + GAP) + CARD_WIDTH
    height = TOP + extent
  } else {
    const upperHeight = Math.max(1, winners.filter((m) => m.round === 1).length) * ROW
    const lowerHeight =
      Math.max(
        1,
        ...Array.from(new Set(lower.map((m) => m.round))).map(
          (r) => lower.filter((m) => m.round === r).length,
        ),
      ) * ROW
    for (let r = 1; r <= maxRound; r++) {
      const list = winners.filter((m) => m.round === r).sort(sort),
        col = double ? (r - 1) * 2 : r - 1
      heading(col, double ? `Principal · ronde ${r}` : r === maxRound ? 'Finale' : `Ronde ${r}`)
      list.forEach((m, i) => add(m, col, (upperHeight * (i + 0.5)) / list.length))
    }
    for (const r of [...new Set(lower.map((m) => m.round ?? 1))].sort((a, b) => a - b)) {
      const list = lower.filter((m) => m.round === r).sort(sort)
      heading(r - 1, `Repêchage · ronde ${r}`, TOP + upperHeight + 30)
      list.forEach((m, i) =>
        add(m, r - 1, upperHeight + 80 + (lowerHeight * (i + 0.5)) / list.length),
      )
    }
    height = TOP + upperHeight + (lower.length ? 80 + lowerHeight : 0)
    for (const m of matches.filter((m) => side(m) === 'grand_final' || side(m) === 'reset')) {
      const col = maxRound * 2 - 1 + (side(m) === 'reset' ? 1 : 0)
      heading(col, side(m) === 'reset' ? 'Finale décisive' : 'Grande finale')
      add(m, col, (height - TOP) / 2)
    }
    width = Math.max(CARD_WIDTH, ...nodes.map((n) => n.x + CARD_WIDTH)) + MARGIN
  }

  const byId = new Map(nodes.map((n) => [n.match.id, n]))
  const edges: BracketEdge[] = []
  function connect(
    source: BracketNode,
    targetId: string | null,
    slot: number | null,
    kind: BracketEdge['kind'],
  ) {
    const target = targetId ? byId.get(targetId) : null
    if (!target || !slot) return
    const right = target.x > source.x
    const sameColumn = target.x === source.x
    const startX = source.x + (right ? CARD_WIDTH : 0)
    const endX = target.x + (!right && !sameColumn ? CARD_WIDTH : 0)
    const startY = source.y + CARD_HEIGHT / 2
    const endY = target.y + (slot === 1 ? 61 : 97)
    const mid = sameColumn ? source.x - 24 : (startX + endX) / 2
    const path = `M ${startX} ${startY} H ${mid} V ${endY} H ${endX}`
    edges.push({
      from: source.match.id,
      to: target.match.id,
      slot,
      kind,
      path,
      confirmed:
        source.match.status === 'completed' &&
        !!(kind === 'loser' ? source.match.loser_id : source.match.winner_id),
    })
  }
  for (const node of nodes) {
    connect(node, node.match.next_match_id, node.match.next_match_slot, 'winner')
    connect(node, node.match.loser_match_id, node.match.loser_match_slot, 'loser')
    if (side(node.match) === 'grand_final') {
      const reset = nodes.find((n) => side(n.match) === 'reset')
      if (reset) connect(node, reset.match.id, 1, 'reset')
    }
  }
  return {
    nodes,
    edges,
    headings,
    width,
    height,
    finalId: double
      ? (
          nodes.find((n) => side(n.match) === 'reset' && n.match.team1_id) ??
          nodes.find((n) => side(n.match) === 'grand_final')
        )?.match.id
      : final?.id,
  }
}
