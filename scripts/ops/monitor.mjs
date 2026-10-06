import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { backupManifest, snapshotFiles } from './common.mjs'

export async function latestBackupTime(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  let latest = null
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    try {
      const folder = resolve(directory, entry.name)
      const manifest = await backupManifest(folder)
      const created = Date.parse(manifest.createdAt)
      if (manifest.version !== 1 || !Number.isFinite(created)) continue
      for (const name of snapshotFiles) {
        const file = await stat(resolve(folder, name))
        if (!manifest.files?.[name]?.sha256 || file.size !== manifest.files[name].bytes)
          throw new Error('Incomplete backup')
      }
      latest = Math.max(latest || 0, created)
    } catch {
      // An incomplete backup must never mask the absence of a usable backup.
    }
  }
  return latest
}

export async function inspectServices({
  url,
  backupDir,
  maxAgeHours = 26,
  timeoutMs = 10000,
  now = Date.now(),
  fetcher = fetch,
}) {
  const issues = []
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    })
    const health = await response.json()
    if (!response.ok || health.status !== 'ok' || health.database !== 'postgresql')
      throw new Error('Unexpected health response')
  } catch {
    issues.push('API ou PostgreSQL indisponible')
  }
  const backupTime = await latestBackupTime(backupDir)
  if (backupTime === null) issues.push('Aucune sauvegarde complète disponible')
  else if (backupTime > now + 60000 || now - backupTime > maxAgeHours * 3600000)
    issues.push('Sauvegarde trop ancienne ou horloge incorrecte')
  return {
    checkedAt: new Date(now).toISOString(),
    issues,
    latestBackup: backupTime === null ? null : new Date(backupTime).toISOString(),
  }
}

export function nextMonitorState(previous, report, threshold = 2) {
  const failures = report.issues.length ? (previous.failures || 0) + 1 : 0
  const incident = report.issues.join('; ')
  const event =
    failures >= threshold && previous.notifiedIncident !== incident
      ? { type: 'incident', text: `Redak Esport : ${incident}` }
      : !failures && previous.notifiedIncident
        ? { type: 'recovery', text: 'Redak Esport : service et sauvegardes de nouveau disponibles' }
        : null
  return {
    state: { ...report, failures, notifiedIncident: previous.notifiedIncident || '' },
    event,
  }
}

export async function monitor(options) {
  let previous = {}
  try {
    previous = JSON.parse(await readFile(options.stateFile, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('État de surveillance illisible')
  }
  const report = await inspectServices(options)
  const { state, event } = nextMonitorState(previous, report, options.threshold)
  let deliveryFailed = false
  if (event && options.webhookUrl) {
    try {
      const response = await (options.fetcher || fetch)(options.webhookUrl, {
        method: 'POST',
        redirect: 'error',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...event, checkedAt: report.checkedAt }),
        signal: AbortSignal.timeout(options.timeoutMs || 10000),
      })
      if (!response.ok) throw new Error('Alert rejected')
      state.notifiedIncident = event.type === 'incident' ? report.issues.join('; ') : ''
    } catch {
      deliveryFailed = true
    }
  }
  await mkdir(dirname(options.stateFile), { recursive: true, mode: 0o700 })
  const temporary = `${options.stateFile}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 })
  await rename(temporary, options.stateFile)
  return {
    ...report,
    consecutiveFailures: state.failures,
    alerting: options.webhookUrl ? 'configured' : 'disabled',
    deliveryFailed,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({
      options: {
        url: { type: 'string' },
        'backup-dir': { type: 'string' },
        state: { type: 'string' },
        'max-backup-age-hours': { type: 'string' },
        'timeout-ms': { type: 'string' },
        failures: { type: 'string' },
      },
    })
    const positive = (value, fallback) => {
      const number = Number(value || fallback)
      if (!Number.isFinite(number) || number <= 0) throw new Error('Paramètre numérique invalide')
      return number
    }
    const url =
      values.url ||
      process.env.MONITOR_URL ||
      (process.env.APP_DOMAIN
        ? `https://${process.env.APP_DOMAIN}/api/health`
        : 'http://localhost:5175/api/health')
    const webhookUrl = process.env.MONITOR_WEBHOOK_URL
    for (const value of [url, webhookUrl].filter(Boolean)) {
      const parsed = new URL(value)
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
        throw new Error('URL de surveillance invalide')
      if (
        parsed.protocol !== 'https:' &&
        !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
      )
        throw new Error('HTTPS requis hors environnement local')
    }
    const result = await monitor({
      url,
      webhookUrl,
      backupDir: resolve(values['backup-dir'] || 'var/backups'),
      stateFile: resolve(values.state || 'var/monitor-state.json'),
      maxAgeHours: positive(values['max-backup-age-hours'], 26),
      timeoutMs: positive(values['timeout-ms'], 10000),
      threshold: positive(values.failures, 2),
    })
    console.log(JSON.stringify(result))
    if (result.issues.length || result.deliveryFailed) process.exitCode = 1
  } catch {
    console.error('Surveillance impossible : vérifier les paramètres, fichiers et permissions.')
    process.exitCode = 1
  }
}
