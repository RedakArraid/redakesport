import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith('_test'))
  throw new Error('A dedicated _test database is required')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
after(() => pool.end())

async function fixture(run) {
  const db = await pool.connect()
  await db.query('BEGIN')
  try {
    await run(db)
  } finally {
    await db.query('ROLLBACK')
    db.release()
  }
}
async function users(db, names) {
  const actors = Object.fromEntries(names.map((name) => [name, randomUUID()]))
  await db.query(
    "INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) SELECT id,id::text||'@example.test','fixture',jsonb_build_object('username','matchview_'||left(id::text,12)) FROM unnest($1::uuid[]) id",
    [Object.values(actors)],
  )
  return actors
}
async function as(db, user, run) {
  await db.query("SELECT set_config('app.user_id',$1,true)", [user || ''])
  await db.query(user ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon')
  try {
    return await run()
  } finally {
    await db.query('RESET ROLE')
  }
}

test('recent match visibility preserves public, private, draft, registration and captain boundaries', async () => {
  await fixture(async (db) => {
    const actor = await users(db, [
      'owner',
      'alice',
      'bob',
      'registered',
      'member',
      'captain',
      'opponentCaptain',
      'newCaptain',
      'unregisteredMember',
      'draftRegistrant',
      'outsider',
      'hidden1',
      'hidden2',
    ])
    const registeredClub = randomUUID(),
      participantClub = randomUUID(),
      opponentClub = randomUUID()
    await db.query(
      "INSERT INTO clubs(id,name,slug,captain_id) VALUES($1::uuid,'Registered club',$1::text,$2),($3::uuid,'Participant club',$3::text,$4),($5::uuid,'Opponent club',$5::text,$6)",
      [
        registeredClub,
        actor.owner,
        participantClub,
        actor.captain,
        opponentClub,
        actor.opponentCaptain,
      ],
    )
    await db.query('INSERT INTO club_members(club_id,player_id) VALUES($1,$2),($3,$4)', [
      registeredClub,
      actor.member,
      participantClub,
      actor.unregisteredMember,
    ])
    const tournaments = {
      public: randomUUID(),
      private: randomUUID(),
      draft: randomUUID(),
      privateDraft: randomUUID(),
    }
    for (const [name, id] of Object.entries(tournaments)) {
      await db.query(
        "INSERT INTO tournaments(id,name,slug,organizer_id,format,status,is_public) VALUES($1::uuid,$2,$1::text,$3,'round_robin',$4,$5)",
        [
          id,
          name,
          actor.owner,
          name.toLowerCase().includes('draft') ? 'draft' : 'ongoing',
          ['public', 'draft'].includes(name),
        ],
      )
    }
    await db.query(
      "INSERT INTO tournament_registrations(tournament_id,player_id,status) VALUES($1,$2,'approved'),($3,$4,'approved')",
      [tournaments.private, actor.registered, tournaments.draft, actor.draftRegistrant],
    )
    await db.query(
      "INSERT INTO tournament_registrations(tournament_id,club_id,status) VALUES($1,$2,'approved')",
      [tournaments.private, registeredClub],
    )
    const matches = {}
    async function match(name, tournament, first, second, type = 'player') {
      const id = randomUUID()
      matches[name] = id
      await db.query(
        'INSERT INTO matches(id,tournament_id,team1_id,team2_id,team1_type,team2_type) VALUES($1,$2,$3,$4,$5,$5)',
        [id, tournament, first, second, type],
      )
    }
    await match('public', tournaments.public, actor.alice, actor.bob)
    await match('draft', tournaments.draft, actor.alice, actor.bob)
    await match('privateDraft', tournaments.privateDraft, actor.hidden1, actor.hidden2)
    await match('privatePlayers', tournaments.private, actor.alice, actor.bob)
    await match('privateClubs', tournaments.private, participantClub, opponentClub, 'club')
    await match('privateOther', tournaments.private, actor.hidden1, actor.hidden2)
    await match('matchmaking', null, actor.alice, actor.bob)
    await match('clubMatchmaking', null, participantClub, opponentClub, 'club')
    await match('legacyClub', null, participantClub, opponentClub, null)
    await match('empty', null, null, null)

    async function expectMatches(user, names) {
      const rows = await as(
        db,
        user,
        async () =>
          (await db.query('SELECT id FROM matches WHERE id=ANY($1)', [Object.values(matches)]))
            .rows,
      )
      assert.deepEqual(rows.map((row) => row.id).sort(), names.map((name) => matches[name]).sort())
    }
    const privateTournamentMatches = ['public', 'privatePlayers', 'privateClubs', 'privateOther']
    const clubParticipantMatches = ['public', 'privateClubs', 'clubMatchmaking', 'legacyClub']
    for (const [name, expected] of [
      ['owner', [...privateTournamentMatches, 'draft', 'privateDraft']],
      ['alice', ['public', 'draft', 'privatePlayers', 'matchmaking']],
      ['bob', ['public', 'draft', 'privatePlayers', 'matchmaking']],
      ['registered', privateTournamentMatches],
      ['member', privateTournamentMatches],
      ['captain', clubParticipantMatches],
      ['opponentCaptain', clubParticipantMatches],
      ['unregisteredMember', ['public']],
      ['draftRegistrant', ['public', 'draft']],
      ['outsider', ['public']],
    ])
      await expectMatches(actor[name], expected)
    await expectMatches(null, ['public'])
    await db.query('UPDATE clubs SET captain_id=$1 WHERE id=$2', [
      actor.newCaptain,
      participantClub,
    ])
    await expectMatches(actor.newCaptain, clubParticipantMatches)
    await expectMatches(actor.captain, ['public'])
    await db.query(
      "UPDATE tournament_registrations SET status='withdrawn' WHERE tournament_id=$1 AND player_id=$2",
      [tournaments.private, actor.registered],
    )
    await expectMatches(actor.registered, ['public'])
  })
})

test('recent discovery skips private matches and bounds inspected history before LIMIT 100', async () => {
  await fixture(async (db) => {
    const actor = await users(db, ['owner', 'outsider'])
    const publicTournament = randomUUID(),
      privateTournament = randomUUID()
    await db.query(
      "INSERT INTO tournaments(id,name,slug,organizer_id,format,status,is_public) VALUES($1::uuid,'Recent public',$1::text,$3,'round_robin','ongoing',true),($2::uuid,'Recent private',$2::text,$3,'round_robin','ongoing',false)",
      [publicTournament, privateTournament, actor.owner],
    )
    await db.query(
      "INSERT INTO matches(tournament_id,created_at) SELECT $1,'2090-01-01'::timestamptz + n * interval '1 second' FROM generate_series(1,5000) n",
      [privateTournament],
    )
    const recent = (
      await db.query(
        "INSERT INTO matches(tournament_id,created_at) SELECT $1,'2100-01-01'::timestamptz + n * interval '1 second' FROM generate_series(1,100) n RETURNING id,created_at",
        [publicTournament],
      )
    ).rows
      .sort((first, second) => second.created_at.getTime() - first.created_at.getTime())
      .map((row) => row.id)
    await db.query(
      "INSERT INTO matches(tournament_id,created_at) SELECT $1,'2101-01-01'::timestamptz + n * interval '1 second' FROM generate_series(1,20) n",
      [privateTournament],
    )
    await db.query('INSERT INTO matches(tournament_id,created_at) VALUES($1,NULL)', [
      publicTournament,
    ])
    await db.query('ANALYZE public.matches')
    const sql = `SELECT t.*, (SELECT row_to_json(n0) FROM (SELECT j1.name FROM public.tournaments j1 WHERE j1.id=t.tournament_id LIMIT 1) n0) AS tournaments FROM public.matches t ORDER BY t.created_at DESC NULLS LAST LIMIT 100`
    for (const user of [actor.outsider, null]) {
      await as(db, user, async () => {
        assert.deepEqual(
          (await db.query(sql)).rows.map((row) => row.id),
          recent,
        )
        const plan = (await db.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`)).rows[0][
          'QUERY PLAN'
        ][0].Plan
        const nodes = []
        function visit(node) {
          nodes.push(node)
          for (const child of node.Plans || []) visit(child)
        }
        visit(plan)
        const scans = nodes.filter((node) => node['Relation Name'] === 'matches')
        assert.equal(scans.length, 1)
        const inspected = scans[0]['Actual Rows'] + (scans[0]['Rows Removed by Filter'] || 0)
        assert.equal(
          inspected,
          120,
          'Only 20 hidden recent matches and the 100 public results should be inspected',
        )
        assert.equal(
          nodes.some((node) => node['Node Type'] === 'Sort'),
          false,
          'Discovery must not sort the complete visible history before applying the limit',
        )
      })
    }
  })
})
