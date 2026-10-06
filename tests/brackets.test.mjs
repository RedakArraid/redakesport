import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBracket } from '../apps/api/src/brackets.ts'
import { bracketLayout, CARD_WIDTH, CARD_HEIGHT } from '../apps/web/src/lib/bracketLayout.ts'
import { generateICS } from '../apps/web/src/lib/calendar.ts'
for (const format of [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'hybrid',
  'swiss',
]) {
  for (const n of [2, 3, 4, 5, 8, 16, 31, 64, 256]) {
    if (format === 'hybrid' && n < 4) continue
    test(`${format}: graph for ${n} entrants`, () => {
      const teams = Array.from({ length: n }, (_, i) => ({
        id: crypto.randomUUID(),
        type: 'player',
      }))
      const plan = buildBracket(teams, crypto.randomUUID(), format),
        byId = new Map(plan.matches.map((m) => [m.id, m]))
      const seen = new Set(plan.matches.flatMap((m) => [m.team1_id, m.team2_id]).filter(Boolean))
      assert.equal(seen.size, n)
      const incoming = new Map()
      for (const m of plan.matches) {
        assert.equal(m.team1_type, 'player')
        for (const [to, slot] of [
          [m.next_match_id, m.next_match_slot],
          [m.loser_match_id, m.loser_match_slot],
        ])
          if (to) {
            assert.ok(byId.has(to))
            assert.ok(slot === 1 || slot === 2)
            const key = `${to}/${slot}`
            assert.ok(!incoming.has(key), 'Two results feed the same slot')
            incoming.set(key, m.id)
          }
      }
      if (format === 'round_robin') {
        assert.equal(plan.matches.length, (n * (n - 1)) / 2)
        for (const round of new Set(plan.matches.map((m) => m.round))) {
          const players = plan.matches
            .filter((m) => m.round === round)
            .flatMap((m) => [m.team1_id, m.team2_id])
          assert.equal(new Set(players).size, players.length)
        }
      }
    })
  }
}
test('calendar escapes text, preserves UTC and folds UTF-8 lines', () => {
  const ics = generateICS(
    [
      {
        id: 'a',
        scheduled_at: '2026-10-06T18:00:00+02:00',
        team1_name: 'Équipe,;\n' + 'é'.repeat(70),
        team2_name: 'B',
      },
    ],
    new Date('2026-10-01T00:00:00Z'),
  )
  assert.match(ics, /DTSTART:20261006T160000Z/)
  assert.match(ics, /DTSTAMP:20261001T000000Z/)
  assert.ok(ics.includes('Équipe\\,\\;\\n'))
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
})

for (const format of ['single_elimination', 'double_elimination', 'hybrid']) {
  for (const n of [2, 3, 5, 8, 16, 31, 64, 256]) {
    if (format === 'hybrid' && n < 4) continue
    for (const mode of ['classic', 'mirror'])
      test(`${format} ${n}: ${mode} tree has every match and connection without overlapping cards`, () => {
        const plan = buildBracket(
          Array.from({ length: n }, () => ({ id: crypto.randomUUID(), type: 'player' })),
          crypto.randomUUID(),
          format,
        )
        const matches = plan.matches.filter((m) => m.bracket_position.side !== 'group')
        const graph = bracketLayout(matches, mode)
        assert.equal(graph.nodes.length, matches.length)
        assert.equal(
          graph.edges.length,
          matches.reduce(
            (sum, m) => sum + Number(!!m.next_match_id) + Number(!!m.loser_match_id),
            0,
          ) + Number(format === 'double_elimination'),
        )
        for (const node of graph.nodes) {
          assert.ok(
            node.x >= 0 &&
              node.y >= 0 &&
              node.x + CARD_WIDTH <= graph.width &&
              node.y + CARD_HEIGHT <= graph.height,
          )
          for (const other of graph.nodes)
            if (node !== other)
              assert.ok(
                node.x + CARD_WIDTH <= other.x ||
                  other.x + CARD_WIDTH <= node.x ||
                  node.y + CARD_HEIGHT <= other.y ||
                  other.y + CARD_HEIGHT <= node.y,
                `Cards ${node.match.match_number} and ${other.match.match_number} overlap`,
              )
        }
        for (const edge of graph.edges) {
          assert.ok(!edge.path.includes('NaN'))
          const [startX, startY, middleX, endY, endX] = edge.path
            .match(/-?\d+(?:\.\d+)?/g)
            .map(Number)
          const segments = [
            [startX, startY, middleX, startY],
            [middleX, startY, middleX, endY],
            [middleX, endY, endX, endY],
          ]
          for (const card of graph.nodes) {
            if ([edge.from, edge.to].includes(card.match.id)) continue
            const crosses = segments.some(([x1, y1, x2, y2]) =>
              x1 === x2
                ? x1 > card.x &&
                  x1 < card.x + CARD_WIDTH &&
                  Math.max(y1, y2) > card.y &&
                  Math.min(y1, y2) < card.y + CARD_HEIGHT
                : y1 > card.y &&
                  y1 < card.y + CARD_HEIGHT &&
                  Math.max(x1, x2) > card.x &&
                  Math.min(x1, x2) < card.x + CARD_WIDTH,
            )
            assert.equal(
              crosses,
              false,
              `A ${edge.kind} branch crosses unrelated match ${card.match.match_number}`,
            )
          }
          const from = matches.find((m) => m.id === edge.from),
            to = matches.find((m) => m.id === edge.to)
          assert.ok(from && to)
          if (edge.kind === 'winner') {
            assert.equal(from.next_match_id, to.id)
            assert.equal(from.next_match_slot, edge.slot)
          }
          if (edge.kind === 'loser') {
            assert.equal(from.loser_match_id, to.id)
            assert.equal(from.loser_match_slot, edge.slot)
          }
        }
        if (mode === 'mirror' && format !== 'double_elimination' && matches.length > 1) {
          const final = graph.nodes.find((n) => n.match.id === graph.finalId)
          const feeders = graph.nodes.filter((n) => n.match.next_match_id === graph.finalId)
          assert.equal(feeders.length, 2)
          assert.ok(feeders.some((n) => n.x < final.x) && feeders.some((n) => n.x > final.x))
        }
      })
  }
}

test('the active reset becomes the final highlighted by the tree', () => {
  const teams = Array.from({ length: 4 }, () => ({ id: crypto.randomUUID(), type: 'player' }))
  const plan = buildBracket(teams, crypto.randomUUID(), 'double_elimination')
  const grand = plan.matches.find((m) => m.bracket_position.side === 'grand_final')
  const reset = plan.matches.find((m) => m.bracket_position.side === 'reset')
  assert.equal(bracketLayout(plan.matches).finalId, grand.id)
  reset.team1_id = teams[0].id
  reset.team2_id = teams[1].id
  assert.equal(bracketLayout(plan.matches).finalId, reset.id)
})
