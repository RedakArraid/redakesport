import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const snapshotFiles = ['database.dump', 'roles.sql', 'uploads.tar', 'uploads-checksums.txt']
export const uploadChecksums =
  'set -o pipefail; if [ -n "$(find . ! -type d ! -type f -print -quit)" ]; then exit 1; fi; find . -type f -print0 | xargs -0 -r sha256sum | LC_ALL=C sort'
export const tableCountsSql = String.raw`
SELECT format('SELECT %L || chr(9) || count(*) FROM %I.%I;', schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables WHERE schemaname !~ '^pg_' AND schemaname <> 'information_schema'
ORDER BY schemaname, tablename
\gexec
`

export function options(argv = process.argv.slice(2)) {
  const parsed = {
    compose: resolve(root, 'docker-compose.yml'),
    output: resolve(root, 'var/backups'),
    retentionDays: 14,
  }
  const values = new Map([
    ['--compose', 'compose'],
    ['--env-file', 'envFile'],
    ['--project', 'project'],
    ['--output', 'output'],
    ['--backup', 'backup'],
    ['--retention-days', 'retentionDays'],
  ])
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--latest' || arg === '--help') {
      parsed[arg.slice(2)] = true
      continue
    }
    const key = values.get(arg)
    if (!key || !argv[index + 1] || argv[index + 1].startsWith('--'))
      throw new Error(`Option invalide ou valeur manquante : ${arg}`)
    parsed[key] = argv[++index]
  }
  parsed.retentionDays = Number(parsed.retentionDays)
  if (!Number.isInteger(parsed.retentionDays) || parsed.retentionDays < 1)
    throw new Error('--retention-days doit être un entier positif.')
  for (const key of ['compose', 'output', 'envFile', 'backup'])
    if (parsed[key]) parsed[key] = resolve(parsed[key])
  if (parsed.project && !/^[a-z0-9][a-z0-9_-]*$/.test(parsed.project))
    throw new Error('Nom de projet Docker invalide.')
  return parsed
}

export function composeArgs(config) {
  return [
    'compose',
    '-f',
    config.compose,
    ...(config.envFile ? ['--env-file', config.envFile] : []),
    ...(config.project ? ['--project-name', config.project] : []),
  ]
}

// Docker output can contain credentials: keep it private, including on failure.
export function run(args, { input, inputFile, outputFd, timeout = 600_000 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('docker', args, {
      cwd: root,
      stdio: ['pipe', outputFd ?? 'pipe', 'pipe'],
      timeout,
    })
    const chunks = []
    child.stdout?.on('data', (chunk) => chunks.push(chunk))
    child.stderr.on('data', () => {})
    child.on('error', () => reject(new Error('Impossible de lancer Docker.')))
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`La commande Docker ${args[0]} a échoué (code ${code}).`))
      else resolvePromise(Buffer.concat(chunks).toString('utf8'))
    })
    child.stdin.on('error', () => {})
    if (inputFile) {
      const stream = createReadStream(inputFile)
      stream.on('error', () => {
        child.kill()
        reject(new Error('Impossible de lire le fichier de sauvegarde.'))
      })
      stream.pipe(child.stdin)
    } else child.stdin.end(input)
  })
}

export async function inspect(id) {
  return JSON.parse(await run(['inspect', id]))[0]
}

export async function checksum(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return { bytes: (await stat(path)).size, sha256: hash.digest('hex') }
}

export async function acquireLock(path, { createParent = true } = {}) {
  if (createParent) await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  try {
    await mkdir(path, { mode: 0o700 })
  } catch (error) {
    if (error.code === 'EEXIST') {
      const locked = new Error(
        `Opération déjà verrouillée : ${path}. Si elle a été interrompue brutalement, vérifier son arrêt avant de retirer ce verrou.`,
      )
      locked.code = 'ELOCKED'
      throw locked
    }
    throw error
  }
  const token = randomUUID()
  try {
    await writeFile(
      resolve(path, 'owner.json'),
      JSON.stringify({
        token,
        pid: process.pid,
        host: hostname(),
        createdAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    )
  } catch (error) {
    await rm(path, { recursive: true, force: true })
    throw error
  }
  return async () => {
    try {
      const owner = JSON.parse(await readFile(resolve(path, 'owner.json'), 'utf8'))
      if (owner.token === token) await rm(path, { recursive: true })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
}

export async function backupManifest(directory) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'))
  if (
    manifest.version !== 1 ||
    !Number.isFinite(Date.parse(manifest.createdAt)) ||
    (manifest.project !== undefined && !/^[a-z0-9][a-z0-9_-]*$/.test(manifest.project)) ||
    !Number.isInteger(manifest.database?.major) ||
    manifest.database.major < 14 ||
    manifest.database.major > 99 ||
    typeof manifest.database.user !== 'string' ||
    !Array.isArray(manifest.tables) ||
    !manifest.tables.every((row) => typeof row.table === 'string' && /^\d+$/.test(row.count))
  )
    throw new Error('Manifest de sauvegarde invalide.')
  for (const name of snapshotFiles) {
    const record = manifest.files?.[name]
    if (!record || !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.bytes))
      throw new Error(`Manifest incomplet : ${name}`)
  }
  return manifest
}

export async function listBackups(directory) {
  let names
  try {
    names = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const result = []
  for (const entry of names) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}T[\d-]+Z_[a-f0-9]{8}$/.test(entry.name))
      continue
    const path = resolve(directory, entry.name)
    try {
      result.push({ path, manifest: await backupManifest(path) })
    } catch {
      // Never prune folders that we cannot positively identify as our own backups.
    }
  }
  return result.sort((a, b) => Date.parse(b.manifest.createdAt) - Date.parse(a.manifest.createdAt))
}

export function expiredBackups(backups, project, retentionDays, now = Date.now()) {
  const own = backups
    .filter((backup) => backup.manifest.project === project)
    .sort((a, b) => Date.parse(b.manifest.createdAt) - Date.parse(a.manifest.createdAt))
  const cutoff = now - retentionDays * 86_400_000
  return own.slice(1).filter((backup) => Date.parse(backup.manifest.createdAt) < cutoff)
}

export function countsFromOutput(output) {
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const index = line.lastIndexOf('\t')
      if (index < 1 || !/^\d+$/.test(line.slice(index + 1)))
        throw new Error('Comptage des tables invalide.')
      return { table: line.slice(0, index), count: line.slice(index + 1) }
    })
}

export function interruptionGuard() {
  let interrupted = false
  const handler = () => {
    interrupted = true
  }
  process.on('SIGINT', handler)
  process.on('SIGTERM', handler)
  return {
    check() {
      if (interrupted) throw new Error('Opération interrompue ; nettoyage en cours.')
    },
    remove() {
      process.off('SIGINT', handler)
      process.off('SIGTERM', handler)
    },
  }
}
