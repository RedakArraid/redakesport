import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith('_test'))
  throw new Error('A dedicated _test database is required')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
after(() => pool.end())

test('score history preserves private, club, matchmaking and former-captain access boundaries', async () => {
  const db = await pool.connect()
  await db.query('BEGIN')
  try {
    const actors = Object.fromEntries(
      [
        'organizer',
        'publicOrganizer',
        'alice',
        'bob',
        'captain',
        'opponentCaptain',
        'member',
        'newCaptain',
        'publicOpponent',
        'outsider',
      ].map((name) => [name, randomUUID()]),
    )
    await db.query(
      "INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) SELECT id,id::text||'@example.test','fixture',jsonb_build_object('username','visibility_'||left(id::text,12)) FROM unnest($1::uuid[]) id",
      [Object.values(actors)],
    )
    const club = randomUUID(),
      opponentClub = randomUUID()
    await db.query(
      "INSERT INTO clubs(id,name,slug,captain_id) VALUES($1::uuid,'Visibility club',$1::text,$2),($3::uuid,'Opponent club',$3::text,$4)",
      [club, actors.captain, opponentClub, actors.opponentCaptain],
    )
    await db.query('INSERT INTO club_members(club_id,player_id) VALUES($1,$2)', [
      club,
      actors.member,
    ])
    const privateTournament = randomUUID(),
      publicTournament = randomUUID()
    await db.query(
      "INSERT INTO tournaments(id,name,slug,organizer_id,format,status,is_public) VALUES($1::uuid,'Private visibility',$1::text,$2,'round_robin','ongoing',false),($3::uuid,'Public visibility',$3::text,$4,'round_robin','ongoing',true)",
      [privateTournament, actors.organizer, publicTournament, actors.publicOrganizer],
    )
    await db.query(
      "INSERT INTO tournament_registrations(tournament_id,club_id,status) VALUES($1,$2,'approved')",
      [privateTournament, club],
    )
    const scoreIds = []
    async function match(tournament, first, second, firstAuthor, secondAuthor, type = 'player') {
      const id = randomUUID()
      await db.query(
        'INSERT INTO matches(id,tournament_id,team1_id,team2_id,team1_type,team2_type) VALUES($1,$2,$3,$4,$5,$5)',
        [id, tournament, first, second, type],
      )
      const ids = [randomUUID(), randomUUID()]
      await db.query(
        "INSERT INTO score_submissions(id,match_id,submitted_by,team_id,score_team1,score_team2,status) VALUES($1,$2,$3,$4,2,1,'confirmed'),($5,$2,$6,$7,2,1,'disputed')",
        [ids[0], id, firstAuthor, first, ids[1], secondAuthor, second],
      )
      scoreIds.push(...ids)
      return ids
    }
    const privateScores = await match(
      privateTournament,
      actors.alice,
      actors.bob,
      actors.alice,
      actors.bob,
    )
    const clubScores = await match(
      privateTournament,
      club,
      opponentClub,
      actors.captain,
      actors.opponentCaptain,
      'club',
    )
    const publicScores = await match(
      publicTournament,
      actors.alice,
      actors.publicOpponent,
      actors.alice,
      actors.publicOpponent,
    )
    const matchmakingScores = await match(null, actors.alice, actors.bob, actors.alice, actors.bob)
    // Historical rows may have a missing type; represents() treats these as club teams.
    const legacyClubScores = await match(
      null,
      club,
      opponentClub,
      actors.captain,
      actors.opponentCaptain,
      null,
    )

    async function expectScores(actor, expected) {
      await db.query("SELECT set_config('app.user_id',$1,true)", [actor || ''])
      await db.query(actor ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon')
      try {
        const { rows } = await db.query(
          'SELECT id FROM score_submissions WHERE id=ANY($1) ORDER BY id',
          [scoreIds],
        )
        assert.deepEqual(
          rows.map((row) => row.id),
          [...expected].sort(),
        )
      } finally {
        await db.query('RESET ROLE')
      }
    }
    for (const [name, expected] of [
      ['organizer', [...privateScores, ...clubScores]],
      ['publicOrganizer', publicScores],
      ['alice', [...privateScores, ...publicScores, ...matchmakingScores]],
      ['bob', [...privateScores, ...matchmakingScores]],
      ['captain', [...clubScores, ...legacyClubScores]],
      ['opponentCaptain', [...clubScores, ...legacyClubScores]],
      ['member', []],
      ['newCaptain', []],
      ['publicOpponent', publicScores],
      ['outsider', []],
    ])
      await expectScores(actors[name], expected)
    await expectScores(null, [])

    // An approved club member can view the private match, but cannot inspect its scores.
    await db.query("SELECT set_config('app.user_id',$1,true)", [actors.member])
    assert.equal(
      (await db.query('SELECT private.can_view_tournament($1) visible', [privateTournament]))
        .rows[0].visible,
      true,
    )

    await db.query('UPDATE clubs SET captain_id=$1 WHERE id=$2', [actors.newCaptain, club])
    await expectScores(actors.newCaptain, [...clubScores, ...legacyClubScores])
    await expectScores(actors.captain, [clubScores[0], legacyClubScores[0]])
    await expectScores(actors.member, [])
    await expectScores(actors.opponentCaptain, [...clubScores, ...legacyClubScores])
  } finally {
    await db.query('ROLLBACK')
    db.release()
  }
})
