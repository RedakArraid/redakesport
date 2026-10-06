import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { pool, transaction } from './db.mjs'
import { config } from './config.mjs'
const scrypt = promisify(scryptCallback)
export const digest = (value) => createHash('sha256').update(value).digest('hex')
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: config.production,
  maxAge: 60 * 60 * 24 * 14,
}
export const origin = config.origin
export async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `${salt}:${key.toString('hex')}`
}
async function checkPassword(password, hash) {
  const [salt, expected] = hash.split(':')
  const key = await scrypt(password, salt, 64)
  return expected?.length === 128 && timingSafeEqual(Buffer.from(expected, 'hex'), key)
}
export async function createSession(user, reply) {
  const token = randomBytes(32).toString('base64url')
  await pool.query(
    "INSERT INTO auth.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '14 days')",
    [digest(token), user.id],
  )
  reply.setCookie('redak_session', token, cookieOptions)
  return { user: { id: user.id, email: user.email } }
}
export async function userForRequest(req) {
  const token = req.cookies.redak_session
  if (!token) return null
  return (
    (
      await pool.query(
        'SELECT u.id,u.email FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
        [digest(token)],
      )
    ).rows[0] || null
  )
}
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(128),
})
export async function authRoutes(app) {
  app.get('/api/auth/session', async (req) => ({
    data: { session: req.user ? { user: req.user } : null },
    error: null,
  }))
  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 15, timeWindow: '1 hour' } } },
    async (req, reply) => {
      const input = credentials
        .extend({
          username: z
            .string()
            .min(3)
            .max(20)
            .regex(/^[a-zA-Z0-9_]+$/),
        })
        .parse(req.body)
      const hash = await passwordHash(input.password)
      let user
      try {
        user = await transaction(
          null,
          async (db) => {
            if (
              (
                await db.query('SELECT 1 FROM public.profiles WHERE lower(username)=lower($1)', [
                  input.username,
                ])
              ).rowCount
            )
              throw new Error('Ce pseudo est déjà utilisé')
            return (
              await db.query(
                'INSERT INTO auth.users(email,password_hash,raw_user_meta_data) VALUES($1,$2,$3) RETURNING id,email',
                [input.email, hash, { username: input.username }],
              )
            ).rows[0]
          },
          true,
        )
      } catch (e) {
        if (e.code === '23505') throw new Error('Ce compte existe déjà')
        throw e
      }
      return { data: { session: await createSession(user, reply), user }, error: null }
    },
  )
  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 15, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const input = credentials.parse(req.body)
      const user = (
        await pool.query('SELECT id,email,password_hash FROM auth.users WHERE email=$1', [
          input.email,
        ])
      ).rows[0]
      // Use a fixed-cost hash even for unknown email addresses.
      const valid = await checkPassword(
        input.password,
        user?.password_hash || '00000000000000000000000000000000:' + '0'.repeat(128),
      )
      if (!user || !valid)
        throw Object.assign(new Error('Email ou mot de passe incorrect'), { statusCode: 401 })
      if (req.cookies.redak_session)
        await pool.query('DELETE FROM auth.sessions WHERE token_hash=$1', [
          digest(req.cookies.redak_session),
        ])
      return { data: { session: await createSession(user, reply) }, error: null }
    },
  )
  app.post('/api/auth/logout', async (req, reply) => {
    if (req.cookies.redak_session)
      await pool.query('DELETE FROM auth.sessions WHERE token_hash=$1', [
        digest(req.cookies.redak_session),
      ])
    reply.clearCookie('redak_session', { path: '/' })
    return { error: null }
  })
  app.post(
    '/api/auth/forgot-password',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    async (req) => {
      const { email } = z
        .object({ email: z.email().transform((s) => s.toLowerCase()) })
        .parse(req.body)
      if (!config.passwordResetEnabled)
        throw Object.assign(
          new Error('La récupération par email doit être configurée par l’administrateur'),
          { statusCode: 503 },
        )
      const user = (await pool.query('SELECT id FROM auth.users WHERE email=$1', [email])).rows[0]
      if (user) {
        const token = randomBytes(32).toString('base64url')
        await pool.query(
          "INSERT INTO auth.password_resets(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
          [digest(token), user.id],
        )
        const { from, ...transport } = config.smtp
        const mail = nodemailer.createTransport(transport)
        await mail.sendMail({
          from,
          to: email,
          subject: 'Réinitialiser ton mot de passe Redak',
          text: `Choisis un nouveau mot de passe : ${origin}/reset-password?token=${token}\nCe lien expire dans 30 minutes.`,
        })
      }
      return { data: { message: 'Si ce compte existe, un lien a été envoyé.' }, error: null }
    },
  )
  app.post('/api/auth/reset-password', async (req, reply) => {
    const { token, password } = z
      .object({ token: z.string().min(30).max(100), password: z.string().min(8).max(128) })
      .parse(req.body)
    const hash = await passwordHash(password)
    await transaction(
      null,
      async (db) => {
        const reset = (
          await db.query(
            'DELETE FROM auth.password_resets WHERE token_hash=$1 AND expires_at>now() RETURNING user_id',
            [digest(token)],
          )
        ).rows[0]
        if (!reset) throw new Error('Lien expiré ou invalide')
        await db.query('UPDATE auth.users SET password_hash=$1 WHERE id=$2', [hash, reset.user_id])
        await db.query('DELETE FROM auth.sessions WHERE user_id=$1', [reset.user_id])
        await db.query('DELETE FROM auth.password_resets WHERE user_id=$1', [reset.user_id])
      },
      true,
    )
    reply.clearCookie('redak_session', { path: '/' })
    return { data: { success: true }, error: null }
  })
  app.get('/api/auth/discord', async (_req, reply) => {
    if (!config.discordEnabled)
      throw Object.assign(new Error('Connexion Discord non configurée'), { statusCode: 503 })
    const state = randomBytes(24).toString('base64url')
    reply.setCookie('redak_oauth', state, { ...cookieOptions, maxAge: 600 })
    const query = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: `${origin}/api/auth/discord/callback`,
      response_type: 'code',
      scope: 'identify email',
      state,
    })
    return reply.redirect(`https://discord.com/oauth2/authorize?${query}`)
  })
  app.get('/api/auth/discord/callback', async (req, reply) => {
    if (!req.query.code || !req.cookies.redak_oauth || req.cookies.redak_oauth !== req.query.state)
      throw new Error('Connexion Discord invalide')
    reply.clearCookie('redak_oauth', { path: '/' })
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: `${origin}/api/auth/discord/callback`,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!tokenRes.ok) throw new Error('Connexion Discord impossible')
    const token = await tokenRes.json()
    const profileRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10000),
    })
    const profile = await profileRes.json()
    if (!profileRes.ok || !profile.verified || !profile.email)
      throw new Error('Un email Discord vérifié est requis')
    // Link through verified provider identity; do not take an arbitrary account by email.
    let user = (
      await pool.query('SELECT id,email FROM auth.users WHERE discord_id=$1', [profile.id])
    ).rows[0]
    if (!user) {
      if (
        (await pool.query('SELECT 1 FROM auth.users WHERE email=$1', [profile.email.toLowerCase()]))
          .rowCount
      )
        throw new Error('Un compte utilise déjà cet email. Connecte-toi avec ton mot de passe.')
      user = (
        await pool.query(
          'INSERT INTO auth.users(email,password_hash,discord_id,raw_user_meta_data) VALUES($1,$2,$3,$4) RETURNING id,email',
          [
            profile.email.toLowerCase(),
            await passwordHash(randomBytes(48).toString('hex')),
            profile.id,
            { username: profile.username },
          ],
        )
      ).rows[0]
    }
    await createSession(user, reply)
    return reply.redirect('/app/dashboard')
  })
}
