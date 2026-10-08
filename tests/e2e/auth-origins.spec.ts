import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

for (const [index, hostname] of ['localhost', '127.0.0.1'].entries()) {
  test(`login, persistent session and logout work on ${hostname}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': `127.0.9.${41 + index}` })
    const origin = new URL(baseURL!)
    origin.hostname = hostname
    const suffix = randomUUID().slice(0, 8)
    const email = `origin-${suffix}@example.test`
    const password = 'Strong-password-2026'
    const signup = await page.request.post(`${origin.origin}/api/auth/register`, {
      headers: { origin: origin.origin },
      data: { username: `Origin_${suffix}`, email, password },
    })
    expect(signup.ok(), await signup.text()).toBeTruthy()
    const onboard = await page.request.post(`${origin.origin}/api/actions/complete_onboarding`, {
      headers: { origin: origin.origin },
      data: { p_role: 'player', p_country: null },
    })
    expect(onboard.ok(), await onboard.text()).toBeTruthy()
    await context.clearCookies()

    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`)
    })
    await page.goto(`${origin.origin}/login`)
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await expect(page).toHaveURL(`${origin.origin}/app/dashboard`)
    await expect(page.getByRole('button', { name: 'Déconnexion', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Déconnexion', exact: true })).toBeVisible()
    await expect(page).toHaveURL(`${origin.origin}/app/dashboard`)
    await page.getByRole('button', { name: 'Déconnexion', exact: true }).click()
    await expect(page).toHaveURL(`${origin.origin}/login`)
    await page.goto(`${origin.origin}/app/dashboard`)
    await expect(page).toHaveURL(`${origin.origin}/login`)
    expect(errors).toEqual([])
  })
}
