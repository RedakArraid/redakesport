import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { pool } from '../apps/api/src/db.mjs'
import { demoCompetitions, seedDemo } from '../apps/api/src/seed-demo.mjs'

if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test'))
  throw new Error('Demo validation requires a dedicated _test database')
after(() => pool.end())

test('FC27 demo has playable accounts, all competition formats and an idempotent seed', async () => {
  const summary = await seedDemo()
  assert.deepEqual(summary.accounts, { organizers: 2, captains: 8, players: 48 })
  assert.equal(summary.clubs, 8)
  const games = (
    await pool.query(
      "SELECT slug,is_active FROM games WHERE slug IN ('ea-fc-26','ea-fc-27') ORDER BY slug",
    )
  ).rows
  assert.deepEqual(games, [
    { slug: 'ea-fc-26', is_active: true },
    { slug: 'ea-fc-27', is_active: true },
  ])
  const tournaments = (
    await pool.query(
      "SELECT * FROM tournaments WHERE settings->>'demo_seed'='fc27-demo-v1' ORDER BY slug",
    )
  ).rows
  assert.equal(tournaments.length, 14)
  for (const spec of demoCompetitions) {
    const t = tournaments.find((t) => t.slug === `demo-fc27-${spec.slug}`)
    assert.equal(t.status, spec.status, spec.slug)
    assert.equal(t.format, spec.format)
    assert.ok(t.start_date > t.registration_deadline)
    const matches = (await pool.query('SELECT * FROM matches WHERE tournament_id=$1', [t.id])).rows
    assert.ok(matches.every((m) => m.best_of === t.best_of))
    if (t.status === 'completed') {
      assert.ok(matches.length > 0)
      assert.ok(matches.every((m) => m.status === 'completed'))
      assert.ok(
        matches.every((m) => m.completed_at >= t.start_date && m.completed_at <= t.end_date),
      )
      assert.equal(
        (
          await pool.query(
            'SELECT count(*)::int AS n FROM standings WHERE tournament_id=$1 AND position=1',
            [t.id],
          )
        ).rows[0].n,
        1,
      )
    }
    if (t.status === 'ongoing') {
      assert.ok(matches.some((m) => m.status === 'completed'))
      assert.ok(matches.some((m) => m.team1_id && m.team2_id && m.status !== 'completed'))
    }
  }
  const snapshot = async () => {
    const ids = tournaments.map((t) => t.id)
    return {
      tournaments: (
        await pool.query('SELECT * FROM tournaments WHERE id=ANY($1) ORDER BY id', [ids])
      ).rows,
      matches: (
        await pool.query('SELECT * FROM matches WHERE tournament_id=ANY($1) ORDER BY id', [ids])
      ).rows,
      standings: (
        await pool.query(
          'SELECT * FROM standings WHERE tournament_id=ANY($1) ORDER BY tournament_id,team_id',
          [ids],
        )
      ).rows,
      accounts: (
        await pool.query(
          "SELECT u.email,u.password_hash,p.* FROM auth.users u JOIN profiles p ON p.id=u.id WHERE u.email ~ '^(organisateur|capitaine|joueur)[0-9]*@example.test$' ORDER BY u.email",
        )
      ).rows,
      clubs: (
        await pool.query(
          "SELECT * FROM clubs WHERE captain_id IN (SELECT id FROM auth.users WHERE email ~ '^capitaine[0-9]*@example.test$') ORDER BY id",
        )
      ).rows,
      notifications: (await pool.query('SELECT count(*)::int AS n FROM notifications')).rows[0].n,
    }
  }
  const before = await snapshot()
  const again = await seedDemo()
  assert.deepEqual(again.created, { accounts: 0, clubs: 0, competitions: 0 })
  assert.deepEqual(await snapshot(), before)
})
