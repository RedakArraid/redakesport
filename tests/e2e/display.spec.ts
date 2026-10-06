import { test, expect, type Page } from '@playwright/test'
import pg from 'pg'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const connectionString =
  process.env.TEST_DATABASE_URL || 'postgresql://redak:redak_local@127.0.0.1:5440/redakesport_test'
if (!new URL(connectionString).pathname.endsWith('_test'))
  throw new Error('A test database is required')
let fixture: {
  organizer: string
  captain: string
  player: string
  tournament: string
  match: string
  completed: string
}

test.beforeAll(async ({ request }) => {
  const pool = new pg.Pool({ connectionString })
  async function actor(name: string, role = 'player') {
    const id = randomUUID(),
      token = randomBytes(32).toString('base64url')
    await pool.query(
      'INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) VALUES($1,$2,$3,$4)',
      [id, `${id}@example.test`, 'unused', { username: `${name}_${id.slice(0, 5)}` }],
    )
    await pool.query('UPDATE profiles SET role=$2,onboarding_completed=true WHERE id=$1', [
      id,
      role,
    ])
    await pool.query(
      "INSERT INTO auth.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
      [createHash('sha256').update(token).digest('hex'), id],
    )
    return { id, token }
  }
  async function call(actor: { token: string }, path: string, data: unknown) {
    const response = await request.post(`/api/${path}`, {
      data,
      headers: { cookie: `redak_session=${actor.token}`, 'x-forwarded-for': '127.0.2.2' },
    })
    expect(response.ok(), await response.text()).toBeTruthy()
    return response.json()
  }
  try {
    const organizer = await actor('Camille', 'organizer'),
      captain = await actor('Atlas', 'captain')
    const players = []
    for (const name of ['Nova', 'Phoenix', 'Orion', 'Vega']) players.push(await actor(name))
    const game = (await pool.query('SELECT id FROM games WHERE is_active ORDER BY name LIMIT 1'))
      .rows[0].id
    const club = (
      await call(captain, 'actions/create_club', {
        p_name: 'Les Dragons de Paris',
        p_region: 'France',
        p_description: 'Club de compétition ouvert aux joueurs motivés.',
      })
    ).data
    const application = (
      await call(players[0], 'data', {
        table: 'club_applications',
        operation: 'insert',
        payload: {
          player_id: players[0].id,
          club_id: club.id,
          message: 'Disponible pour les prochains matchs.',
        },
      })
    ).data[0]
    await call(captain, 'actions/review_application', { p_id: application.id, p_accept: true })
    await call(players[1], 'data', {
      table: 'club_applications',
      operation: 'insert',
      payload: {
        player_id: players[1].id,
        club_id: club.id,
        message: 'Je souhaite rejoindre votre équipe.',
      },
    })
    const tournament = (
      await call(organizer, 'data', {
        table: 'tournaments',
        operation: 'insert',
        payload: {
          name: 'Coupe de France — Saison automne',
          slug: randomUUID(),
          organizer_id: organizer.id,
          game_id: game,
          format: 'round_robin',
          team_size: 1,
          max_teams: 4,
          region: 'France',
          is_public: true,
          start_date: '2026-10-12T18:00:00Z',
          prize_pool: { total: 500, currency: 'EUR' },
          rules: 'Respect des adversaires et confirmation des résultats après chaque match.',
        },
      })
    ).data[0]
    await call(organizer, 'data', {
      table: 'tournaments',
      operation: 'update',
      filters: [{ column: 'id', op: 'eq', value: tournament.id }],
      payload: { status: 'registration' },
    })
    for (const player of players) {
      const registration = (
        await call(player, 'actions/register_tournament', { p_tournament_id: tournament.id })
      ).data
      await call(organizer, 'actions/review_registration', { p_id: registration, p_approve: true })
    }
    await call(organizer, 'functions/bracket-generate', { tournament_id: tournament.id })
    const matches = (
      await pool.query('SELECT * FROM matches WHERE tournament_id=$1 ORDER BY round,match_number', [
        tournament.id,
      ])
    ).rows
    await pool.query(
      "UPDATE matches SET scheduled_at='2026-10-12T18:00:00Z'::timestamptz+(match_number||' hours')::interval WHERE tournament_id=$1",
      [tournament.id],
    )
    const sides = (m: (typeof matches)[0]) => [
      players.find((p) => p.id === m.team1_id)!,
      players.find((p) => p.id === m.team2_id)!,
    ]
    for (const p of sides(matches[0]))
      await call(p, 'actions/submit_score', { p_match_id: matches[0].id, p_score1: 3, p_score2: 1 })
    await call(sides(matches[1])[0], 'actions/submit_score', {
      p_match_id: matches[1].id,
      p_score1: 2,
      p_score2: 0,
    })
    await call(sides(matches[1])[1], 'actions/submit_score', {
      p_match_id: matches[1].id,
      p_score1: 0,
      p_score2: 2,
    })
    await call(sides(matches[2])[0], 'actions/submit_score', {
      p_match_id: matches[2].id,
      p_score1: 1,
      p_score2: 0,
    })
    await call(organizer, 'data', {
      table: 'match_events',
      operation: 'insert',
      payload: {
        match_id: matches[0].id,
        event_type: 'comment',
        data: { description: 'Résultat confirmé par les deux joueurs.' },
      },
    })
    fixture = {
      organizer: organizer.token,
      captain: captain.token,
      player: sides(matches[2])[1].token,
      tournament: tournament.id,
      match: matches[2].id,
      completed: matches[0].id,
    }
  } finally {
    await pool.end()
  }
})

for (const width of [1366, 768, 390])
  test(`populated screens and tabs at ${width}px`, async ({ page, context }) => {
    test.setTimeout(120000)
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': `127.0.2.${[1366, 768, 390].indexOf(width) + 10}`,
    })
    const errors: string[] = [],
      overflows: unknown[] = [],
      rawLabels: string[] = []
    await mkdir('test-results/display', { recursive: true })
    await page.setViewportSize({ width, height: 900 })
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('response', async (response) => {
      if (response.url().includes('/api/') && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()} ${await response.text()}`)
    })
    async function signIn(token: string) {
      await context.clearCookies()
      await context.addCookies([
        { name: 'redak_session', value: token, url: 'http://localhost:5177' },
      ])
    }
    async function capture(name: string, route?: string, action?: (page: Page) => Promise<void>) {
      if (route) await page.goto(route)
      if (action) await action(page)
      await page.waitForTimeout(100)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('status', { name: 'Chargement', exact: true })).toHaveCount(0)
      await page.screenshot({
        path: `test-results/display/${width}-${name}.png`,
        animations: 'disabled',
      })
      const layout = await page.evaluate(() => {
        const main = document.querySelector('main')
        return {
          document: [document.documentElement.scrollWidth, innerWidth],
          main: main ? [main.scrollWidth, main.clientWidth] : [],
        }
      })
      if (layout.document[0] > layout.document[1] + 1 || layout.main[0] > layout.main[1] + 1)
        overflows.push({ name, ...layout })
      const untranslated = await page.locator('main').evaluate((main) =>
        Array.from(main.querySelectorAll('*'))
          .filter(
            (el) =>
              !el.children.length &&
              /^(single elimination|double elimination|round robin|ongoing|completed|disputed|pending|organizer|player|captain|NaN|undefined)$/i.test(
                el.textContent?.trim() ?? '',
              ),
          )
          .map((el) => el.textContent),
      )
      if (untranslated.length) rawLabels.push(`${name}: ${untranslated.join(', ')}`)
      await expect(page.locator('main')).not.toContainText('Cette page n’a pas pu être chargée')
    }
    await signIn(fixture.organizer)
    const root = `/app/tournaments/${fixture.tournament}`
    for (const [name, route] of [
      ['dashboard', '/app/dashboard'],
      ['tournaments', '/app/tournaments'],
      ['create', '/app/tournaments/create'],
      ['tournament', root],
      ['bracket', `${root}/bracket`],
      ['groups', `${root}/groups`],
      ['standings', `${root}/standings`],
      ['analytics', `${root}/analytics`],
      ['match', `/app/matches/${fixture.completed}`],
      ['calendar', '/app/calendar'],
      ['leaderboard', '/app/leaderboard'],
      ['broadcast', '/app/broadcast'],
      ['integrations', '/app/integrations'],
      ['profile', '/app/profile'],
      ['admin', '/app/admin'],
    ])
      await capture(name, route)
    await capture('admin-tournaments', undefined, (p) =>
      p.getByRole('button', { name: 'Tournois', exact: true }).click(),
    )
    if (width <= 900) await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    await page.getByTitle('Notifications', { exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'Notifications', exact: true })
    await expect(panel).toBeVisible()
    const panelBox = await panel.boundingBox()
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(width)
    await page.screenshot({
      path: `test-results/display/${width}-notifications.png`,
      animations: 'disabled',
    })
    await page.getByRole('button', { name: 'Fermer les notifications' }).click()
    if (width <= 900)
      await page.getByRole('button', { name: 'Fermer le menu', exact: true }).first().click()
    await signIn(fixture.captain)
    await capture('club', '/app/club')
    await capture('roster', undefined, (p) =>
      p.getByRole('button', { name: '👥 Roster', exact: true }).click(),
    )
    await capture('applications', undefined, (p) =>
      p.getByRole('button', { name: '📥 Candidatures', exact: true }).click(),
    )
    await signIn(fixture.player)
    await capture('scores', '/app/scores')
    await capture('score-entry', `/app/scores?match=${fixture.match}`)
    await capture('pending', undefined, (p) =>
      p.getByRole('button', { name: '⏳ En attente', exact: true }).click(),
    )
    await capture('disputes', undefined, (p) =>
      p.getByRole('button', { name: '⚠️ Litiges', exact: true }).click(),
    )
    await capture('history', undefined, (p) =>
      p.getByRole('button', { name: '📜 Historique', exact: true }).click(),
    )
    await capture('matchmaking', '/app/matchmaking')
    await context.clearCookies()
    await capture('public-match', `/matches/${fixture.completed}`)
    await writeFile(
      `test-results/display/report-${width}.json`,
      JSON.stringify({ errors, overflows, rawLabels }, null, 2),
    )
    expect.soft(errors).toEqual([])
    expect.soft(overflows).toEqual([])
    expect.soft(rawLabels).toEqual([])
  })
