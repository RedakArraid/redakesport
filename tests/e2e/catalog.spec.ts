import { test, expect } from '@playwright/test'
import pg from 'pg'
import { createHash, randomBytes, randomUUID } from 'node:crypto'

test('FC27 is selectable and the tournament game filter works on mobile', async ({
  page,
  context,
}) => {
  const connectionString =
    process.env.TEST_DATABASE_URL ||
    'postgresql://redak:redak_local@127.0.0.1:5440/redakesport_test'
  if (!new URL(connectionString).pathname.endsWith('_test'))
    throw new Error('A test database is required')
  const pool = new pg.Pool({ connectionString }),
    organizer = randomUUID(),
    token = randomBytes(32).toString('base64url')
  const ids = [randomUUID(), randomUUID()]
  const names = [`Catalogue FC27 ${ids[0].slice(0, 6)}`, `Archives FC26 ${ids[1].slice(0, 6)}`]
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    const games = (
      await pool.query("SELECT id,slug FROM games WHERE slug IN ('ea-fc-26','ea-fc-27')")
    ).rows
    const fc27 = games.find((g) => g.slug === 'ea-fc-27').id
    const fc26 = games.find((g) => g.slug === 'ea-fc-26').id
    await pool.query(
      'INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) VALUES($1,$2,$3,$4)',
      [
        organizer,
        `${organizer}@example.test`,
        'fixture',
        { username: `catalog_${organizer.slice(0, 8)}` },
      ],
    )
    await pool.query("UPDATE profiles SET role='organizer',onboarding_completed=true WHERE id=$1", [
      organizer,
    ])
    for (const [i, game] of [fc27, fc26].entries())
      await pool.query(
        "INSERT INTO tournaments(id,name,slug,organizer_id,game_id,format,status,team_size,best_of) VALUES($1,$2,$3,$4,$5,'single_elimination','registration',1,3)",
        [ids[i], names[i], ids[i], organizer, game],
      )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/tournaments')
    await page.getByLabel('Jeu', { exact: true }).selectOption(fc27)
    await expect(page.getByRole('link').filter({ hasText: names[0] })).toContainText(
      'EA SPORTS FC 27 · BO3',
    )
    await expect(page.getByText(names[1], { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Inscriptions', exact: true }).click()
    await expect(page.getByText(names[0], { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: 'test-results/fc27-catalog-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.getByLabel('Jeu', { exact: true }).selectOption(fc26)
    await expect(page.getByText(names[1], { exact: true })).toBeVisible()
    await expect(page.getByText(names[0], { exact: true })).toHaveCount(0)
    await pool.query(
      "INSERT INTO auth.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
      [createHash('sha256').update(token).digest('hex'), organizer],
    )
    await context.addCookies([
      { name: 'redak_session', value: token, domain: 'localhost', path: '/' },
    ])
    await page.goto('/app/tournaments/create')
    await page.getByLabel('Jeu', { exact: true }).selectOption(fc27)
    await expect(page.getByLabel('Jeu', { exact: true })).toHaveValue(fc27)
    await page.goto('/app/matchmaking')
    await page.getByLabel('Jeu', { exact: true }).selectOption(fc27)
    await expect(page.getByLabel('Jeu', { exact: true })).toHaveValue(fc27)
    expect(errors).toEqual([])
  } finally {
    await pool.query('DELETE FROM tournaments WHERE id=ANY($1)', [ids])
    await pool.query('DELETE FROM auth.users WHERE id=$1', [organizer])
    await pool.end()
  }
})
