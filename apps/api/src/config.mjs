const developmentDatabase = 'postgresql://redak:redak_local@127.0.0.1:5440/redakesport'

function settingError(name, detail) {
  // Never include the value: configuration errors may be written to deployment logs.
  throw new Error(`Configuration ${name} invalide : ${detail}`)
}

function booleanSetting(env, name, fallback = false) {
  const value = env[name]
  if (value === undefined || value === '') return fallback
  if (value !== 'true' && value !== 'false') settingError(name, 'utiliser true ou false')
  return value === 'true'
}

function portSetting(env, name, fallback) {
  const value = env[name] || String(fallback)
  const port = Number(value)
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 1 || port > 65535)
    settingError(name, 'port attendu entre 1 et 65535')
  return port
}

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production'
  const databaseUrl = env.DATABASE_URL || developmentDatabase
  if (production && !env.DATABASE_URL) settingError('DATABASE_URL', 'obligatoire en production')
  let database
  try {
    database = new URL(databaseUrl)
  } catch {
    settingError('DATABASE_URL', 'URL PostgreSQL attendue')
  }
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    !database.hostname ||
    database.pathname.length < 2
  )
    settingError('DATABASE_URL', 'URL PostgreSQL avec serveur et nom de base attendue')
  if (production) {
    let password
    try {
      password = decodeURIComponent(database.password)
    } catch {
      settingError('DATABASE_URL', 'encodage du mot de passe invalide')
    }
    if (!database.username || password.length < 24 || new Set(password).size < 8)
      settingError(
        'DATABASE_URL',
        'utilisateur et mot de passe aléatoire de 24 caractères minimum requis',
      )
    if (/redak_local|changeme|change.me|replace.me|your.password|example.password/i.test(password))
      settingError('DATABASE_URL', 'remplacer le mot de passe exemple')
  }

  if (production && !env.APP_ORIGIN) settingError('APP_ORIGIN', 'obligatoire en production')
  let appUrl
  try {
    appUrl = new URL(env.APP_ORIGIN || 'http://localhost:5173')
  } catch {
    settingError('APP_ORIGIN', 'origine HTTP ou HTTPS attendue')
  }
  if (
    !['http:', 'https:'].includes(appUrl.protocol) ||
    appUrl.username ||
    appUrl.password ||
    appUrl.pathname !== '/' ||
    appUrl.search ||
    appUrl.hash
  )
    settingError('APP_ORIGIN', 'origine seule, sans identifiants, chemin ni paramètres')
  if (production && appUrl.protocol !== 'https:')
    settingError('APP_ORIGIN', 'HTTPS obligatoire en production')

  const allowedOrigins = [appUrl.origin]
  const loopbackHosts = ['localhost', '127.0.0.1', '[::1]']
  // Local browser aliases share the configured scheme/port; production stays exact.
  if (!production && loopbackHosts.includes(appUrl.hostname)) {
    for (const hostname of loopbackHosts) {
      const alias = new URL(appUrl)
      alias.hostname = hostname
      if (!allowedOrigins.includes(alias.origin)) allowedOrigins.push(alias.origin)
    }
  }

  const discordEnabled = !!(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET)
  const twitchEnabled = !!(env.TWITCH_CLIENT_ID && env.TWITCH_ACCESS_TOKEN)
  if (production) {
    for (const [first, second] of [
      ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
      ['TWITCH_CLIENT_ID', 'TWITCH_ACCESS_TOKEN'],
      ['SMTP_USER', 'SMTP_PASSWORD'],
    ]) {
      if (!!env[first] !== !!env[second])
        settingError(first, `renseigner aussi ${second}, ou laisser les deux vides`)
    }
    if (!env.SMTP_HOST && (env.SMTP_USER || env.SMTP_PASSWORD || env.SMTP_FROM))
      settingError('SMTP_HOST', 'requis si des paramètres email sont renseignés')
    if (
      env.SMTP_HOST &&
      !/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(
        env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] || env.SMTP_FROM || '',
      )
    )
      settingError('SMTP_FROM', 'adresse expéditeur requise pour les emails en production')
  }

  return {
    production,
    databaseUrl,
    origin: appUrl.origin,
    allowedOrigins,
    trustProxy: booleanSetting(env, 'TRUST_PROXY'),
    port: portSetting(env, 'PORT', 3001),
    host: env.HOST || '127.0.0.1',
    discordEnabled,
    twitchEnabled,
    passwordResetEnabled: !!env.SMTP_HOST,
    smtp: {
      host: env.SMTP_HOST,
      port: portSetting(env, 'SMTP_PORT', 587),
      secure: booleanSetting(env, 'SMTP_SECURE'),
      requireTLS: booleanSetting(env, 'SMTP_REQUIRE_TLS', production),
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      from: env.SMTP_FROM || 'Redak Esport <no-reply@localhost>',
    },
  }
}

export const config = loadConfig()
