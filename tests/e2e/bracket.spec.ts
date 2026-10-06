import { test, expect } from '@playwright/test'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { buildBracket, type Format } from '../../apps/api/src/brackets'

const connectionString =
  process.env.TEST_DATABASE_URL || 'postgresql://redak:redak_local@127.0.0.1:5440/redakesport_test'
if (!new URL(connectionString).pathname.endsWith('_test'))
  throw new Error('A test database is required')
const fixtures: {
  id: string
  format: Format
  n: number
  nodes: number
  edges: number
  champion?: string
}[] = []
test.beforeAll(async () => {
  const pool = new pg.Pool({ connectionString })
  try {
    const entrants = []
    for (let i = 0; i < 16; i++) {
      const id = randomUUID()
      await pool.query(
        'INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) VALUES($1,$2,$3,$4)',
        [id, `${id}@example.test`, 'unused', { username: `Joueur_${i + 1}_${id.slice(0, 4)}` }],
      )
      entrants.push({ id, type: 'player' as const })
    }
    const owner = entrants[0].id
    await pool.query("UPDATE profiles SET role='organizer',onboarding_completed=true WHERE id=$1", [
      owner,
    ])
    const game = (await pool.query('SELECT id FROM games WHERE is_active LIMIT 1')).rows[0].id
    for (const [format, n, finish] of [
      ['single_elimination', 16, false],
      ['single_elimination', 5, true],
      ['double_elimination', 5, false],
      ['double_elimination', 4, true],
      ['hybrid', 8, false],
    ] as const) {
      const id = randomUUID()
      await pool.query(
        "INSERT INTO tournaments(id,name,slug,organizer_id,game_id,format,team_size,max_teams,status,is_public) VALUES($1::uuid,$2,$1::text,$3,$4,$5,1,$6,'registration',true)",
        [id, `Coupe ${format} ${n}`, owner, game, format, n],
      )
      for (const entrant of entrants.slice(0, n))
        await pool.query(
          "INSERT INTO tournament_registrations(tournament_id,player_id,status) VALUES($1,$2,'approved')",
          [id, entrant.id],
        )
      const plan = buildBracket(entrants.slice(0, n), id, format)
      await pool.query('SELECT public.install_bracket($1,$2,$3)', [owner, id, plan])
      if (finish) {
        while (true) {
          const match = (
            await pool.query(
              "SELECT id,bracket_position FROM matches WHERE tournament_id=$1 AND status='pending' AND team1_id IS NOT NULL AND team2_id IS NOT NULL ORDER BY round LIMIT 1",
              [id],
            )
          ).rows[0]
          if (!match) break
          await pool.query('SELECT private.finish_match($1,$2,$3)', [
            match.id,
            match.bracket_position.side === 'grand_final' ? 0 : 2,
            match.bracket_position.side === 'grand_final' ? 2 : 0,
          ])
        }
      }
      const champion = finish
        ? (
            await pool.query(
              'SELECT username FROM standings JOIN profiles ON profiles.id=standings.team_id WHERE tournament_id=$1 AND position=1',
              [id],
            )
          ).rows[0]?.username
        : undefined
      const nodes = plan.matches.filter((m) => m.bracket_position.side !== 'group')
      fixtures.push({
        id,
        format,
        n,
        nodes: nodes.length,
        edges:
          nodes.reduce((n, m) => n + Number(!!m.next_match_id) + Number(!!m.loser_match_id), 0) +
          Number(format === 'double_elimination'),
        champion,
      })
    }
  } finally {
    await pool.end()
  }
})

for (const width of [1366, 390])
  test(`connected bracket, controls and final standings at ${width}px`, async ({
    page,
    context,
  }) => {
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': width === 1366 ? '127.0.3.10' : '127.0.3.11',
    })
    await page.setViewportSize({ width, height: 900 })
    await mkdir('test-results/bracket', { recursive: true })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`)
    })
    for (const fixture of fixtures) {
      await page.goto(`/tournaments/${fixture.id}/bracket`)
      const viewport = page.getByRole('region', { name: 'Tableau des rencontres', exact: true })
      await expect(viewport).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-bracket-match]')).toHaveCount(fixture.nodes)
      await expect(page.locator('[data-bracket-edge]')).toHaveCount(fixture.edges)
      if (fixture.format === 'hybrid')
        await expect(viewport.getByText('1er du groupe A')).toBeVisible()
      else await expect(viewport.getByText(/^Joueur_/).first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText('undefined')
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBeTruthy()
      if (fixture.format !== 'double_elimination') {
        await page.getByRole('button', { name: 'Arbre classique', exact: true }).click()
        await expect(page.locator('[data-bracket-edge]')).toHaveCount(fixture.edges)
        await page.getByRole('button', { name: 'Arbre symétrique', exact: true }).click()
      }
      if (fixture.format === 'single_elimination' && fixture.n === 16) {
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({
          path: `test-results/bracket/default-zoom-${width}.png`,
          fullPage: true,
        })
      }
      await page.getByLabel('Zoom du tableau').selectOption('0.5')
      await page.getByRole('button', { name: 'Centrer la finale', exact: true }).click()
      await expect
        .poll(async () => {
          const final = await page.locator('.bracket-match.is-final').boundingBox(),
            area = await viewport.boundingBox()
          return (
            !!final &&
            !!area &&
            final.x >= area.x - 1 &&
            final.x + final.width <= area.x + area.width + 1
          )
        })
        .toBeTruthy()
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({
        path: `test-results/bracket/${fixture.format}-${fixture.n}-${width}.png`,
        fullPage: true,
      })
      if (fixture.format === 'single_elimination' && fixture.n === 5) {
        await page.locator('[data-bracket-match]').filter({ hasText: 'Exemption' }).first().click()
        await expect(page.getByText('Qualification par exemption').first()).toBeVisible()
        await expect(page.locator('.match-score')).not.toContainText('0')
        await page.goto(`/tournaments/${fixture.id}/bracket`)
      }
      if (fixture.champion) {
        await page.getByRole('link', { name: 'Voir le classement final' }).click()
        await expect(page.locator('tbody tr').first()).toContainText(fixture.champion)
        await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('1')
      } else {
        await page.locator('.bracket-match.is-final').click()
        await expect(page).toHaveURL(/\/matches\//)
      }
    }
    expect(errors).toEqual([])
  })
