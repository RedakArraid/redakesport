import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { buildBracket } from '../apps/api/src/brackets.ts'
import { createApp } from '../apps/api/src/server.mjs'
import { pool } from '../apps/api/src/db.mjs'
import { digest, passwordHash } from '../apps/api/src/auth.mjs'
import { db as browserDb } from '../apps/web/src/lib/api.ts'
let app, organizer, outsider, players, game
const created = []
let requestNumber = 0
const namespace = randomBytes(4).toString('hex')
async function actor(role = 'player') {
  const id = randomUUID(),
    email = `${namespace}-${id}@example.test`
  created.push(id)
  await pool.query(
    'INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) VALUES($1,$2,$3,$4)',
    [id, email, await passwordHash('Test-password-2026'), { username: `test_${id.slice(0, 12)}` }],
  )
  await pool.query('UPDATE profiles SET role=$1,onboarding_completed=true WHERE id=$2', [role, id])
  const token = randomBytes(32).toString('base64url')
  await pool.query(
    "INSERT INTO auth.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
    [digest(token), id],
  )
  return { id, email, cookie: `redak_session=${token}` }
}
async function req(user, url, payload, expected = 200) {
  const response = await app.inject({
    method: payload === undefined ? 'GET' : 'POST',
    url,
    payload,
    headers: user ? { cookie: user.cookie } : {},
    remoteAddress: `127.0.0.${(++requestNumber % 200) + 1}`,
  })
  assert.equal(response.statusCode, expected, `${url}: ${response.body}`)
  return response.json()
}
const action = (user, name, payload, expected = 200) =>
  req(user, `/api/actions/${name}`, payload, expected)
const query = (user, table, options = {}, expected = 200) =>
  req(user, '/api/data', { table, ...options }, expected)
const eq = (column, value) => ({ column, op: 'eq', value })
async function tournament(format, n, teamSize = 1, bestOf = 1) {
  const { data: t } = await query(organizer, 'tournaments', {
    operation: 'insert',
    payload: {
      name: `Test ${format} ${namespace}`,
      slug: randomUUID(),
      organizer_id: organizer.id,
      game_id: game,
      team_size: teamSize,
      best_of: bestOf,
      format,
      max_teams: n,
    },
  })
  const id = t[0].id
  await query(organizer, 'tournaments', {
    operation: 'update',
    payload: { status: 'registration' },
    filters: [eq('id', id)],
  })
  for (const p of players.slice(0, n)) {
    const { data: rid } = await action(p, 'register_tournament', { p_tournament_id: id })
    await action(organizer, 'review_registration', { p_id: rid, p_approve: true })
  }
  return id
}
before(async () => {
  app = await createApp()
  organizer = await actor('organizer')
  outsider = await actor('organizer')
  players = []
  for (let i = 0; i < 16; i++) players.push(await actor())
  game = (
    await pool.query('INSERT INTO games(name,slug) VALUES($1,$2) RETURNING id', [
      `Tests ${namespace}`,
      `tests-${namespace}`,
    ])
  ).rows[0].id
})
after(async () => {
  if (app) await app.close()
  // Fixtures live only in the dedicated _test database; retain failures for diagnosis.
  await pool.end()
})
test('page reloads and assets do not consume or inherit the API rate limit', async () => {
  const remoteAddress = '127.44.0.1'
  const get = (url) => app.inject({ method: 'GET', url, remoteAddress })
  for (let i = 0; i < 320; i++) {
    const response = await get(i % 2 ? '/login' : '/favicon.svg')
    assert.notEqual(response.statusCode, 429, 'Static navigation must stay available')
  }
  for (let i = 0; i < 300; i++) assert.equal((await get('/api/config')).statusCode, 200)
  const limited = await get('/api/config')
  assert.equal(limited.statusCode, 429)
  assert.match(limited.json().error.message, /Trop de requêtes/)
  assert.ok(Number(limited.headers['retry-after']) > 0)
  for (const path of ['/', '/login', '/favicon.svg', '/manifest.json'])
    assert.notEqual(
      (await get(path)).statusCode,
      429,
      'Exhausted API quota must not block HTML or assets',
    )
})
test('authentication keeps its stricter rate limit independently of static navigation', async () => {
  const remoteAddress = '127.44.0.2'
  for (let i = 0; i < 15; i++) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      remoteAddress,
      payload: { email: 'invalid', password: '' },
    })
    assert.equal(response.statusCode, 400)
  }
  const limited = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    remoteAddress,
    payload: { email: 'invalid', password: '' },
  })
  assert.equal(limited.statusCode, 429)
  assert.match(limited.json().error.message, /Trop de requêtes/)
  assert.notEqual(
    (await app.inject({ method: 'GET', url: '/login', remoteAddress })).statusCode,
    429,
  )
})
test('a round robin larger than one API page retains all 1,035 matches', async (t) => {
  const id = await tournament('round_robin', 46)
  for (let i = players.length; i < 46; i++) {
    const player = await actor()
    const { data: registration } = await action(player, 'register_tournament', {
      p_tournament_id: id,
    })
    await action(organizer, 'review_registration', { p_id: registration, p_approve: true })
  }
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const pages = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body)
    pages.push(body.offset)
    return Response.json(await req(organizer, url, body))
  })
  const { data, error } = await browserDb
    .from('matches')
    .eq('tournament_id', id)
    .order('round')
    .all()
  assert.equal(error, null)
  assert.equal(data.length, 1035)
  assert.equal(new Set(data.map((m) => m.id)).size, 1035)
  assert.deepEqual(pages, [0, 1000])
})
test('cookie authentication, logout, signup and protected writes', async () => {
  const email = `signup-${namespace}@example.test`
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'Long-password-2026', username: `signup_${namespace}` },
    remoteAddress: '127.0.1.1',
  })
  assert.equal(response.statusCode, 200, response.body)
  assert.ok(response.headers['set-cookie'].includes('HttpOnly'))
  const cookie = response.headers['set-cookie'].split(';')[0]
  const user = { cookie, id: response.json().data.user.id }
  const session = await req(user, '/api/auth/session')
  assert.equal(session.data.session.user.id, user.id)
  await action(user, 'complete_onboarding', { p_role: 'captain', p_country: 'France' })
  await action(user, 'complete_onboarding', { p_role: 'organizer', p_country: null }, 400)
  await query(
    user,
    'profiles',
    { operation: 'update', payload: { elo_rating: 9000 }, filters: [eq('id', user.id)] },
    403,
  )
  await req(user, '/api/auth/logout', {})
  assert.equal((await req(user, '/api/auth/session')).data.session, null)
  await query(null, 'tournaments', { operation: 'insert', payload: { name: 'Unauthorized' } }, 401)
  const csrf = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: 'https://attacker.example' },
    payload: { email, password: 'Long-password-2026' },
  })
  assert.equal(csrf.statusCode, 403)
})
test('query compiler rejects injection and joins preserve permissions', async () => {
  await query(players[0], 'profiles; DROP TABLE profiles', {}, 400)
  await query(players[0], 'profiles', { select: 'password_hash' }, 400)
  await query(players[0], 'profiles', { order: [{ column: 'username;select pg_sleep(1)' }] }, 400)
  const { data } = await query(null, 'games', { select: 'id,name', limit: 2 })
  assert.equal(data.length, 2)
})
test('password reset tokens expire, are single-use, and revoke existing sessions', async () => {
  const user = await actor()
  const expired = randomBytes(32).toString('base64url')
  const token = randomBytes(32).toString('base64url')
  await pool.query(
    "INSERT INTO auth.password_resets(token_hash,user_id,expires_at) VALUES($1,$3,now()-interval '1 minute'),($2,$3,now()+interval '30 minutes')",
    [digest(expired), digest(token), user.id],
  )
  await req(
    null,
    '/api/auth/reset-password',
    { token: expired, password: 'New-password-2026' },
    400,
  )
  await req(null, '/api/auth/reset-password', { token, password: 'New-password-2026' })
  assert.equal((await req(user, '/api/auth/session')).data.session, null)
  await req(null, '/api/auth/reset-password', { token, password: 'Another-password-2026' }, 400)
  await req(null, '/api/auth/login', { email: user.email, password: 'Test-password-2026' }, 401)
  const login = await req(null, '/api/auth/login', {
    email: user.email,
    password: 'New-password-2026',
  })
  assert.equal(login.data.session.user.id, user.id)
})
test('club creation and review are atomic; one membership per player', async () => {
  const captain = await actor('captain')
  const { data: club } = await action(captain, 'create_club', {
    p_name: 'Club ' + namespace,
    p_region: 'France',
    p_description: null,
  })
  assert.equal(
    (await query(captain, 'club_members', { filters: [eq('club_id', club.id)] })).data.length,
    1,
  )
  const { data: application } = await query(players[7], 'club_applications', {
    operation: 'insert',
    payload: { club_id: club.id, player_id: players[7].id },
  })
  await action(outsider, 'review_application', { p_id: application[0].id, p_accept: true }, 400)
  await action(captain, 'review_application', { p_id: application[0].id, p_accept: true })
  assert.equal(
    (await query(captain, 'club_members', { filters: [eq('club_id', club.id)] })).data.length,
    2,
  )
  await query(
    captain,
    'clubs',
    { operation: 'update', payload: { is_verified: true }, filters: [eq('id', club.id)] },
    403,
  )
  const joined = await query(captain, 'club_members', {
    select: '*, profiles(username), club:clubs(name)',
    filters: [eq('club_id', club.id)],
  })
  assert.equal(joined.data[0].club.name, club.name)
})
test('registration capacity, ownership and duplicate generation', async () => {
  const id = await tournament('single_elimination', 2)
  await action(players[2], 'register_tournament', { p_tournament_id: id }, 400)
  await req(outsider, '/api/functions/bracket-generate', { tournament_id: id }, 403)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id }, 400)
  const { data: matches } = await query(players[0], 'matches', {
    filters: [eq('tournament_id', id)],
  })
  const m = matches[0]
  await action(outsider, 'submit_score', { p_match_id: m.id, p_score1: 2, p_score2: 0 }, 400)
  await action(
    players.find((p) => p.id === m.team1_id),
    'submit_score',
    { p_match_id: m.id, p_score1: 1.5, p_score2: 0 },
    400,
  )
  await query(
    organizer,
    'matches',
    {
      operation: 'update',
      payload: { winner_id: m.team1_id, status: 'completed' },
      filters: [eq('id', m.id)],
    },
    403,
  )
})
for (const format of [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss',
  'hybrid',
]) {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 16]) {
    if (format === 'hybrid' && n < 4) continue
    test(`${format} ${n}: complete all rounds, scores, standings and ELO once`, async () => {
      const id = await tournament(format, n)
      await req(organizer, '/api/functions/bracket-generate', {
        tournament_id: id,
        seeding: 'manual',
      })
      let played = 0,
        iterations = 0
      while (iterations++ < 1000) {
        const { data: matches } = await query(organizer, 'matches', {
          filters: [eq('tournament_id', id)],
          order: [{ column: 'round' }],
        })
        const pending = matches.filter((m) => m.status !== 'completed')
        if (!pending.length) break
        const m = pending.find((m) => m.team1_id && m.team2_id)
        assert.ok(m, JSON.stringify(pending))
        const p1 = players.find((p) => p.id === m.team1_id),
          p2 = players.find((p) => p.id === m.team2_id)
        const lowerWins = m.bracket_position.side === 'grand_final' || played % 3 === 1
        const scores = {
          p_match_id: m.id,
          p_score1: lowerWins ? 0 : 2,
          p_score2: lowerWins ? 2 : 0,
        }
        if (format === 'swiss' && n === 4 && m.round === 1) {
          scores.p_score1 = 1
          scores.p_score2 = 1
        }
        assert.equal((await action(p1, 'submit_score', scores)).data.status, 'pending')
        assert.equal(
          (await action(p1, 'submit_score', scores)).data.status,
          'pending',
          'same side must not self-confirm',
        )
        assert.equal((await action(p2, 'submit_score', scores)).data.status, 'confirmed')
        await action(p2, 'submit_score', scores, 400)
        played++
      }
      assert.ok(iterations < 1000)
      assert.equal(
        (await query(organizer, 'tournaments', { filters: [eq('id', id)], single: 'required' }))
          .data.status,
        'completed',
      )
      const {
        rows: [{ count }],
      } = await pool.query(
        'SELECT count(*) FROM elo_history WHERE match_id IN(SELECT id FROM matches WHERE tournament_id=$1)',
        [id],
      )
      assert.equal(Number(count), played * 2)
      const { data: standings } = await query(null, 'standings', {
        filters: [eq('tournament_id', id)],
      })
      assert.equal(standings.length, n)
      if (['single_elimination', 'double_elimination', 'hybrid'].includes(format)) {
        const completed = (
          await query(organizer, 'matches', { filters: [eq('tournament_id', id)], limit: 1000 })
        ).data
        const last =
          completed.find((m) => m.bracket_position.side === 'reset' && m.winner_id) ??
          completed.find((m) => m.bracket_position.side === 'grand_final') ??
          completed.find((m) => m.bracket_position.side === 'winners' && !m.next_match_id)
        assert.ok(last?.winner_id, 'The competition has a champion')
        assert.equal(
          standings.find((s) => s.team_id === last.winner_id)?.position,
          1,
          'The actual champion ranks first',
        )
        assert.equal(
          standings.find((s) => s.team_id === last.loser_id)?.position,
          2,
          'The finalist ranks second',
        )
        if (format !== 'hybrid') {
          const losses = new Map()
          for (const m of completed)
            if (m.loser_id) losses.set(m.loser_id, (losses.get(m.loser_id) ?? 0) + 1)
          for (const row of standings)
            if (row.team_id !== last.winner_id)
              assert.equal(losses.get(row.team_id), format === 'double_elimination' ? 2 : 1)
        }
      }
      if (format === 'single_elimination') assert.equal(played, n - 1)
      if (format === 'double_elimination') assert.equal(played, 2 * n - 1)
      assert.ok(
        standings.every((s) => Number.isInteger(s.position) && s.position >= 1 && s.position <= n),
      )
      if (format === 'round_robin') assert.equal(played, (n * (n - 1)) / 2)
      if (format === 'swiss') {
        const max = (
          await pool.query('SELECT max(round) r FROM matches WHERE tournament_id=$1', [id])
        ).rows[0].r
        assert.equal(max, Math.ceil(Math.log2(n)))
        const allMatches = (
          await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })
        ).data
        const pairs = allMatches
          .filter((m) => m.team1_id && m.team2_id)
          .map((m) => [m.team1_id, m.team2_id].sort().join('/'))
        assert.equal(new Set(pairs).size, pairs.length, 'No Swiss opponents meet twice')
        for (const standing of standings) {
          const games = allMatches.filter(
            (m) => m.team1_id && m.team2_id && [m.team1_id, m.team2_id].includes(standing.team_id),
          )
          const opponentPoints = (m) =>
            standings.find(
              (s) => s.team_id === (m.team1_id === standing.team_id ? m.team2_id : m.team1_id),
            ).points
          assert.equal(
            standing.buchholz,
            games.reduce((n, m) => n + opponentPoints(m), 0),
          )
          assert.equal(
            Number(standing.sonneborn_berger),
            games.reduce(
              (n, m) =>
                n +
                (m.winner_id === standing.team_id
                  ? opponentPoints(m)
                  : m.winner_id === null
                    ? opponentPoints(m) / 2
                    : 0),
              0,
            ),
          )
        }
        const byeRecipients = []
        for (let round = 1; round <= max; round++) {
          const roundMatches = allMatches.filter((m) => m.round === round)
          const entrants = roundMatches.flatMap((m) => [m.team1_id, m.team2_id]).filter(Boolean)
          assert.equal(entrants.length, n)
          assert.equal(new Set(entrants).size, n, 'Each entrant appears exactly once per round')
          byeRecipients.push(...roundMatches.filter((m) => !m.team2_id).map((m) => m.team1_id))
        }
        assert.equal(
          new Set(byeRecipients).size,
          byeRecipients.length,
          'A bye is not awarded twice',
        )
      }
    })
  }
}
test('score dispute resolved only by tournament owner', async () => {
  const id = await tournament('single_elimination', 2)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0]
  const first = players.find((p) => p.id === m.team1_id),
    second = players.find((p) => p.id === m.team2_id)
  await action(first, 'submit_score', { p_match_id: m.id, p_score1: 2, p_score2: 0 })
  assert.equal(
    (await action(second, 'submit_score', { p_match_id: m.id, p_score1: 0, p_score2: 2 })).data
      .status,
    'disputed',
  )
  await action(outsider, 'resolve_score', { p_match_id: m.id, p_score1: 2, p_score2: 0 }, 400)
  await action(organizer, 'resolve_score', { p_match_id: m.id, p_score1: 2, p_score2: 0 })
  assert.equal(
    (await query(organizer, 'matches', { filters: [eq('id', m.id)], single: 'required' })).data
      .loser_id,
    m.team2_id,
  )
})
test('cancelling a disputed tournament prevents arbitration and any new result', async () => {
  const id = await tournament('single_elimination', 2)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0]
  await action(
    players.find((p) => p.id === m.team1_id),
    'submit_score',
    { p_match_id: m.id, p_score1: 3, p_score2: 1 },
  )
  await action(
    players.find((p) => p.id === m.team2_id),
    'submit_score',
    { p_match_id: m.id, p_score1: 1, p_score2: 3 },
  )
  await query(organizer, 'tournaments', {
    operation: 'update',
    payload: { status: 'cancelled' },
    filters: [eq('id', id)],
  })
  await action(organizer, 'resolve_score', { p_match_id: m.id, p_score1: 3, p_score2: 1 }, 400)
  await action(
    organizer,
    'forfeit_match',
    { p_match_id: m.id, p_loser_id: m.team2_id, p_reason: 'Forfait après annulation' },
    400,
  )
  assert.equal(
    (await query(organizer, 'tournaments', { filters: [eq('id', id)], single: 'required' })).data
      .status,
    'cancelled',
  )
  assert.equal(
    Number(
      (await pool.query('SELECT count(*) FROM elo_history WHERE match_id=$1', [m.id])).rows[0]
        .count,
    ),
    0,
  )
})

test('double elimination closes without a reset if the undefeated finalist wins', async () => {
  const id = await tournament('double_elimination', 6)
  let played = 0
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  for (let loop = 0; loop < 50; loop++) {
    const all = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data
    const m = all.find((m) => m.status === 'pending' && m.team1_id && m.team2_id)
    if (!m) break
    const score = { p_match_id: m.id, p_score1: 2, p_score2: 0 }
    await action(
      players.find((p) => p.id === m.team1_id),
      'submit_score',
      score,
    )
    await action(
      players.find((p) => p.id === m.team2_id),
      'submit_score',
      score,
    )
    played++
  }
  assert.equal(played, 10)
  const reset = (
    await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })
  ).data.find((m) => m.bracket_position.side === 'reset')
  assert.equal(reset.status, 'completed')
  assert.equal(reset.team1_id, null)
  assert.equal(
    (await query(organizer, 'tournaments', { filters: [eq('id', id)], single: 'required' })).data
      .status,
    'completed',
  )
})
test('matchmaking claims a single lobby under concurrent ticks', async () => {
  const a = await actor(),
    b = await actor()
  await action(a, 'join_queue', { p_game_id: game })
  await action(b, 'join_queue', { p_game_id: game })
  await Promise.all([
    action(a, 'matchmaking_tick', {}),
    action(b, 'matchmaking_tick', {}),
    action(a, 'matchmaking_tick', {}),
  ])
  const q = (
    await query(a, 'matchmaking_queue', { filters: [eq('player_id', a.id)], single: 'required' })
  ).data
  assert.equal(q.status, 'matched')
  const id = q.party_id
  assert.equal((await query(outsider, 'lobbies', { filters: [eq('id', id)] })).data.length, 0)
  await action(outsider, 'lobby_ready', { p_id: id }, 400)
  await action(a, 'lobby_ready', { p_id: id })
  const { data: matchId } = await action(b, 'lobby_ready', { p_id: id })
  assert.ok(matchId)
  await action(a, 'submit_score', { p_match_id: matchId, p_score1: 2, p_score2: 0 })
  await action(b, 'submit_score', { p_match_id: matchId, p_score1: 2, p_score2: 0 })
  await action(a, 'join_queue', { p_game_id: game })
})
test('private tournaments and broadcast credentials stay private', async () => {
  const { data: items } = await query(organizer, 'tournaments', {
    operation: 'insert',
    payload: {
      name: 'Private',
      slug: randomUUID(),
      organizer_id: organizer.id,
      format: 'single_elimination',
      is_public: false,
    },
  })
  const id = items[0].id
  assert.equal((await query(outsider, 'tournaments', { filters: [eq('id', id)] })).data.length, 0)
  assert.equal((await query(null, 'tournaments', { filters: [eq('id', id)] })).data.length, 0)
  const { data: sessions } = await query(organizer, 'broadcast_sessions', {
    operation: 'insert',
    payload: {
      organizer_id: organizer.id,
      title: 'Private stream',
      platform: 'twitch',
      stream_key: 'never-public',
      status: 'live',
    },
  })
  assert.equal(
    (await query(outsider, 'broadcast_sessions', { filters: [eq('id', sessions[0].id)] })).data
      .length,
    0,
  )
  assert.equal(
    (await query(null, 'broadcast_sessions', { filters: [eq('id', sessions[0].id)] })).data.length,
    0,
  )
})

test('club results update club ELO, not unrelated player profiles', async () => {
  const c1 = await actor('captain'),
    c2 = await actor('captain')
  const club1 = (
    await action(c1, 'create_club', {
      p_name: 'Team A ' + namespace,
      p_region: null,
      p_description: null,
    })
  ).data
  const club2 = (
    await action(c2, 'create_club', {
      p_name: 'Team B ' + namespace,
      p_region: null,
      p_description: null,
    })
  ).data
  const id = (
    await query(organizer, 'tournaments', {
      operation: 'insert',
      payload: {
        name: 'Teams',
        slug: randomUUID(),
        organizer_id: organizer.id,
        format: 'single_elimination',
        team_size: 5,
      },
    })
  ).data[0].id
  await query(organizer, 'tournaments', {
    operation: 'update',
    payload: { status: 'registration' },
    filters: [eq('id', id)],
  })
  for (const [captain, club] of [
    [c1, club1],
    [c2, club2],
  ]) {
    const rid = (
      await action(captain, 'register_tournament', { p_tournament_id: id, p_club_id: club.id })
    ).data
    await action(organizer, 'review_registration', { p_id: rid, p_approve: true })
  }
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0]
  await Promise.all([
    action(c1, 'submit_score', { p_match_id: m.id, p_score1: 3, p_score2: 1 }),
    action(c2, 'submit_score', { p_match_id: m.id, p_score1: 3, p_score2: 1 }),
  ])
  const ratings = (
    await pool.query('SELECT elo_rating FROM clubs WHERE id=ANY($1::uuid[]) ORDER BY elo_rating', [
      [club1.id, club2.id],
    ])
  ).rows.map((r) => r.elo_rating)
  assert.deepEqual(ratings, [984, 1016])
  assert.equal(
    (await pool.query('SELECT count(*) FROM elo_history WHERE match_id=$1', [m.id])).rows[0].count,
    '2',
  )
})
test('round-robin draws award points to both sides', async () => {
  const id = await tournament('round_robin', 2)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0]
  await action(players[0], 'submit_score', { p_match_id: m.id, p_score1: 2, p_score2: 2 })
  await action(players[1], 'submit_score', { p_match_id: m.id, p_score1: 2, p_score2: 2 })
  const rows = (await query(organizer, 'standings', { filters: [eq('tournament_id', id)] })).data
  assert.ok(rows.every((r) => r.points === 1 && r.draws === 1 && r.wins === 0 && r.map_wins === 2))
})
test('uploaded evidence is private and belongs to the submitted match', async () => {
  const id = await tournament('single_elimination', 2)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0],
    user = players[0]
  const boundary = 'testBoundary' + randomUUID(),
    png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7qkAAAAASUVORK5CYII=',
      'base64',
    )
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="proof.png"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const response = await app.inject({
    method: 'POST',
    url: `/api/files/score-screenshots?path=${m.id}/${user.id}/${randomUUID()}.png`,
    headers: { cookie: user.cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload,
  })
  assert.equal(response.statusCode, 201, response.body)
  const url = response.json().data.url
  const owner = await app.inject({ url, headers: { cookie: user.cookie } })
  assert.equal(owner.statusCode, 200)
  const stranger = await app.inject({ url, headers: { cookie: outsider.cookie } })
  assert.equal(stranger.statusCode, 403)
  const anon = await app.inject({ url })
  assert.equal(anon.statusCode, 403)
  await action(user, 'submit_score', {
    p_match_id: m.id,
    p_score1: 2,
    p_score2: 0,
    p_screenshots: [url],
  })
  await action(
    players[1],
    'submit_score',
    { p_match_id: m.id, p_score1: 2, p_score2: 0, p_screenshots: [url] },
    400,
  )
})

test('solo opponents can reconcile a disputed result without an organizer', async () => {
  const a = await actor(),
    b = await actor()
  const isolatedGame = (
    await pool.query('INSERT INTO games(name,slug) VALUES($1,$2) RETURNING id', [
      'Solo dispute',
      randomUUID(),
    ])
  ).rows[0].id
  await action(a, 'join_queue', { p_game_id: isolatedGame })
  await action(b, 'join_queue', { p_game_id: isolatedGame })
  await action(a, 'matchmaking_tick', {})
  const lobby = (
    await query(a, 'matchmaking_queue', { filters: [eq('player_id', a.id)], single: 'required' })
  ).data.party_id
  await action(a, 'lobby_ready', { p_id: lobby })
  const mid = (await action(b, 'lobby_ready', { p_id: lobby })).data
  await action(a, 'submit_score', { p_match_id: mid, p_score1: 1, p_score2: 0 })
  assert.equal(
    (await action(b, 'submit_score', { p_match_id: mid, p_score1: 0, p_score2: 1 })).data.status,
    'disputed',
  )
  assert.equal(
    (await action(a, 'submit_score', { p_match_id: mid, p_score1: 0, p_score2: 1 })).data.status,
    'confirmed',
  )
  assert.equal(
    (await pool.query('SELECT count(*) FROM elo_history WHERE match_id=$1', [mid])).rows[0].count,
    '2',
  )
})

test('a withdrawn entrant invalidates a bracket plan before installation', async () => {
  const id = await tournament('single_elimination', 4)
  const plan = buildBracket(
    players.slice(0, 4).map((p) => ({ id: p.id, type: 'player' })),
    id,
    'single_elimination',
  )
  const registration = (
    await query(organizer, 'tournament_registrations', {
      filters: [eq('tournament_id', id), eq('player_id', players[3].id)],
    })
  ).data[0]
  await action(players[3], 'withdraw_registration', { p_id: registration.id })
  await assert.rejects(
    pool.query('SELECT public.install_bracket($1,$2,$3)', [organizer.id, id, plan]),
    /inscriptions ont changé/,
  )
  assert.equal(
    (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data.length,
    0,
  )
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  await action(
    players[0],
    'withdraw_registration',
    {
      p_id: (
        await query(organizer, 'tournament_registrations', {
          filters: [eq('tournament_id', id), eq('player_id', players[0].id)],
        })
      ).data[0].id,
    },
    400,
  )
})

test('concurrent score confirmations publish a single result and ELO transaction', async () => {
  const id = await tournament('single_elimination', 2)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0]
  const responses = await Promise.all(
    [m.team1_id, m.team2_id].map((team) =>
      action(
        players.find((p) => p.id === team),
        'submit_score',
        { p_match_id: m.id, p_score1: 2, p_score2: 0 },
      ),
    ),
  )
  assert.deepEqual(responses.map((r) => r.data.status).sort(), ['confirmed', 'pending'])
  assert.equal(
    (await pool.query('SELECT count(*)::integer n FROM elo_history WHERE match_id=$1', [m.id]))
      .rows[0].n,
    2,
  )
  assert.equal(
    (await query(organizer, 'tournaments', { filters: [eq('id', id)] })).data[0].status,
    'completed',
  )
})

for (const format of ['single_elimination', 'double_elimination', 'round_robin', 'swiss', 'hybrid'])
  for (const bestOf of [3, 5]) {
    test(`${format} BO${bestOf}: series, forfeit and arbitration complete every stage`, async () => {
      const id = await tournament(format, 5, 1, bestOf)
      await req(organizer, '/api/functions/bracket-generate', {
        tournament_id: id,
        seeding: 'manual',
      })
      const needed = Math.floor(bestOf / 2) + 1
      let steps = 0
      while (steps < 100) {
        const matches = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] }))
          .data
        assert.ok(
          matches.every((m) => m.best_of === bestOf),
          'New rounds inherit series rules',
        )
        const pending = matches.filter((m) => m.status !== 'completed')
        if (!pending.length) break
        const m = pending.find((m) => m.team1_id && m.team2_id)
        assert.ok(m)
        const first = players.find((p) => p.id === m.team1_id),
          second = players.find((p) => p.id === m.team2_id)
        const score = { p_match_id: m.id, p_score1: needed, p_score2: 1 }
        if (steps === 0) {
          await action(first, 'submit_score', { ...score, p_score1: needed - 1, p_score2: 0 }, 400)
          await action(first, 'submit_score', { ...score, p_score1: needed + 1 }, 400)
          await action(first, 'submit_score', { ...score, p_score2: needed }, 400)
          await action(organizer, 'forfeit_match', {
            p_match_id: m.id,
            p_loser_id: m.team2_id,
            p_reason: 'Absence constatée par l’organisateur',
          })
        } else if (steps === 1) {
          await action(first, 'submit_score', score)
          await action(second, 'submit_score', { ...score, p_score1: 0, p_score2: needed })
          await action(
            organizer,
            'resolve_score',
            { ...score, p_score1: needed - 1, p_score2: 0 },
            400,
          )
          await action(organizer, 'resolve_score', score)
        } else {
          if (m.bracket_position.side === 'grand_final') {
            score.p_score1 = 0
            score.p_score2 = needed
          }
          await action(first, 'submit_score', score)
          await action(second, 'submit_score', score)
        }
        steps++
      }
      assert.ok(steps < 100)
      assert.equal(
        (await query(organizer, 'tournaments', { filters: [eq('id', id)] })).data[0].status,
        'completed',
      )
      const all = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data
      const forfeits = all.filter((m) => m.result_kind === 'forfeit')
      assert.equal(forfeits.length, 1)
      assert.equal(
        (
          await pool.query(
            'SELECT count(*)::integer n FROM elo_history WHERE match_id IN (SELECT id FROM matches WHERE tournament_id=$1)',
            [id],
          )
        ).rows[0].n,
        (steps - 1) * 2,
      )
      assert.equal(
        (
          await pool.query('SELECT count(*)::integer n FROM elo_history WHERE match_id=$1', [
            forfeits[0].id,
          ])
        ).rows[0].n,
        0,
      )
      const standings = (
        await query(organizer, 'standings', { filters: [eq('tournament_id', id)] })
      ).data
      assert.equal(standings.length, 5)
      assert.equal(standings.filter((s) => s.position === 1).length, 1)
    })
  }

test('forfeits are authorized, auditable and immutable, including during a dispute', async () => {
  const id = await tournament('single_elimination', 2)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0]
  const first = players.find((p) => p.id === m.team1_id),
    second = players.find((p) => p.id === m.team2_id)
  const args = {
    p_match_id: m.id,
    p_loser_id: m.team2_id,
    p_reason: 'Abandon volontaire du participant',
  }
  await action(outsider, 'forfeit_match', args, 400)
  await action(first, 'forfeit_match', args, 400)
  await action(organizer, 'forfeit_match', { ...args, p_loser_id: outsider.id }, 400)
  await action(second, 'forfeit_match', { ...args, p_reason: 'x' }, 400)
  await action(first, 'submit_score', { p_match_id: m.id, p_score1: 2, p_score2: 0 })
  await action(second, 'submit_score', { p_match_id: m.id, p_score1: 0, p_score2: 2 })
  await action(second, 'forfeit_match', args)
  await action(second, 'forfeit_match', args, 400)
  await action(organizer, 'resolve_score', { p_match_id: m.id, p_score1: 2, p_score2: 0 }, 400)
  const result = (await query(organizer, 'matches', { filters: [eq('id', m.id)] })).data[0]
  assert.equal(result.winner_id, m.team1_id)
  assert.equal(result.result_kind, 'forfeit')
  assert.equal(result.status, 'completed')
  const events = (await query(organizer, 'match_events', { filters: [eq('match_id', m.id)] })).data
  await query(
    organizer,
    'match_events',
    {
      operation: 'insert',
      payload: { match_id: m.id, event_type: 'forfeit', data: { description: 'Faux arbitrage' } },
    },
    403,
  )
  assert.equal(events.filter((e) => e.event_type === 'forfeit').length, 1)
  assert.equal(events.find((e) => e.event_type === 'forfeit').data.decided_by, second.id)
  assert.equal(
    (await pool.query('SELECT count(*)::integer n FROM elo_history WHERE match_id=$1', [m.id]))
      .rows[0].n,
    0,
  )
  await query(
    organizer,
    'matches',
    { operation: 'update', payload: { result_kind: 'played' }, filters: [eq('id', m.id)] },
    403,
  )
  await query(
    organizer,
    'tournaments',
    { operation: 'update', payload: { best_of: 5 }, filters: [eq('id', id)] },
    403,
  )
})

test('a concurrent forfeit and score confirmation settle the match exactly once', async () => {
  const id = await tournament('single_elimination', 2, 1, 3)
  await req(organizer, '/api/functions/bracket-generate', { tournament_id: id })
  const m = (await query(organizer, 'matches', { filters: [eq('tournament_id', id)] })).data[0]
  const first = players.find((p) => p.id === m.team1_id),
    second = players.find((p) => p.id === m.team2_id)
  await action(first, 'submit_score', { p_match_id: m.id, p_score1: 2, p_score2: 1 })
  const responses = await Promise.all([
    app.inject({
      method: 'POST',
      url: '/api/actions/submit_score',
      payload: { p_match_id: m.id, p_score1: 2, p_score2: 1 },
      headers: { cookie: second.cookie },
    }),
    app.inject({
      method: 'POST',
      url: '/api/actions/forfeit_match',
      payload: {
        p_match_id: m.id,
        p_loser_id: m.team1_id,
        p_reason: 'Abandon du premier participant',
      },
      headers: { cookie: organizer.cookie },
    }),
  ])
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 400])
  const result = (await query(organizer, 'matches', { filters: [eq('id', m.id)] })).data[0]
  const elo = (
    await pool.query('SELECT count(*)::integer n FROM elo_history WHERE match_id=$1', [m.id])
  ).rows[0].n
  assert.equal(elo, result.result_kind === 'forfeit' ? 0 : 2)
  assert.equal(
    (await query(organizer, 'tournaments', { filters: [eq('id', id)] })).data[0].status,
    'completed',
  )
})

test('a solo matchmaking participant can concede without an organizer', async () => {
  const m = (
    await pool.query(
      "INSERT INTO matches(team1_id,team2_id,team1_type,team2_type) VALUES($1,$2,'player','player') RETURNING *",
      [players[0].id, players[1].id],
    )
  ).rows[0]
  const args = {
    p_match_id: m.id,
    p_loser_id: m.team1_id,
    p_reason: 'Abandon volontaire du match solo',
  }
  await action(organizer, 'forfeit_match', args, 400)
  await action(players[1], 'forfeit_match', args, 400)
  await action(players[0], 'forfeit_match', args)
  const match = (await query(players[0], 'matches', { filters: [eq('id', m.id)] })).data[0]
  assert.equal(match.status, 'completed')
  assert.equal(match.winner_id, players[1].id)
  assert.equal(
    (await pool.query('SELECT count(*)::integer n FROM elo_history WHERE match_id=$1', [m.id]))
      .rows[0].n,
    0,
  )
  const notifications = (
    await query(players[1], 'notifications', { filters: [eq('user_id', players[1].id)] })
  ).data
  assert.ok(
    notifications.some((n) => n.data?.match_id === m.id && n.title === 'Match terminé par forfait'),
  )
})
