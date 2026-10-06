import test from 'node:test'
import assert from 'node:assert/strict'
import { db, rowsByIds } from '../apps/web/src/lib/api.ts'

test('paginated client retains every match and a stable tie-break order', async (t) => {
  const rows = Array.from({ length: 2015 }, (_, id) => ({ id, round: 1 }))
  const calls = []
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const spec = JSON.parse(options.body)
    calls.push(spec)
    return Response.json({ data: rows.slice(spec.offset, spec.offset + spec.limit), error: null })
  })
  const result = await db.from('matches').eq('tournament_id', 'tournament').order('round').all()
  assert.equal(result.error, null)
  assert.deepEqual(result.data, rows)
  assert.deepEqual(
    calls.map((c) => c.offset),
    [0, 1000, 2000],
  )
  assert.deepEqual(calls[0].order, [{ column: 'round' }, { column: 'id' }])
  assert.deepEqual(calls[2].filters, [{ column: 'tournament_id', op: 'eq', value: 'tournament' }])
})

test('a failed later page returns an error rather than incomplete standings', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () =>
    ++calls === 1
      ? Response.json({ data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null })
      : Response.json({ error: { message: 'Service indisponible' } }, { status: 503 }),
  )
  const result = await db.from('matches').all()
  assert.equal(result.data, null)
  assert.match(result.error.message, /Service indisponible/)
})

test('name lookups split large ID sets and remove duplicates', async (t) => {
  const ids = Array.from({ length: 1300 }, (_, i) => String(i))
  const sizes = []
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const spec = JSON.parse(options.body)
    const batch = spec.filters[0].value
    sizes.push(batch.length)
    return Response.json({
      data: batch.map((id) => ({ id, username: `Player ${id}` })),
      error: null,
    })
  })
  const rows = await rowsByIds('profiles', [...ids, ...ids.slice(0, 20)], 'id,username')
  assert.equal(rows.length, 1300)
  assert.deepEqual(sizes, [500, 500, 300])
})
