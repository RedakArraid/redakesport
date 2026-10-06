import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  acquireLock,
  backupManifest,
  checksum,
  composeArgs,
  countsFromOutput,
  expiredBackups,
  listBackups,
  options,
  snapshotFiles,
} from '../scripts/ops/common.mjs'

const temporary = async (context) => {
  const path = await mkdtemp(resolve(tmpdir(), 'redak-ops-test-'))
  context.after(() => rm(path, { recursive: true, force: true }))
  return path
}

test('backup options reject missing values, unsafe projects and invalid retention', () => {
  assert.throws(() => options(['--compose']))
  assert.throws(() => options(['--unknown', 'value']))
  assert.throws(() => options(['--project', '../main']))
  for (const days of ['0', '-1', '1.5', 'NaN'])
    assert.throws(() => options(['--retention-days', days]))
  const config = options([
    '--compose',
    '/a/config.yml',
    '--env-file',
    '/a/private.env',
    '--project',
    'redak-prod',
    '--retention-days',
    '30',
  ])
  assert.deepEqual(composeArgs(config), [
    'compose',
    '-f',
    '/a/config.yml',
    '--env-file',
    '/a/private.env',
    '--project-name',
    'redak-prod',
  ])
  assert.equal(config.retentionDays, 30)
})

test('operation lock rejects overlap and cannot release another owner lock', async (context) => {
  const path = resolve(await temporary(context), 'lock')
  const release = await acquireLock(path)
  await assert.rejects(acquireLock(path), { code: 'ELOCKED' })
  const ownerFile = resolve(path, 'owner.json')
  const owner = JSON.parse(await readFile(ownerFile, 'utf8'))
  await writeFile(ownerFile, JSON.stringify({ ...owner, token: 'another-owner' }))
  await release()
  assert.equal(JSON.parse(await readFile(ownerFile, 'utf8')).token, 'another-owner')
  await writeFile(ownerFile, JSON.stringify(owner))
  await release()
  await assert.rejects(readFile(ownerFile), { code: 'ENOENT' })
})

test('verification locking never recreates a missing backup directory', async (context) => {
  const path = resolve(await temporary(context), 'removed', '.verify.lock')
  await assert.rejects(acquireLock(path, { createParent: false }), { code: 'ENOENT' })
})

test('retention inventory excludes partial, malformed and unrelated folders', async (context) => {
  const directory = await temporary(context)
  const manifest = {
    version: 1,
    createdAt: '2026-10-06T12:00:00.000Z',
    database: { major: 17, user: 'redak' },
    tables: [{ table: 'public.profiles', count: '58' }],
    files: Object.fromEntries(
      snapshotFiles.map((name) => [name, { bytes: 1, sha256: 'a'.repeat(64) }]),
    ),
  }
  const names = [
    '2026-10-06T12-00-00Z_aabbccdd',
    '.2026-10-06T12-00-00Z_aabbccdd.partial',
    'unrelated',
    '2026-10-05T12-00-00Z_aabbccdd',
  ]
  for (const name of names) {
    const path = resolve(directory, name)
    await mkdir(path)
    await writeFile(
      resolve(path, 'manifest.json'),
      JSON.stringify(name.startsWith('2026-10-05') ? {} : manifest),
    )
  }
  const backups = await listBackups(directory)
  assert.deepEqual(
    backups.map((backup) => backup.path),
    [resolve(directory, names[0])],
  )
  await assert.rejects(backupManifest(resolve(directory, names[3])), /invalide/)
})

test('file digest detects corruption and table counts retain exact integers', async (context) => {
  const path = resolve(await temporary(context), 'file')
  await writeFile(path, 'first')
  const original = await checksum(path)
  await writeFile(path, 'other')
  assert.equal((await checksum(path)).bytes, original.bytes)
  assert.notEqual((await checksum(path)).sha256, original.sha256)
  assert.deepEqual(countsFromOutput('auth.users\t58\npublic.matches\t9007199254740993\n'), [
    { table: 'auth.users', count: '58' },
    { table: 'public.matches', count: '9007199254740993' },
  ])
  assert.throws(() => countsFromOutput('public.matches|12'), /invalide/)
})

test('retention only removes expired snapshots of the same project and preserves its latest backup', () => {
  const backups = [
    { path: 'dev-old', manifest: { project: 'dev', createdAt: '2026-09-01T00:00:00Z' } },
    { path: 'prod-old', manifest: { project: 'prod', createdAt: '2026-09-01T00:00:00Z' } },
    { path: 'legacy-old', manifest: { createdAt: '2026-09-01T00:00:00Z' } },
    { path: 'dev-latest', manifest: { project: 'dev', createdAt: '2026-09-02T00:00:00Z' } },
    { path: 'prod-latest', manifest: { project: 'prod', createdAt: '2026-10-06T00:00:00Z' } },
  ]
  const now = Date.parse('2026-10-06T12:00:00Z')
  assert.deepEqual(
    expiredBackups(backups, 'dev', 14, now).map((backup) => backup.path),
    ['dev-old'],
  )
  assert.deepEqual(
    expiredBackups(backups, 'prod', 14, now).map((backup) => backup.path),
    ['prod-old'],
  )
  assert.deepEqual(expiredBackups(backups, 'unknown', 14, now), [])
})
