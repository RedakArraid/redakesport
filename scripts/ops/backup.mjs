import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  acquireLock,
  checksum,
  composeArgs,
  countsFromOutput,
  expiredBackups,
  inspect,
  interruptionGuard,
  listBackups,
  options,
  root,
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
      'node scripts/ops/backup.mjs [--compose fichier] [--env-file fichier] [--project nom] [--output var/backups] [--retention-days 14]\nSauvegarde PostgreSQL et uploads avec un bref arrêt de app. Ne conserve aucun mot de passe de rôle PostgreSQL.',
    )
    return
  }
  const compose = composeArgs(config)
  const [dbId, appId] = await Promise.all(
    ['db', 'app'].map(async (service) => {
      const ids = (await run([...compose, 'ps', '-a', '-q', service]))
        .trim()
        .split('\n')
        .filter(Boolean)
      if (ids.length !== 1) throw new Error(`Un unique conteneur ${service} existant est requis.`)
      return ids[0]
    }),
  )
  const [db, app] = await Promise.all([inspect(dbId), inspect(appId)])
  if (!db.State.Running) throw new Error('Le service db doit être démarré.')
  const uploadPath = app.Config.Env.find((value) => value.startsWith('UPLOAD_DIR='))?.slice(11)
  const uploads = app.Mounts.find((mount) => mount.Destination === uploadPath)
  if (!uploads || uploads.Type !== 'volume')
    throw new Error('UPLOAD_DIR doit correspondre à un volume Docker dédié du service app.')
  const project = app.Config.Labels['com.docker.compose.project']
  if (!project || db.Config.Labels['com.docker.compose.project'] !== project)
    throw new Error('Les services db et app doivent appartenir au même projet Docker Compose.')
  const lockId = createHash('sha256').update(project).digest('hex').slice(0, 16)
  const release = await acquireLock(resolve(root, `var/ops/backup-${lockId}.lock`))
  const interruption = interruptionGuard()
  const createdAt = new Date().toISOString()
  const name = `${createdAt.replace(/:/g, '-').replace(/\.\d+Z$/, 'Z')}_${randomUUID().slice(0, 8)}`
  const target = resolve(config.output, name)
  const staging = resolve(config.output, `.${name}.partial`)
  let restart = false
  let completed = false
  try {
    await mkdir(staging, { recursive: true, mode: 0o700 })
    interruption.check()
    if (app.State.Running) {
      restart = true
      console.log('Arrêt bref de app pour figer PostgreSQL et les fichiers.')
      await run([...compose, 'stop', '-t', '30', 'app'])
    }
    interruption.check()
    const info = JSON.parse(
      await run([
        'exec',
        dbId,
        'sh',
        '-c',
        "psql -X -At -v ON_ERROR_STOP=1 -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -c \"SELECT json_build_object('name',current_database(),'user',current_user,'major',current_setting('server_version_num')::int / 10000)\"",
      ]),
    )
    const dumpCommands = [
      [
        'database.dump',
        ['exec', dbId, 'sh', '-c', 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
      ],
      [
        'roles.sql',
        [
          'exec',
          dbId,
          'sh',
          '-c',
          'pg_dumpall --roles-only --no-role-passwords -U "$POSTGRES_USER"',
        ],
      ],
      [
        'uploads.tar',
        [
          'run',
          '--rm',
          '--network',
          'none',
          '--read-only',
          '--mount',
          `type=volume,source=${uploads.Name},target=/uploads,readonly`,
          '--workdir',
          '/uploads',
          '--entrypoint',
          'tar',
          db.Image,
          '-cf',
          '-',
          '.',
        ],
      ],
      [
        'uploads-checksums.txt',
        [
          'run',
          '--rm',
          '--network',
          'none',
          '--read-only',
          '--mount',
          `type=volume,source=${uploads.Name},target=/uploads,readonly`,
          '--workdir',
          '/uploads',
          '--entrypoint',
          'sh',
          db.Image,
          '-c',
          uploadChecksums,
        ],
      ],
    ]
    for (const [filename, command] of dumpCommands) {
      interruption.check()
      const file = await open(resolve(staging, filename), 'wx', 0o600)
      try {
        await run(command, { outputFd: file.fd })
        await file.sync()
      } finally {
        await file.close()
      }
    }
    const tables = countsFromOutput(
      await run(
        [
          'exec',
          '-i',
          dbId,
          'sh',
          '-c',
          'psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
        ],
        { input: tableCountsSql },
      ),
    )
    const files = Object.fromEntries(
      await Promise.all(
        snapshotFiles.map(async (filename) => [
          filename,
          await checksum(resolve(staging, filename)),
        ]),
      ),
    )
    await writeFile(
      resolve(staging, 'manifest.json'),
      JSON.stringify({ version: 1, createdAt, project, database: info, files, tables }, null, 2) +
        '\n',
      { mode: 0o600 },
    )
    interruption.check()
    await rename(staging, target)
    completed = true
    console.log(`Sauvegarde complète : ${target}`)
  } finally {
    try {
      if (restart) {
        await run([...compose, 'start', 'app'])
        console.log('Service app redémarré.')
      }
    } finally {
      if (!completed) await rm(staging, { recursive: true, force: true })
      interruption.remove()
      await release()
    }
  }
  // Only publishable, recognized snapshots are eligible; always keep the newest one.
  const backups = await listBackups(config.output)
  for (const backup of expiredBackups(backups, project, config.retentionDays)) {
    let unlock
    try {
      unlock = await acquireLock(resolve(backup.path, '.verify.lock'), { createParent: false })
      await rm(backup.path, { recursive: true })
    } catch (error) {
      if (!['ELOCKED', 'ENOENT'].includes(error.code)) throw error
    } finally {
      await unlock?.()
    }
  }
  console.log(`Sauvegarde terminée ; rétention ${config.retentionDays} jours.`)
}

main().catch((error) => {
  console.error(`Échec de la sauvegarde : ${error.message}`)
  process.exitCode = 1
})
