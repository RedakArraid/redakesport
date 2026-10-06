import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pool } from './db.mjs'
export async function migrate() {
  const db = await pool.connect()
  try {
    await db.query('SELECT pg_advisory_lock(742009)')
    await db.query(
      'CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    )
    const directory = new URL('../../../database/migrations/', import.meta.url)
    for (const name of (await readdir(directory)).filter((n) => n.endsWith('.sql')).sort()) {
      if ((await db.query('SELECT 1 FROM public.schema_migrations WHERE name=$1', [name])).rowCount)
        continue
      await db.query('BEGIN')
      try {
        await db.query(await readFile(new URL(name, directory), 'utf8'))
        await db.query('INSERT INTO public.schema_migrations(name) VALUES($1)', [name])
        await db.query('COMMIT')
        console.log(`Migration appliquée : ${name}`)
      } catch (e) {
        await db.query('ROLLBACK')
        throw e
      }
    }
  } finally {
    await db.query('SELECT pg_advisory_unlock(742009)')
    db.release()
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await migrate()
  } finally {
    await pool.end()
  }
}
