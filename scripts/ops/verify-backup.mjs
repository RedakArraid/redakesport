import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import {
  acquireLock,
  backupManifest,
  checksum,
  countsFromOutput,
  interruptionGuard,
  listBackups,
  options,
  run,
  snapshotFiles,
  tableCountsSql,
  uploadChecksums,
} from './common.mjs'

process.umask(0o077)

async function main() {
  const config = options()
  if (config.help) {
    console.log(
      'node scripts/ops/verify-backup.mjs [--latest] [--output var/backups] [--backup dossier]\nRestaure dans un projet Docker temporaire sans ports publiés, vérifie les tables et fichiers puis supprime uniquement ses propres ressources. Aucun accès au projet applicatif. Les options --compose, --env-file et --project sont acceptées mais ne servent jamais de cible de restauration.',
    )
    return
  }
  const directory = config.backup ?? (await listBackups(config.output))[0]?.path
  if (!directory) throw new Error('Aucune sauvegarde complète disponible.')
  const release = await acquireLock(resolve(directory, '.verify.lock'), { createParent: false })
  const interruption = interruptionGuard()
  let workspace
  let compose
  try {
    const manifest = await backupManifest(directory)
    for (const filename of snapshotFiles) {
      const actual = await checksum(resolve(directory, filename))
      const expected = manifest.files[filename]
      if (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes)
        throw new Error(`Somme de contrôle incorrecte : ${filename}`)
    }
    interruption.check()
    workspace = await mkdtemp(resolve(tmpdir(), 'redak-restore-'))
    const suffix = randomUUID().replaceAll('-', '')
    const project = `redak-restore-${suffix}`
    const admin = `verify_${suffix}`
    const image = `postgres:${manifest.database.major}-alpine`
    const file = resolve(workspace, 'compose.json')
    await writeFile(
      file,
      JSON.stringify({
        services: {
          db: {
            image,
            network_mode: 'none',
            environment: {
              POSTGRES_USER: admin,
              POSTGRES_DB: 'postgres',
              POSTGRES_HOST_AUTH_METHOD: 'trust',
            },
            volumes: ['database:/var/lib/postgresql/data'],
            healthcheck: {
              test: ['CMD', 'pg_isready', '-U', admin, '-d', 'postgres'],
              interval: '1s',
              timeout: '5s',
              retries: 60,
            },
          },
          files: {
            image,
            network_mode: 'none',
            volumes: ['uploads:/uploads'],
            working_dir: '/uploads',
            entrypoint: ['tar'],
          },
        },
        volumes: { database: {}, uploads: {} },
      }),
      { mode: 0o600 },
    )
    compose = ['compose', '-f', file, '--project-name', project]
    // This generated project has no external volumes, bind mounts, ports or application service.
    console.log(`Restauration isolée : ${project}`)
    await run([...compose, 'up', '-d', '--wait', '--wait-timeout', '90', 'db'])
    interruption.check()
    await run(
      [
        ...compose,
        'exec',
        '-T',
        'db',
        'psql',
        '-X',
        '-v',
        'ON_ERROR_STOP=1',
        '-U',
        admin,
        '-d',
        'postgres',
      ],
      { inputFile: resolve(directory, 'roles.sql') },
    )
    await run([
      ...compose,
      'exec',
      '-T',
      'db',
      'createdb',
      '-U',
      admin,
      '--owner',
      manifest.database.user,
      'redak_restore',
    ])
    interruption.check()
    await run(
      [
        ...compose,
        'exec',
        '-T',
        'db',
        'pg_restore',
        '--exit-on-error',
        '--single-transaction',
        '-U',
        admin,
        '-d',
        'redak_restore',
      ],
      { inputFile: resolve(directory, 'database.dump') },
    )
    await run(
      [...compose, 'run', '--rm', '--no-deps', '-T', 'files', '-xf', '-', '-C', '/uploads'],
      { inputFile: resolve(directory, 'uploads.tar') },
    )
    interruption.check()
    const tables = countsFromOutput(
      await run(
        [
          ...compose,
          'exec',
          '-T',
          'db',
          'psql',
          '-X',
          '-At',
          '-v',
          'ON_ERROR_STOP=1',
          '-U',
          admin,
          '-d',
          'redak_restore',
        ],
        { input: tableCountsSql },
      ),
    )
    if (JSON.stringify(tables) !== JSON.stringify(manifest.tables))
      throw new Error('Les tables restaurées ne correspondent pas aux comptages sauvegardés.')
    const actualUploads = await run([
      ...compose,
      'run',
      '--rm',
      '--no-deps',
      '-T',
      '--entrypoint',
      'sh',
      'files',
      '-c',
      uploadChecksums,
    ])
    if (actualUploads !== (await readFile(resolve(directory, 'uploads-checksums.txt'), 'utf8')))
      throw new Error('Les fichiers restaurés ne correspondent pas aux fichiers sauvegardés.')
    const report = {
      version: 1,
      verifiedAt: new Date().toISOString(),
      createdAt: manifest.createdAt,
      tables: tables.length,
      uploadFiles: actualUploads.trim() ? actualUploads.trim().split('\n').length : 0,
      result: 'passed',
    }
    await writeFile(
      resolve(directory, 'verification.json'),
      JSON.stringify(report, null, 2) + '\n',
      { mode: 0o600 },
    )
    console.log(
      `Restauration vérifiée : ${report.tables} tables, ${report.uploadFiles} fichiers ; ${directory}`,
    )
  } finally {
    try {
      if (compose)
        await run([...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10'])
      if (workspace) await rm(workspace, { recursive: true, force: true })
    } finally {
      interruption.remove()
      await release()
    }
  }
}

main().catch((error) => {
  console.error(`Échec de la vérification : ${error.message}`)
  process.exitCode = 1
})
