import { test, expect, type Page } from '@playwright/test'

async function mockServices(page: Page, enabled: boolean) {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { discordEnabled: enabled, passwordResetEnabled: enabled },
    }),
  )
}

for (const width of [1366, 390]) {
  test(`unavailable authentication services do not lead to dead ends at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await mockServices(page, false)
    const attemptedServices: string[] = []
    page.on('request', (request) => {
      if (/\/api\/auth\/(discord|forgot-password)/.test(request.url()))
        attemptedServices.push(request.url())
    })

    await page.goto('/login')
    await expect(
      page.getByText('Mot de passe oublié ? La récupération par email est indisponible.'),
    ).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'Continuer avec Discord' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeEnabled()
    await expect(page.getByLabel('Email', { exact: true })).toBeEditable()

    await page.getByRole('main').getByRole('link', { name: "S'inscrire", exact: true }).click()
    await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Continuer avec Discord' })).toHaveCount(0)
    await expect(page.getByLabel('Pseudo')).toBeEditable()

    await page.goto('/forgot-password')
    await expect(page.getByRole('status')).toContainText(
      'La récupération par email n’est pas disponible.',
    )
    await expect(page.getByRole('button', { name: 'Envoyer le lien' })).toHaveCount(0)
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('link', { name: 'Revenir à la connexion' }).click()
    await expect(page).toHaveURL('/login')
    expect(attemptedServices).toEqual([])
  })
}

test('configured services offer Discord and email recovery', async ({ page }) => {
  await mockServices(page, true)
  await page.route('**/api/auth/forgot-password', (route) => route.fulfill({ json: { ok: true } }))
  await page.route('**/api/auth/discord', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Discord OAuth</p>' }),
  )

  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Continuer avec Discord' })).toBeVisible({
    timeout: 15_000,
  })
  await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click()
  await expect(
    page.getByRole('heading', { name: 'Mot de passe oublié', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill('recovery@example.test')
  const recoveryRequest = page.waitForRequest('**/api/auth/forgot-password')
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()
  expect((await recoveryRequest).postDataJSON()).toEqual({ email: 'recovery@example.test' })
  await expect(page.getByRole('status')).toHaveText('Si ce compte existe, un lien a été envoyé.')

  await page.goto('/register')
  await page.getByRole('button', { name: 'Continuer avec Discord' }).click()
  await expect(page).toHaveURL('/api/auth/discord')
})

test('an existing recovery token works even without email delivery', async ({ page }) => {
  const token = 'already-issued-token-with-valid-length-12345'
  await mockServices(page, false)
  await page.route('**/api/auth/reset-password', (route) => route.fulfill({ json: { ok: true } }))
  await page.goto(`/reset-password?token=${token}`)
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('NewPassword!2026')
  const resetRequest = page.waitForRequest('**/api/auth/reset-password')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  expect((await resetRequest).postDataJSON()).toEqual({
    token,
    password: 'NewPassword!2026',
  })
  await expect(page.getByRole('status')).toHaveText('Mot de passe modifié. Connecte-toi à nouveau.')
})

test('invalid recovery links lead back to requesting a new link without submitting a password', async ({
  page,
}) => {
  const resetRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/auth/reset-password')) resetRequests.push(request.url())
  })
  await mockServices(page, true)
  for (const suffix of ['', '?token=invalid']) {
    await page.goto(`/reset-password${suffix}`)
    await expect(page.getByRole('alert')).toHaveText(
      'Ce lien de réinitialisation est incomplet ou invalide.',
    )
    await expect(page.getByLabel('Nouveau mot de passe', { exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Demander un nouveau lien' }).click()
    await expect(page).toHaveURL('/forgot-password')
    await expect(page.getByLabel('Email', { exact: true })).toBeEditable()
  }
  expect(resetRequests).toEqual([])
})

test('registration can retry unavailable authentication options while keeping email signup usable', async ({
  page,
}) => {
  let available = false
  await page.route('**/api/config', (route) =>
    available
      ? route.fulfill({ json: { discordEnabled: true, passwordResetEnabled: true } })
      : route.fulfill({ status: 503, json: { error: 'Service momentanément indisponible' } }),
  )
  await page.goto('/register')
  await expect(page.getByRole('main').getByRole('status')).toContainText(
    'Les autres options d’inscription sont temporairement indisponibles.',
  )
  await expect(page.getByLabel('Pseudo')).toBeEditable()
  await expect(page.getByRole('button', { name: 'Créer mon compte', exact: true })).toBeEnabled()
  available = true
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continuer avec Discord' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('status')).toHaveCount(0)
})

test('requesting a new recovery link clears an expired token error', async ({ page }) => {
  await mockServices(page, true)
  await page.route('**/api/auth/reset-password', (route) =>
    route.fulfill({ status: 400, json: { error: 'Lien expiré ou invalide' } }),
  )
  await page.goto(`/reset-password?token=${'expired-token-'.repeat(3)}`)
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('NewPassword!2026')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Lien expiré ou invalide')
  await page.getByRole('link', { name: 'Demander un nouveau lien' }).click()
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Envoyer le lien' })).toBeEnabled()
})

test('an unavailable configuration can be retried without exposing a broken recovery form', async ({
  page,
}) => {
  let available = false
  await page.route('**/api/config', (route) =>
    available
      ? route.fulfill({ json: { discordEnabled: false, passwordResetEnabled: true } })
      : route.fulfill({ status: 503, json: { error: 'Service momentanément indisponible' } }),
  )
  await page.goto('/forgot-password')
  await expect(
    page.getByText('Le service de récupération est temporairement inaccessible.'),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Envoyer le lien' })).toHaveCount(0)
  available = true
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable()
  await expect(page.getByRole('button', { name: 'Envoyer le lien' })).toBeEnabled()
})
