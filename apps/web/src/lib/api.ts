import type { Database, Club, Profile, Tournament, Match, Game } from '../types/database'
export interface User {
  id: string
  email: string
}
export interface Session {
  user: User
}
type Tables = Database['public']['Tables']
type TableName = keyof Tables
type Relations = {
  clubs: { captain: Profile | null }
  club_members: { club: Club | null; clubs: Club | null; profiles: Profile | null }
  club_applications: { club: Club | null; clubs: Club | null; profiles: Profile | null }
  tournaments: { game: Game | null }
  tournament_registrations: {
    club: Club | null
    player: Profile | null
    clubs: Club | null
    profiles: Profile | null
  }
  matches: { tournaments: Tournament | null; group: { name: string } | null }
  score_submissions: {
    matches: (Match & { tournaments: Tournament | null; tournament: Tournament | null }) | null
  }
}
type Row<N extends TableName> = Tables[N]['Row'] &
  (N extends keyof Relations ? Relations[N] : object)
export type Result<T> =
  | { data: T; error: null; count?: number | null }
  | { data: null; error: Error; count?: number | null }
export async function request<T>(
  url: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<Result<T>> {
  try {
    const response = await fetch(`/api${url}`, {
      method,
      credentials: 'same-origin',
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const result = await response.json()
    if (!response.ok || result.error)
      return {
        data: null,
        error: new Error(
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Service indisponible',
        ),
      }
    return {
      data: ('data' in result ? result.data : result) as T,
      error: null,
      count: result.count,
    }
  } catch {
    return {
      data: null,
      error: new Error('Connexion au serveur impossible. Réessaie dans quelques instants.'),
    }
  }
}
interface QuerySpec {
  table: TableName
  operation: string
  select?: string
  payload?: unknown
  filters: { column?: string; op: string; value?: unknown }[]
  order: { column: string; ascending?: boolean }[]
  limit?: number
  offset?: number
  single?: 'required' | 'optional'
  head?: boolean
  count?: boolean
}
class Query<N extends TableName, T = Row<N>[]> implements PromiseLike<Result<T>> {
  private spec: QuerySpec
  constructor(table: N) {
    this.spec = { table, operation: 'select', filters: [], order: [] }
  }
  select(fields = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.spec.select = fields
    this.spec.count = options?.count === 'exact'
    this.spec.head = options?.head
    return this
  }
  eq(column: string, value: unknown) {
    this.spec.filters.push({ column, op: 'eq', value })
    return this
  }
  neq(column: string, value: unknown) {
    this.spec.filters.push({ column, op: 'neq', value })
    return this
  }
  in(column: string, value: readonly unknown[]) {
    this.spec.filters.push({ column, op: 'in', value })
    return this
  }
  ilike(column: string, value: string) {
    this.spec.filters.push({ column, op: 'ilike', value })
    return this
  }
  gte(column: string, value: unknown) {
    this.spec.filters.push({ column, op: 'gte', value })
    return this
  }
  lte(column: string, value: unknown) {
    this.spec.filters.push({ column, op: 'lte', value })
    return this
  }
  not(column: string, operator: 'is', value: null) {
    if (operator !== 'is' || value !== null) throw new Error('Filtre invalide')
    this.spec.filters.push({ column, op: 'not-null' })
    return this
  }
  or(value: string) {
    this.spec.filters.push({ op: 'or', value })
    return this
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.spec.order.push({ column, ...options })
    return this
  }
  limit(value: number) {
    this.spec.limit = value
    return this
  }
  range(from: number, to: number) {
    this.spec.offset = from
    this.spec.limit = to - from + 1
    return this
  }
  insert(payload: Tables[N]['Insert']) {
    this.spec.operation = 'insert'
    this.spec.payload = payload
    return this
  }
  update(payload: Tables[N]['Update']) {
    this.spec.operation = 'update'
    this.spec.payload = payload
    return this
  }
  delete() {
    this.spec.operation = 'delete'
    return this
  }
  single() {
    this.spec.single = 'required'
    return this as unknown as Query<N, Row<N>>
  }
  maybeSingle() {
    this.spec.single = 'optional'
    return this as unknown as Query<N, Row<N> | null>
  }
  async all(): Promise<Result<Row<N>[]>> {
    if (this.spec.operation !== 'select' || this.spec.single || this.spec.head)
      throw new Error('La pagination nécessite une sélection de lignes')
    const keys =
      this.spec.table === 'standings'
        ? ['tournament_id', 'team_id']
        : this.spec.table === 'club_members'
          ? ['club_id', 'player_id']
          : this.spec.table === 'group_members'
            ? ['group_id', 'club_id', 'player_id']
            : ['id']
    const order = [
      ...this.spec.order,
      ...keys
        .filter((key) => !this.spec.order.some((item) => item.column === key))
        .map((column) => ({ column })),
    ]
    const rows: Row<N>[] = []
    for (let offset = 0; ; offset += 1000) {
      const result = await request<Row<N>[]>('/data', {
        ...this.spec,
        order,
        offset,
        limit: 1000,
        count: false,
      })
      if (result.error) return result
      rows.push(...result.data)
      if (result.data.length < 1000) return { data: rows, error: null }
    }
  }
  then<TResult1 = Result<T>, TResult2 = never>(
    resolve?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return request<T>('/data', this.spec).then(resolve, reject)
  }
}
const listeners = new Set<(event: string, session: Session | null) => void>()
function emit(session: Session | null) {
  for (const listener of listeners) listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
}
export const db = {
  from: <N extends TableName>(table: N) => new Query(table),
  rpc: <N extends keyof Database['public']['Functions']>(
    name: N,
    args: Database['public']['Functions'][N]['Args'] = {} as Database['public']['Functions'][N]['Args'],
  ) => request<Database['public']['Functions'][N]['Returns']>(`/actions/${name}`, args),
  functions: {
    invoke: async (name: string, { body }: { body?: unknown } = {}) =>
      request<Record<string, unknown>>(`/functions/${name}`, body || {}),
  },
  auth: {
    getSession: async () => {
      const result = await request<{ session: Session | null }>('/auth/session')
      return { data: result.data || { session: null }, error: result.error }
    },
    onAuthStateChange: (listener: (event: string, session: Session | null) => void) => {
      listeners.add(listener)
      void db.auth.getSession().then((r) => {
        if (listeners.has(listener)) listener('INITIAL_SESSION', r.data.session)
      })
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }
    },
    signInWithPassword: async (input: { email: string; password: string }) => {
      const result = await request<{ session: Session }>('/auth/login', input)
      if (result.data) emit(result.data.session)
      return result
    },
    signUp: async (input: {
      email: string
      password: string
      options: { data: { username: string }; emailRedirectTo?: string }
    }) => {
      const result = await request<{ session: Session }>('/auth/register', {
        email: input.email,
        password: input.password,
        username: input.options.data.username,
      })
      if (result.data) emit(result.data.session)
      return result
    },
    signOut: async () => {
      const result = await request('/auth/logout', {})
      if (!result.error) emit(null)
      return result
    },
    signInWithOAuth: async () => {
      const result = await request<{ discordEnabled: boolean }>('/config')
      if (!result.data?.discordEnabled)
        return { error: new Error('La connexion Discord n’est pas configurée') }
      window.location.assign('/api/auth/discord')
      return { error: null }
    },
  },
}

export async function rowsByIds<N extends TableName>(
  table: N,
  ids: readonly string[],
  fields = '*',
) {
  const unique = [...new Set(ids)]
  const rows: Row<N>[] = []
  for (let offset = 0; offset < unique.length; offset += 500) {
    const { data, error } = await db
      .from(table)
      .select(fields)
      .in('id', unique.slice(offset, offset + 500))
    if (error) throw error
    rows.push(...data)
  }
  return rows
}
