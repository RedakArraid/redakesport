import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadConfig } from '../apps/api/src/config.mjs'

const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://redak:0123456789abcdef0123456789abcdef@db:5432/redakesport',
  APP_ORIGIN: 'https://esport.example.test',
  TRUST_PROXY: 'true',
}

test('development keeps local defaults and optional providers disabled', () => {
  const config = loadConfig({})
  assert.equal(config.origin, 'http://localhost:5173')
  assert.equal(config.production, false)
  assert.equal(config.trustProxy, false)
  assert.equal(config.discordEnabled, false)
  assert.equal(config.passwordResetEnabled, false)
  assert.equal(config.smtp.requireTLS, false)
})

test('production requires an explicit database and HTTPS public origin', () => {
  for (const name of ['DATABASE_URL', 'APP_ORIGIN']) {
    assert.throws(() => loadConfig({ ...production, [name]: '' }), new RegExp(name))
  }
  assert.throws(
    () => loadConfig({ ...production, APP_ORIGIN: 'http://esport.example.test' }),
    /HTTPS/,
  )
  assert.equal(
    loadConfig({ ...production, APP_ORIGIN: production.APP_ORIGIN + '/' }).origin,
    production.APP_ORIGIN,
  )
  for (const suffix of ['/app', '/?query=1', '/#fragment']) {
    assert.throws(
      () => loadConfig({ ...production, APP_ORIGIN: production.APP_ORIGIN + suffix }),
      /APP_ORIGIN/,
    )
  }
  assert.throws(
    () => loadConfig({ ...production, APP_ORIGIN: 'https://user:password@esport.example.test' }),
    /APP_ORIGIN/,
  )
})

test('production rejects weak or example database credentials without exposing secrets', () => {
  for (const password of [
    'redak_local',
    'postgres',
    'x'.repeat(64),
    'change_me_0123456789abcdef0123456789',
  ]) {
    assert.throws(
      () =>
        loadConfig({ ...production, DATABASE_URL: `postgres://redak:${password}@db/redakesport` }),
      (error) => {
        assert.match(error.message, /DATABASE_URL/)
        assert.ok(!error.message.includes(password))
        return true
      },
    )
  }
  for (const databaseUrl of ['invalid', 'https://db/redakesport', 'postgresql://db']) {
    assert.throws(() => loadConfig({ ...production, DATABASE_URL: databaseUrl }), /DATABASE_URL/)
  }
  assert.equal(loadConfig(production).databaseUrl, production.DATABASE_URL)
})

test('production can start without optional providers but rejects partial credentials', () => {
  const config = loadConfig(production)
  assert.equal(config.trustProxy, true)
  assert.equal(config.discordEnabled, false)
  assert.equal(config.twitchEnabled, false)
  assert.equal(config.passwordResetEnabled, false)
  for (const name of [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'TWITCH_CLIENT_ID',
    'TWITCH_ACCESS_TOKEN',
    'SMTP_USER',
    'SMTP_PASSWORD',
  ]) {
    assert.throws(() => loadConfig({ ...production, [name]: 'configured' }), /Configuration/)
  }
  assert.equal(
    loadConfig({
      ...production,
      DISCORD_CLIENT_ID: 'test-client',
      DISCORD_CLIENT_SECRET: 'test-secret',
    }).discordEnabled,
    true,
  )
})

test('email configuration requires an explicit sender and defaults to encrypted delivery in production', () => {
  assert.throws(() => loadConfig({ ...production, SMTP_HOST: 'smtp.example.test' }), /SMTP_FROM/)
  assert.throws(() => loadConfig({ ...production, SMTP_FROM: 'mail@example.test' }), /SMTP_HOST/)
  const config = loadConfig({
    ...production,
    SMTP_HOST: 'smtp.example.test',
    SMTP_FROM: 'Redak <mail@example.test>',
  })
  assert.equal(config.passwordResetEnabled, true)
  assert.equal(config.smtp.requireTLS, true)
  assert.equal(config.smtp.secure, false)
  assert.equal(config.smtp.port, 587)
  const local = loadConfig({ SMTP_HOST: 'mailpit', SMTP_PORT: '1025' })
  assert.equal(local.smtp.port, 1025)
  assert.equal(local.smtp.requireTLS, false)
})

test('ports and booleans reject accidental deployment typos', () => {
  for (const name of ['PORT', 'SMTP_PORT']) {
    for (const value of ['0', '65536', '587oops', '3.14']) {
      assert.throws(() => loadConfig({ [name]: value }), new RegExp(name))
    }
  }
  for (const name of ['TRUST_PROXY', 'SMTP_SECURE', 'SMTP_REQUIRE_TLS']) {
    assert.throws(() => loadConfig({ [name]: 'yes' }), new RegExp(name))
  }
})
