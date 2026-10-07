import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': '127.0.9.32' })
  const suffix = randomUUID().slice(0, 8)
  const signup = await page.request.post('/api/auth/register', {
    data: {
      username: `Etat_${suffix}`,
      email: `etat-${suffix}@example.test`,
      password: 'Strong-password-2026',
    },
  })
  expect(signup.ok(), await signup.text()).toBeTruthy()
  const onboarding = await page.request.post('/api/actions/complete_onboarding', {
    data: { p_role: 'player', p_country: null },
  })
  expect(onboarding.ok(), await onboarding.text()).toBeTruthy()
  await page.setViewportSize({ width: 320, height: 844 })
})

test('calendar errors stay distinct from an empty schedule and can be retried', async ({
  page,
}) => {
  let failure: 'matches' | 'club_members' | null = 'matches'
  await page.route('**/api/data', async (route) => {
    const table = route.request().postDataJSON().table
    if (table === failure)
      return route.fulfill({
        status: 503,
        json: { error: { message: 'Indisponibilité temporaire' } },
      })
    if (table === 'matches' || table === 'club_members')
      return route.fulfill({ json: { data: [], error: null } })
    await route.continue()
  })
  await page.goto('/app/calendar')
  await expect(page.getByRole('heading', { name: 'Calendrier indisponible' })).toBeVisible()
  await expect(page.getByText('Aucun match programmé', { exact: true })).toHaveCount(0)
  failure = null
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByText('Aucun match programmé', { exact: true })).toBeVisible()

  failure = 'club_members'
  await page.reload()
  await page.getByRole('button', { name: 'Mes matches', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Calendrier indisponible' })).toBeVisible()
  await expect(page.getByText('Aucun match programmé', { exact: true })).toHaveCount(0)
  failure = null
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByText('Aucun match programmé', { exact: true })).toBeVisible()
})

test('calendar export reports an empty schedule and excludes unplayed cancelled matches', async ({
  page,
}) => {
  let populated = false
  const matches = [
    { id: 'cancelled-pending', tournament_id: 'cancelled', status: 'pending' },
    { id: 'cancelled-completed', tournament_id: 'cancelled', status: 'completed' },
    { id: 'ongoing-pending', tournament_id: 'ongoing', status: 'pending' },
  ].map((match) => ({
    ...match,
    scheduled_at: '2026-10-08T12:00:00Z',
    team1_id: null,
    team2_id: null,
  }))
  await page.route('**/api/data', async (route) => {
    const query = route.request().postDataJSON()
    if (query.table === 'matches')
      return route.fulfill({ json: { data: populated ? matches : [], error: null } })
    if (query.table === 'tournaments' && query.select === 'id,name,status')
      return route.fulfill({
        json: {
          data: [
            { id: 'cancelled', name: 'Tournoi annulé', status: 'cancelled' },
            { id: 'ongoing', name: 'Tournoi actif', status: 'ongoing' },
          ],
          error: null,
        },
      })
    await route.continue()
  })
  await page.goto('/app/integrations')
  await page.getByRole('button', { name: 'Calendrier', exact: true }).click()
  const download = page.getByRole('button', { name: /Télécharger iCal/ })
  await download.click()
  await expect(page.getByText('Aucun match programmé à exporter.', { exact: true })).toBeVisible()
  populated = true
  const downloaded = page.waitForEvent('download')
  await download.click()
  const file = await downloaded
  const ics = await readFile((await file.path())!, 'utf8')
  expect(ics).not.toContain('UID:cancelled-pending@')
  expect(ics).toContain('UID:cancelled-completed@')
  expect(ics).toContain('UID:ongoing-pending@')
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  await expect(page.getByText('Aucun match programmé à exporter.', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})
