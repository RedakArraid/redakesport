import { test, expect } from '@playwright/test'
import pg from 'pg'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir } from 'node:fs/promises'
import type { Match, Tournament } from '../../apps/web/src/types/database'

const connectionString =
  process.env.TEST_DATABASE_URL || 'postgresql://redak:redak_local@127.0.0.1:5440/redakesport_test'
if (!new URL(connectionString).pathname.endsWith('_test'))
  throw new Error('A test database is required')
let tournaments: (Tournament & { matches: Match[]; groups: { id: string; name: string }[] })[]

test.beforeAll(async () => {
  test.setTimeout(120000)
  await promisify(execFile)(process.execPath, ['apps/api/src/seed-demo.mjs'], {
    env: { ...process.env, DATABASE_URL: connectionString, NODE_ENV: 'test' },
    timeout: 110000,
  })
  const pool = new pg.Pool({ connectionString })
  try {
    tournaments = (
      await pool.query(
        "SELECT * FROM tournaments WHERE settings->>'demo_seed'='fc27-demo-v1' ORDER BY slug",
      )
    ).rows
    for (const t of tournaments) {
      t.matches = (
        await pool.query('SELECT * FROM matches WHERE tournament_id=$1 ORDER BY match_number', [
          t.id,
        ])
      ).rows
      t.groups = (
        await pool.query('SELECT id,name FROM groups WHERE tournament_id=$1 ORDER BY name', [t.id])
      ).rows
    }
  } finally {
    await pool.end()
  }
})

for (const width of [1366, 390])
  test(`all 14 tournament displays, groups and match states at ${width}px`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000)
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': width === 1366 ? '127.0.6.10' : '127.0.6.11',
    })
    const login = await context.request.post('/api/auth/login', {
      data: { email: 'organisateur@example.test', password: 'RedakTest!2026' },
    })
    expect(login.ok()).toBe(true)
    await page.setViewportSize({ width, height: 1000 })
    await mkdir('test-results/tournament-brackets', { recursive: true })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    expect(tournaments).toHaveLength(14)
    for (const t of tournaments) {
      await page.goto(`/app/tournaments/${t.id}/bracket`)
      await expect(page.locator('.bracket-tournament-name')).toHaveText(t.name, { timeout: 15000 })
      const displayed = t.matches.filter(
        (m) => !(m.bracket_position?.side === 'reset' && m.status === 'completed' && !m.team1_id),
      )
      await expect(page.locator('main a[href^="/app/matches/"]')).toHaveCount(displayed.length)
      if (displayed.length) await expect(page.locator('main')).not.toContainText(/\bParticipant\b/)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth + 1 &&
            document.querySelector('main')!.scrollWidth <=
              document.querySelector('main')!.clientWidth + 1,
        ),
      ).toBe(true)
      const cards = await page
        .locator('[data-bracket-match], [data-round-match]')
        .evaluateAll((elements) =>
          elements.map((el) => ({
            id: el.getAttribute('data-bracket-match') || el.getAttribute('data-round-match'),
            label: el.querySelector('.bracket-match-heading')?.textContent,
            scores: [...el.querySelectorAll('.bracket-team strong')].map((n) => n.textContent),
            overflow: el.scrollWidth > el.clientWidth + 1,
          })),
        )
      expect(cards.map((c) => c.id).sort()).toEqual(displayed.map((m) => m.id).sort())
      for (const m of displayed) {
        const card = cards.find((c) => c.id === m.id)!
        expect(card.overflow).toBe(false)
        const scoresVisible =
          (t.status !== 'cancelled' || m.status === 'completed') &&
          ['completed', 'live'].includes(m.status) &&
          m.team1_id &&
          m.team2_id
        expect(card.scores).toEqual(
          scoresVisible ? [String(m.score_team1), String(m.score_team2)] : ['–', '–'],
        )
        if (t.status === 'cancelled' && m.status !== 'completed')
          expect(card.label).toContain('Non joué')
        else if (m.result_kind === 'forfeit') expect(card.label).toContain('Forfait')
        else if (m.status === 'completed' && m.winner_id && !m.team2_id)
          expect(card.label).toContain('Exemption')
        else if (m.bracket_position?.side === 'reset' && !m.team1_id)
          expect(card.label).toContain('Si nécessaire')
      }
      for (const group of t.groups) {
        const section = page.getByRole('region', { name: group.name, exact: true })
        await expect(section).toBeVisible()
        expect(
          await section
            .locator('[data-round-match]')
            .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-group-id'))),
        ).toEqual(t.matches.filter((m) => m.group_id === group.id).map(() => group.id))
      }
      if (t.format === 'hybrid' && t.matches.length) {
        await expect(page.getByRole('heading', { name: 'Phase finale', exact: true })).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Phase de poules', exact: true }),
        ).toBeVisible()
      }
      if (t.format === 'double_elimination') {
        await page.getByRole('button', { name: 'Voir les repêchages', exact: true }).click()
        const firstLower = t.matches.find((m) => m.bracket_position?.side === 'losers')!
        await expect
          .poll(async () => {
            const card = await page.locator(`[data-bracket-match="${firstLower.id}"]`).boundingBox()
            const viewport = await page.locator('.bracket-viewport').boundingBox()
            return (
              !!card &&
              !!viewport &&
              card.y >= viewport.y &&
              card.y + card.height <= viewport.y + viewport.height
            )
          })
          .toBeTruthy()
        await page.getByRole('button', { name: 'Tableau principal', exact: true }).click()
      }
      if (t.status === 'draft')
        await expect(page.locator('main')).toContainText('Tournoi en préparation')
      if (t.status === 'registration')
        await expect(page.locator('main')).toContainText('Les inscriptions sont ouvertes')
      await page.screenshot({
        path: `test-results/tournament-brackets/${t.slug}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      })
    }
    expect(errors).toEqual([])
    // Access errors and network failures must never look like an empty, not-yet-launched bracket.
    await context.clearCookies()
    const draft = tournaments.find((t) => t.status === 'draft')!
    await page.goto(`/tournaments/${draft.id}/bracket`)
    await expect(page.getByRole('heading', { name: 'Tableau indisponible' })).toBeVisible()
    await page.route('**/api/data', async (route) => {
      if (route.request().postDataJSON()?.table === 'matches')
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Test : API indisponible' } }),
        })
      else await route.continue()
    })
    await page.goto(`/tournaments/${tournaments.find((t) => t.status === 'ongoing')!.id}/bracket`)
    await expect(
      page.getByText('Les rencontres n’ont pas pu être chargées.', { exact: false }),
    ).toBeVisible()
  })
