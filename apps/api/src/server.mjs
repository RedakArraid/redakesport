import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import staticFiles from '@fastify/static'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, transaction } from './db.mjs'
import { dataQuery, callProcedure, loadSchema } from './data.mjs'
import { authRoutes, origin, userForRequest } from './auth.mjs'
import { buildBracket } from './brackets.ts'
import { config } from './config.mjs'
const uploads = resolve(
  process.env.UPLOAD_DIR || fileURLToPath(new URL('../../../var/uploads', import.meta.url)),
)
export async function createApp({ logger = false } = {}) {
  const app = Fastify({
    logger,
    bodyLimit: 256 * 1024,
    trustProxy: config.trustProxy,
  })
  await app.register(cookie)
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 2 } })
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    // Static assets and page reloads must not consume the API quota or become a JSON error page.
    allowList: (req) => !req.routeOptions.url?.startsWith('/api/'),
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: 'Trop de requêtes. Patiente un instant avant de réessayer.',
    }),
  })
  await loadSchema()
  await mkdir(uploads, { recursive: true })
  app.decorateRequest('user', null)
  app.addHook('onRequest', async (req, reply) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'same-origin')
      .header('X-Frame-Options', 'SAMEORIGIN')
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store')
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const requestOrigin = req.headers.origin
      if (
        req.headers['sec-fetch-site'] === 'cross-site' ||
        (requestOrigin && requestOrigin !== origin)
      )
        return reply.code(403).send({ error: { message: 'Origine non autorisée' } })
    }
    req.user = await userForRequest(req)
  })
  app.setErrorHandler((error, req, reply) => {
    if (logger) req.log.error({ err: error }, 'Request failed')
    const status = error.statusCode || (error.code === '42501' ? 403 : 400)
    const message =
      error.name === 'ZodError'
        ? 'Vérifie les champs du formulaire'
        : error.code === '23505'
          ? 'Cet élément existe déjà'
          : error.code === '23514'
            ? 'Ces données ne respectent pas les règles du tournoi'
            : error.code === '42501'
              ? 'Action non autorisée'
              : error.code && error.code !== 'P0001'
                ? 'Impossible de traiter cette demande'
                : error.message
    reply.code(status).send({ data: null, error: { message } })
  })
  app.get('/api/health', async () => {
    await pool.query('SELECT 1')
    return { status: 'ok', database: 'postgresql' }
  })
  app.get('/api/config', async () => ({
    discordEnabled: config.discordEnabled,
    passwordResetEnabled: config.passwordResetEnabled,
  }))
  await authRoutes(app)
  app.post('/api/data', async (req) => dataQuery(req.user?.id, req.body))
  app.post('/api/actions/:name', async (req) =>
    callProcedure(req.user?.id, req.params.name, req.body),
  )
  app.post('/api/functions/bracket-generate', async (req) => {
    if (!req.user) throw Object.assign(new Error('Connexion requise'), { statusCode: 401 })
    const { tournament_id, seeding = 'elo' } = req.body || {}
    if (!['elo', 'manual', 'random'].includes(seeding)) throw new Error('Classement invalide')
    const { data: t } = await dataQuery(req.user.id, {
      table: 'tournaments',
      filters: [{ column: 'id', op: 'eq', value: tournament_id }],
      single: 'required',
    })
    if (t.organizer_id !== req.user.id)
      throw Object.assign(new Error('Accès refusé'), { statusCode: 403 })
    const { data: entrants } = await dataQuery(req.user.id, {
      table: 'tournament_registrations',
      select: '*, clubs(elo_rating), profiles(elo_rating)',
      filters: [
        { column: 'tournament_id', op: 'eq', value: t.id },
        { column: 'status', op: 'eq', value: 'approved' },
      ],
    })
    entrants.sort((a, b) =>
      seeding === 'manual'
        ? (a.seed ?? 999) - (b.seed ?? 999)
        : (b.clubs?.elo_rating ?? b.profiles?.elo_rating ?? 1000) -
          (a.clubs?.elo_rating ?? a.profiles?.elo_rating ?? 1000),
    )
    if (seeding === 'random')
      for (let i = entrants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[entrants[i], entrants[j]] = [entrants[j], entrants[i]]
      }
    const plan = buildBracket(
      entrants.map((e) => ({ id: e.club_id ?? e.player_id, type: e.club_id ? 'club' : 'player' })),
      t.id,
      t.format,
    )
    await transaction(
      req.user.id,
      (db) => db.query('SELECT public.install_bracket($1,$2,$3)', [req.user.id, t.id, plan]),
      true,
    )
    return { success: true, matches_created: plan.matches.length }
  })
  app.post('/api/functions/score-submit', async (req) => {
    const b = req.body || {}
    const { data } = await callProcedure(req.user?.id, 'submit_score', {
      p_match_id: b.match_id,
      p_score1: b.score_team1,
      p_score2: b.score_team2,
      p_screenshots: b.screenshot_urls || [],
    })
    return data
  })
  app.post(
    '/api/functions/discord-webhook',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req) => {
      if (!req.user) throw Object.assign(new Error('Connexion requise'), { statusCode: 401 })
      const { webhook_url, message } = req.body || {}
      const url = new URL(webhook_url)
      if (
        url.origin !== 'https://discord.com' ||
        !/^\/api\/webhooks\/\d+\/[\w-]+$/.test(url.pathname) ||
        url.search
      )
        throw new Error('URL Discord invalide')
      if (
        !message?.title ||
        !message?.description ||
        message.title.length > 256 ||
        message.description.length > 4000
      )
        throw new Error('Message invalide')
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          embeds: [{ title: message.title, description: message.description }],
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error('Discord a refusé le message')
      return { success: true }
    },
  )
  app.post('/api/functions/twitch-status', async (req) => {
    if (!req.user) throw Object.assign(new Error('Connexion requise'), { statusCode: 401 })
    const name = req.body?.channel_name
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(name)) throw new Error('Chaîne invalide')
    if (!config.twitchEnabled) return { is_live: false, error: 'Twitch non configuré' }
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${name}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Twitch indisponible')
    const stream = (await response.json()).data?.[0]
    return {
      is_live: !!stream,
      viewer_count: stream?.viewer_count || 0,
      title: stream?.title,
      game: stream?.game_name,
    }
  })
  async function evidenceAllowed(userId, matchId) {
    return transaction(
      userId,
      async (db) =>
        (
          await db.query(
            `SELECT 1 FROM public.matches m WHERE m.id=$1 AND (private.represents(m.team1_id,m.team1_type) OR private.represents(m.team2_id,m.team2_type) OR EXISTS(SELECT 1 FROM public.tournaments t WHERE t.id=m.tournament_id AND t.organizer_id=app.user_id()))`,
            [matchId],
          )
        ).rowCount > 0,
    )
  }
  app.post('/api/files/:bucket', async (req, reply) => {
    if (!req.user) throw Object.assign(new Error('Connexion requise'), { statusCode: 401 })
    const bucket = req.params.bucket,
      path = req.query.path
    if (
      !['avatars', 'club-assets', 'score-screenshots', 'match-clips'].includes(bucket) ||
      typeof path !== 'string' ||
      path.length > 250 ||
      !/^[-a-zA-Z0-9_/\.]+$/.test(path) ||
      path.includes('..')
    )
      throw new Error('Chemin invalide')
    const first = path.split('/')[0]
    let matchId = null
    if (bucket === 'score-screenshots') {
      matchId = first
      if (!(await evidenceAllowed(req.user.id, matchId)))
        throw Object.assign(new Error('Accès refusé'), { statusCode: 403 })
    }
    if (bucket === 'avatars' && first !== req.user.id) throw new Error('Avatar non autorisé')
    if (
      bucket === 'club-assets' &&
      !(await transaction(
        req.user.id,
        async (db) =>
          (
            await db.query('SELECT 1 FROM public.clubs WHERE id=$1 AND captain_id=app.user_id()', [
              first,
            ])
          ).rowCount,
      ))
    )
      throw new Error('Club non autorisé')
    const file = await req.file()
    if (!file) throw new Error('Fichier requis')
    const buffer = await file.toBuffer()
    const type = file.mimetype,
      video = bucket === 'match-clips'
    const valid =
      (type === 'image/png' &&
        buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (type === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216) ||
      (type === 'image/webp' && buffer.toString('ascii', 8, 12) === 'WEBP') ||
      (video && type === 'video/mp4' && buffer.toString('ascii', 4, 8) === 'ftyp') ||
      (video && type === 'video/webm' && buffer.subarray(0, 4).toString('hex') === '1a45dfa3')
    if (!valid || buffer.length > (video ? 50 : 10) * 1024 * 1024)
      throw new Error('Format ou taille de fichier invalide')
    const id = randomUUID()
    await writeFile(resolve(uploads, id), buffer, { flag: 'wx' })
    try {
      await pool.query(
        'INSERT INTO app.files(id,bucket,storage_path,uploader_id,match_id,content_type,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [id, bucket, `${bucket}/${path}`, req.user.id, matchId, type, buffer.length],
      )
    } catch (e) {
      await unlink(resolve(uploads, id))
      throw e
    }
    return reply.code(201).send({ data: { path, url: `/api/files/${id}` }, error: null })
  })
  app.get('/api/files/:id', async (req, reply) => {
    const file = (await pool.query('SELECT * FROM app.files WHERE id=$1', [req.params.id])).rows[0]
    if (!file) return reply.code(404).send({ error: { message: 'Fichier introuvable' } })
    if (
      file.bucket === 'score-screenshots' &&
      (!req.user || !(await evidenceAllowed(req.user.id, file.match_id)))
    )
      return reply.code(403).send({ error: { message: 'Accès refusé' } })
    return reply
      .type(file.content_type)
      .header('Content-Disposition', 'inline')
      .send(createReadStream(resolve(uploads, file.id)))
  })
  const dist = fileURLToPath(new URL('../../web/dist/', import.meta.url))
  if (existsSync(dist)) {
    await app.register(staticFiles, { root: dist, prefix: '/' })
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api/')
        ? reply.code(404).send({ error: { message: 'Route inconnue' } })
        : reply.sendFile('index.html'),
    )
  }
  return app
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await createApp({ logger: true })
  await app.listen({
    port: config.port,
    host: config.host,
  })
  const close = async () => {
    await app.close()
    await pool.end()
    process.exit(0)
  }
  process.once('SIGTERM', close)
  process.once('SIGINT', close)
}
