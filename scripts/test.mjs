import { spawn } from 'node:child_process'
import pg from 'pg'
const url = new URL(
  process.env.TEST_DATABASE_URL || 'postgresql://redak:redak_local@127.0.0.1:5440/redakesport_test',
)
if (!url.pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL must use a database ending in _test')
const adminUrl = new URL(url)
adminUrl.pathname = '/postgres'
const admin = new pg.Client({ connectionString: adminUrl.href })
await admin.connect()
const name = url.pathname.slice(1)
if (!/^[a-z0-9_]+$/.test(name)) throw new Error('Invalid test database name')
if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount)
  await admin.query(`CREATE DATABASE "${name}"`)
await admin.end()
const env = { ...process.env, DATABASE_URL: url.href, NODE_ENV: 'test' }
async function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit' })
    child.on('exit', resolve)
  })
}
const migrated = await run(['apps/api/src/migrate.mjs'])
process.exitCode =
  migrated ||
  (await run([
    '--test',
    '--test-concurrency=1',
    'tests/brackets.test.mjs',
    'tests/swiss.test.mjs',
    'tests/api.test.mjs',
    'tests/client.test.mjs',
    'tests/demo.test.mjs',
  ]))
