import { transaction, pool } from './db.mjs'
export const tables = new Set([
  'profiles',
  'games',
  'clubs',
  'club_members',
  'club_applications',
  'tournaments',
  'tournament_registrations',
  'groups',
  'group_members',
  'matches',
  'match_events',
  'score_submissions',
  'standings',
  'matchmaking_queue',
  'lobbies',
  'broadcast_sessions',
  'discord_integrations',
  'notifications',
  'elo_history',
  'media_uploads',
])
const columns = new Map()
const links = new Map()
const identifier = (value) => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error('Identifiant invalide')
  return `"${value}"`
}
export async function loadSchema() {
  const { rows } = await pool.query(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'",
  )
  for (const r of rows) {
    if (!columns.has(r.table_name)) columns.set(r.table_name, new Set())
    columns.get(r.table_name).add(r.column_name)
  }
  const { rows: foreignKeys } =
    await pool.query(`SELECT tc.table_name,tc.constraint_name,kcu.column_name,ccu.table_name AS target,ccu.column_name AS target_column
    FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING(constraint_schema,constraint_name)
    JOIN information_schema.constraint_column_usage ccu USING(constraint_schema,constraint_name)
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND ccu.table_schema='public'`)
  for (const r of foreignKeys) {
    if (!links.has(r.table_name)) links.set(r.table_name, [])
    links.get(r.table_name).push(r)
  }
}
function column(table, name, alias = 't') {
  if (!columns.get(table)?.has(name)) throw new Error('Colonne invalide')
  return `${alias}.${identifier(name)}`
}
export function splitTopLevel(value) {
  let depth = 0,
    start = 0
  const parts = []
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++
    if (value[i] === ')') depth--
    if (depth < 0) throw new Error('Requête invalide')
    if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  if (depth !== 0) throw new Error('Requête invalide')
  parts.push(value.slice(start).trim())
  return parts
}
function projection(table, select = '*', alias = 't', depth = 0) {
  if (typeof select !== 'string' || select.length > 1800 || depth > 3)
    throw new Error('Sélection invalide')
  return splitTopLevel(select)
    .map((part) => {
      if (part === '*') return `${alias}.*`
      if (!part.includes('(')) return column(table, part, alias)
      const m = part.match(/^(?:(\w+):)?(\w+)(?:!(\w+))?\((.*)\)$/)
      if (!m || !tables.has(m[2])) throw new Error('Relation invalide')
      const [, label, target, constraint, fields] = m
      const candidates = (links.get(table) || []).filter(
        (r) => r.target === target && (!constraint || r.constraint_name === constraint),
      )
      if (candidates.length !== 1) throw new Error('Relation ambiguë')
      const relation = candidates[0],
        next = `j${depth + 1}`
      return `(SELECT row_to_json(n${depth}) FROM (SELECT ${projection(target, fields, next, depth + 1)} FROM public.${identifier(target)} ${next} WHERE ${column(target, relation.target_column, next)}=${column(table, relation.column_name, alias)} LIMIT 1) n${depth}) AS ${identifier(label || target)}`
    })
    .join(',')
}
function predicate(table, filter, params) {
  if (filter.op === 'or') {
    if (typeof filter.value !== 'string' || filter.value.length > 3000)
      throw new Error('Filtre invalide')
    return (
      '(' +
      splitTopLevel(filter.value)
        .map((x) => {
          const m = x.match(/^(\w+)\.(eq|in)\.(.*)$/)
          if (!m) throw new Error('Filtre invalide')
          return predicate(
            table,
            { column: m[1], op: m[2], value: m[2] === 'in' ? m[3].slice(1, -1).split(',') : m[3] },
            params,
          )
        })
        .join(' OR ') +
      ')'
    )
  }
  const col = column(table, filter.column)
  if (filter.op === 'not-null') return `${col} IS NOT NULL`
  if (filter.op === 'is-null') return `${col} IS NULL`
  if (!['eq', 'neq', 'in', 'ilike', 'gte', 'lte', 'gt', 'lt'].includes(filter.op))
    throw new Error('Opérateur invalide')
  if (filter.op === 'in' && (!Array.isArray(filter.value) || filter.value.length > 600))
    throw new Error('Filtre invalide')
  params.push(filter.value)
  if (filter.op === 'in') return `${col} = ANY($${params.length})`
  return `${col} ${{ eq: '=', neq: '<>', ilike: 'ILIKE', gte: '>=', lte: '<=', gt: '>', lt: '<' }[filter.op]} $${params.length}`
}
export async function dataQuery(userId, input) {
  const {
    table,
    select = '*',
    filters = [],
    order = [],
    operation = 'select',
    payload,
    single,
    head = false,
    count = false,
  } = input || {}
  if (
    !tables.has(table) ||
    !Array.isArray(filters) ||
    filters.length > 20 ||
    !Array.isArray(order) ||
    order.length > 5
  )
    throw new Error('Requête invalide')
  if (operation !== 'select' && !userId)
    throw Object.assign(new Error('Connexion requise'), { statusCode: 401 })
  const limit = Math.min(1000, Math.max(1, Number.isInteger(input.limit) ? input.limit : 500)),
    offset = Math.max(0, Number.isInteger(input.offset) ? input.offset : 0)
  return transaction(userId, async (db) => {
    const params = []
    const where = filters.length
      ? ' WHERE ' + filters.map((f) => predicate(table, f, params)).join(' AND ')
      : ''
    let rows,
      total = null
    if (operation === 'select') {
      if (count)
        total = Number(
          (await db.query(`SELECT count(*) FROM public.${identifier(table)} t${where}`, params))
            .rows[0].count,
        )
      const sort = order.length
        ? ' ORDER BY ' +
          order
            .map(
              (o) =>
                column(table, o.column) +
                (o.ascending === false ? ' DESC' : ' ASC') +
                ' NULLS LAST',
            )
            .join(',')
        : ''
      rows = head
        ? []
        : (
            await db.query(
              `SELECT ${projection(table, select)} FROM public.${identifier(table)} t${where}${sort} LIMIT ${limit} OFFSET ${offset}`,
              params,
            )
          ).rows
    } else if (operation === 'insert') {
      if (!payload || Array.isArray(payload) || typeof payload !== 'object')
        throw new Error('Objet requis')
      const keys = Object.keys(payload)
      if (!keys.length || keys.length > 40) throw new Error('Données invalides')
      for (const k of keys) column(table, k)
      rows = (
        await db.query(
          `INSERT INTO public.${identifier(table)} (${keys.map(identifier).join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
          keys.map((k) => (payload[k] === undefined ? null : payload[k])),
        )
      ).rows
    } else if (operation === 'update') {
      if (!where || !payload || typeof payload !== 'object' || Array.isArray(payload))
        throw new Error('Mise à jour invalide')
      const set = Object.keys(payload)
        .map((k) => {
          column(table, k)
          params.push(payload[k])
          return `${identifier(k)}=$${params.length}`
        })
        .join(',')
      if (!set) throw new Error('Mise à jour vide')
      rows = (
        await db.query(
          `UPDATE public.${identifier(table)} t SET ${set}${where} RETURNING *`,
          params,
        )
      ).rows
    } else if (operation === 'delete') {
      if (!where) throw new Error('Filtre requis')
      rows = (
        await db.query(`DELETE FROM public.${identifier(table)} t${where} RETURNING *`, params)
      ).rows
    } else throw new Error('Opération invalide')
    if (single === 'required' && rows.length !== 1)
      throw Object.assign(new Error('Élément introuvable'), { statusCode: 404 })
    if (single && rows.length > 1) throw new Error('Plusieurs éléments correspondent')
    return { data: single ? rows[0] || null : rows, count: total, error: null }
  })
}
export const procedures = {
  complete_onboarding: ['p_role', 'p_country'],
  create_club: ['p_name', 'p_region', 'p_description'],
  review_application: ['p_id', 'p_accept'],
  register_tournament: ['p_tournament_id', 'p_club_id'],
  review_registration: ['p_id', 'p_approve'],
  withdraw_registration: ['p_id'],
  submit_score: ['p_match_id', 'p_score1', 'p_score2', 'p_screenshots'],
  resolve_score: ['p_match_id', 'p_score1', 'p_score2'],
  forfeit_match: ['p_match_id', 'p_loser_id', 'p_reason'],
  join_queue: ['p_game_id'],
  matchmaking_tick: [],
  lobby_ready: ['p_id'],
  cancel_lobby: ['p_id'],
}
export async function callProcedure(userId, name, args = {}) {
  if (!userId) throw Object.assign(new Error('Connexion requise'), { statusCode: 401 })
  if (!Object.hasOwn(procedures, name)) throw new Error('Action inconnue')
  if (
    name === 'submit_score' &&
    args.p_screenshots &&
    (!Array.isArray(args.p_screenshots) ||
      args.p_screenshots.some(
        (path) => typeof path !== 'string' || !/^\/api\/files\/[a-f0-9-]{36}$/.test(path),
      ))
  )
    throw new Error('Pièce jointe invalide')
  if (
    ['submit_score', 'resolve_score'].includes(name) &&
    ![args.p_score1, args.p_score2].every((n) => Number.isInteger(n) && n >= 0 && n <= 999)
  )
    throw new Error('Scores entiers entre 0 et 999 requis')
  if (name === 'submit_score' && args.p_screenshots?.length) {
    const ids = args.p_screenshots.map((path) => path.split('/').pop())
    const files = await pool.query(
      'SELECT id FROM app.files WHERE id=ANY($1::uuid[]) AND match_id=$2 AND uploader_id=$3',
      [ids, args.p_match_id, userId],
    )
    if (files.rowCount !== new Set(ids).size)
      throw new Error('Cette pièce jointe ne correspond pas au match')
  }
  const keys = procedures[name].filter((k) => Object.hasOwn(args, k))
  return transaction(userId, async (db) => ({
    data: (
      await db.query(
        `SELECT to_jsonb(public.${identifier(name)}(${keys.map((k, i) => `${identifier(k)} => $${i + 1}`).join(',')})) AS result`,
        keys.map((k) => args[k]),
      )
    ).rows[0].result,
    error: null,
  }))
}
