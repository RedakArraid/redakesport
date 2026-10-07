import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

test('mobile drawer keeps keyboard focus visible and restores navigation after closing', async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': '127.0.9.31' })
  const suffix = randomUUID().slice(0, 8)
  const signup = await page.request.post('/api/auth/register', {
    data: {
      username: `Nav_${suffix}`,
      email: `nav-${suffix}@example.test`,
      password: 'Strong-password-2026',
    },
  })
  expect(signup.ok(), await signup.text()).toBeTruthy()
  const onboard = await page.request.post('/api/actions/complete_onboarding', {
    data: { p_role: 'player', p_country: null },
  })
  expect(onboard.ok(), await onboard.text()).toBeTruthy()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/dashboard')
  const toggle = page.locator('.mobile-header button')
  const drawer = page.locator('#app-navigation')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(drawer).toHaveAttribute('inert', '')
  await toggle.focus()
  await page.keyboard.press('Tab')
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('#app-navigation')),
  ).toBeFalsy()

  await toggle.click()
  await expect(drawer.locator('.brand-link')).toBeFocused()
  await expect(page.locator('main')).toHaveAttribute('inert', '')
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await drawer.getByRole('button', { name: 'Déconnexion', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('.mobile-header .brand-link')).toBeFocused()
  const notifications = drawer.getByRole('button', { name: 'Notifications', exact: true })
  await notifications.click()
  const closeNotifications = page.getByRole('button', { name: 'Fermer les notifications' })
  await expect(closeNotifications).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(closeNotifications).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toHaveCount(0)
  await expect(notifications).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toBeFocused()
  await expect(page.locator('main')).not.toHaveAttribute('inert')
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')

  await toggle.click()
  await drawer.getByRole('link', { name: 'Calendrier', exact: true }).click()
  await expect(page).toHaveURL(/app\/calendar/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toBeFocused()
  await toggle.click()
  await page.setViewportSize({ width: 1366, height: 900 })
  await expect(drawer).not.toHaveAttribute('inert')
  await expect(page.locator('main')).not.toHaveAttribute('inert')
  await expect(page.locator('.menu-backdrop')).toHaveCount(0)
  await page.setViewportSize({ width: 320, height: 844 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(drawer).toHaveAttribute('inert', '')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})
