import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c statement_timeout=10000',
})
after(() => pool.end())
function exhaustiveSize(graph, remaining = graph.map((_, i) => i)) {
  if (!remaining.length) return 0
  const [first, ...others] = remaining
  let best = exhaustiveSize(graph, others)
  for (const next of others)
    if (graph[first].includes(next + 1))
      best = Math.max(
        best,
        1 +
          exhaustiveSize(
            graph,
            others.filter((i) => i !== next),
          ),
      )
  return best
}
test('global matching agrees with exhaustive search, including odd cycles and greedy dead ends', async () => {
  let seed = 321984
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32
  for (let trial = 0; trial < 150; trial++) {
    const n = 2 + (trial % 9),
      graph = Array.from({ length: n }, () => [])
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (random() < 0.2 + (trial % 5) * 0.15) {
          graph[i].push(j + 1)
          graph[j].push(i + 1)
        }
    const mate = (
      await pool.query('SELECT private.maximum_matching($1) result', [JSON.stringify(graph)])
    ).rows[0].result
    assert.equal(mate.filter(Boolean).length / 2, exhaustiveSize(graph), JSON.stringify(graph))
    for (let i = 0; i < n; i++)
      if (mate[i]) {
        assert.equal(mate[mate[i] - 1], i + 1)
        assert.ok(graph[i].includes(mate[i]))
      }
  }
})
for (const n of [63, 256])
  test(`Swiss ${n}: every round pairs all entrants once without rematches or repeated byes`, async () => {
    const owner = crypto.randomUUID(),
      id = crypto.randomUUID(),
      entrants = Array.from({ length: n }, () => crypto.randomUUID())
    await pool.query(
      "INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) SELECT x,x::text||'@example.test','fixture',jsonb_build_object('username','swiss_'||left(x::text,12)) FROM unnest($1::uuid[]) x",
      [[owner, ...entrants]],
    )
    await pool.query(
      "INSERT INTO tournaments(id,name,slug,organizer_id,format,team_size,max_teams,status) VALUES($1::uuid,'Swiss stress',$1::text,$2,'swiss',1,$3,'registration')",
      [id, owner, n],
    )
    await pool.query(
      "INSERT INTO tournament_registrations(tournament_id,player_id,status) SELECT $1,x,'approved' FROM unnest($2::uuid[]) x",
      [id, entrants],
    )
    const { buildBracket } = await import('../apps/api/src/brackets.ts')
    await pool.query('SELECT public.install_bracket($1,$2,$3)', [
      owner,
      id,
      buildBracket(
        entrants.map((id) => ({ id, type: 'player' })),
        id,
        'swiss',
      ),
    ])
    const pairs = new Set(),
      byes = new Set(),
      rounds = Math.ceil(Math.log2(n))
    for (let r = 1; r <= rounds; r++) {
      const matches = (
        await pool.query('SELECT * FROM matches WHERE tournament_id=$1 AND round=$2', [id, r])
      ).rows
      const seen = new Set()
      for (const m of matches) {
        for (const team of [m.team1_id, m.team2_id].filter(Boolean)) {
          assert.ok(!seen.has(team))
          seen.add(team)
        }
        if (!m.team2_id) {
          assert.ok(!byes.has(m.team1_id))
          byes.add(m.team1_id)
        } else {
          const pair = [m.team1_id, m.team2_id].sort().join('/')
          assert.ok(!pairs.has(pair))
          pairs.add(pair)
        }
      }
      assert.equal(seen.size, n)
      // Bulk fixtures isolate round generation from score confirmation, covered by API tests.
      await pool.query(
        "UPDATE matches SET score_team1=CASE WHEN match_number%3=0 THEN 0 ELSE 2 END,score_team2=CASE WHEN match_number%3=0 THEN 2 ELSE 0 END,winner_id=CASE WHEN match_number%3=0 THEN team2_id ELSE team1_id END,loser_id=CASE WHEN match_number%3=0 THEN team1_id ELSE team2_id END,status='completed',completed_at=now() WHERE tournament_id=$1 AND round=$2 AND team2_id IS NOT NULL",
        [id, r],
      )
      await pool.query('SELECT private.progress_tournament($1)', [id])
    }
    assert.equal(
      (await pool.query('SELECT status FROM tournaments WHERE id=$1', [id])).rows[0].status,
      'completed',
    )
    const numbers = (
      await pool.query('SELECT match_number FROM matches WHERE tournament_id=$1', [id])
    ).rows.map((r) => r.match_number)
    assert.equal(new Set(numbers).size, numbers.length)
  })
