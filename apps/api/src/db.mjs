import pg from 'pg'
export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://redak:redak_local@127.0.0.1:5440/redakesport',
  max: 12,
  connectionTimeoutMillis: 5000,
})
export async function transaction(userId, action, privileged = false) {
  const connection = await pool.connect()
  try {
    await connection.query('BEGIN')
    await connection.query("SET LOCAL statement_timeout = '10s'")
    await connection.query("SELECT set_config('app.user_id',$1,true)", [userId || ''])
    if (!privileged)
      await connection.query(userId ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon')
    const result = await action(connection)
    await connection.query('COMMIT')
    return result
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}
