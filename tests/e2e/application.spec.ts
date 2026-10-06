import { test, expect } from '@playwright/test'
const suffix = Date.now().toString(36)
async function register(page: import('@playwright/test').Page, role: string, name: string) {
  await page.goto('/register')
  await page.getByLabel('Pseudo').fill(`${name}_${suffix}`)
  await page.getByLabel('Email').fill(`${name}_${suffix}@example.test`)
  await page.getByLabel('Mot de passe').fill('Strong-password-2026')
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click()
  await expect(page).toHaveURL(/onboarding/)
  await page.getByRole('radio').filter({ hasText: role }).click()
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(page).toHaveURL(/app\/dashboard/)
}
test('public pages, login validation and mobile layout', async ({ page }) => {
  const errors: string[] = []
  page.on('response', (r) => {
    if (r.url().includes('/api/data') && r.status() >= 400)
      errors.push(`API ${r.status()} ${r.url()}`)
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('esport')
  await page.getByRole('button', { name: 'Explorer les tournois' }).click()
  await expect(page).toHaveURL('/tournaments')
  await page.goto('/login')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByText('Email invalide')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/public-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})
test('organizer creates and publishes a tournament, then all account pages load', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('response', (r) => {
    if (r.url().includes('/api/data') && r.status() >= 400)
      errors.push(`API ${r.status()} ${r.url()}`)
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await register(page, 'Organisateur', 'organizer')
  await page.goto('/app/tournaments/create')
  await page.getByPlaceholder('Redak Cup 2026').fill(`Coupe navigateur ${suffix}`)
  await page.locator('select[name="game_id"]').selectOption({ index: 1 })
  await page.locator('input[name="team_size"]').fill('1')
  await page.getByLabel('Format des matchs', { exact: true }).selectOption('3')
  await page.getByRole('button', { name: 'Créer le tournoi', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: `Coupe navigateur ${suffix}`, exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Format : Élimination simple · BO3')).toBeVisible()
  await page.getByRole('button', { name: 'Ouvrir les inscriptions', exact: true }).click()
  await expect(page.getByRole('button', { name: /Lancer le tournoi/ })).toBeVisible()
  const tournamentPath = new URL(page.url()).pathname
  for (const view of ['bracket', 'standings', 'groups', 'analytics']) {
    await page.goto(`${tournamentPath}/${view}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main')).not.toContainText('Cette page n’a pas pu être chargée')
  }
  for (const route of [
    'club',
    'scores',
    'matchmaking',
    'calendar',
    'leaderboard',
    'broadcast',
    'integrations',
    'admin',
    'profile',
  ]) {
    await page.goto(`/app/${route}`)
    await expect(page.locator('main')).not.toContainText('Cette page n’a pas pu être chargée')
    await page.waitForTimeout(150)
  }
  expect(errors).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/dashboard')
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await expect(page.getByRole('link', { name: 'Tournois', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Tournois', exact: true }).click()
  await expect(page).toHaveURL('/app/tournaments')
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: 'test-results/account-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await page.getByTitle('Déconnexion').click()
  await expect(page).toHaveURL(/login/)
  await page.goto('/app/profile')
  await expect(page).toHaveURL(/login/)
})
test('captain creates a club and manages its roster', async ({ page }) => {
  await register(page, 'Capitaine', 'captain')
  await page.goto('/app/club')
  await page
    .getByPlaceholder('Ex: Team Vitality, Karmine Corp...')
    .fill(`Club navigateur ${suffix}`)
  await page.getByRole('button', { name: /Créer/ }).click()
  await expect(page.getByText(`Club navigateur ${suffix}`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '👥 Roster' }).click()
  await expect(page.getByText(`captain_${suffix}`, { exact: true }).last()).toBeVisible()
})
