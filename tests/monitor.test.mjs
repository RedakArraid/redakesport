import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  latestBackupTime,
  inspectServices,
  nextMonitorState,
  monitor,
} from '../scripts/ops/monitor.mjs'

async function fixture(t, ageHours = 1) {
  const dir = await mkdtemp(join(tmpdir(), 'redak-monitor-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const folder = join(dir, 'backup')
  await mkdir(folder)
  const files = {}
  for (const name of ['database.dump', 'roles.sql', 'uploads.tar', 'uploads-checksums.txt']) {
    await writeFile(join(folder, name), 'data')
    files[name] = { sha256: 'a'.repeat(64), bytes: 4 }
  }
  const createdAt = new Date(Date.now() - ageHours * 3600000).toISOString()
  await writeFile(
    join(folder, 'manifest.json'),
    JSON.stringify({
      version: 1,
      createdAt,
      files,
      project: 'redakesport',
      database: { name: 'redakesport', user: 'redak', major: 17 },
      tables: [],
    }),
  )
  return { dir, folder, createdAt }
}
const healthy = async () => Response.json({ status: 'ok', database: 'postgresql' })

test('monitor accepts a healthy API with a recent complete backup', async (t) => {
  const { dir } = await fixture(t)
  const report = await inspectServices({
    url: 'http://localhost/api/health',
    backupDir: dir,
    fetcher: healthy,
  })
  assert.deepEqual(report.issues, [])
})

test('monitor detects stale or incomplete backups despite a healthy API', async (t) => {
  const { dir, folder } = await fixture(t, 30)
  const report = await inspectServices({
    url: 'http://localhost/api/health',
    backupDir: dir,
    fetcher: healthy,
  })
  assert.match(report.issues[0], /ancienne/)
  await rm(join(folder, 'database.dump'))
  assert.equal(await latestBackupTime(dir), null)
})

test('a backup missing its uploads checksum list is not considered complete', async (t) => {
  const { dir, folder } = await fixture(t)
  await rm(join(folder, 'uploads-checksums.txt'))
  assert.equal(await latestBackupTime(dir), null)
})

test('monitor catches unreachable API and rejects a fake successful health response', async (t) => {
  const { dir } = await fixture(t)
  for (const fetcher of [
    async () => {
      throw new Error('offline')
    },
    async () => Response.json({}),
  ]) {
    const report = await inspectServices({
      url: 'http://localhost/api/health',
      backupDir: dir,
      fetcher,
    })
    assert.match(report.issues[0], /indisponible/)
  }
})

test('alerts require consecutive failures and are not repeated until recovery or changed incident', () => {
  const report = { issues: ['API indisponible'] }
  const first = nextMonitorState({}, report)
  assert.equal(first.event, null)
  const second = nextMonitorState(first.state, report)
  assert.equal(second.event.type, 'incident')
  const notified = { ...second.state, notifiedIncident: report.issues[0] }
  assert.equal(nextMonitorState(notified, report).event, null)
  assert.equal(nextMonitorState(notified, { issues: [] }).event.type, 'recovery')
})

test('failed webhook is retried; successful delivery is deduplicated', async (t) => {
  const { dir } = await fixture(t)
  let rejectAlert = true,
    deliveries = 0
  const options = {
    url: 'http://localhost/health',
    webhookUrl: 'http://localhost/alert',
    backupDir: dir,
    stateFile: join(dir, 'state.json'),
    threshold: 1,
    fetcher: async (url) => {
      if (url.endsWith('/health')) return Response.json({}, { status: 503 })
      deliveries++
      return new Response('', { status: rejectAlert ? 503 : 200 })
    },
  }
  assert.equal((await monitor(options)).deliveryFailed, true)
  rejectAlert = false
  assert.equal((await monitor(options)).deliveryFailed, false)
  await monitor(options)
  assert.equal(deliveries, 2)
})
