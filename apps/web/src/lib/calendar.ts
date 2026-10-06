export interface CalendarMatch {
  id: string
  scheduled_at: string
  team1_name?: string
  team2_name?: string
  tournament_name?: string
}
const escape = (s: string) =>
  s
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
// RFC 5545 folds by UTF-8 octets, not JS string length.
function fold(line: string) {
  let out = '',
    bytes = 0
  for (const char of line) {
    const n = new TextEncoder().encode(char).length
    if (bytes + n > 75) {
      out += '\r\n '
      bytes = 1
    }
    out += char
    bytes += n
  }
  return out
}
export function generateICS(matches: CalendarMatch[], now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Redak Esport//Calendar//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const m of matches) {
    const start = new Date(m.scheduled_at)
    if (!Number.isFinite(start.getTime())) continue
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escape(m.id)}@redakesport`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(new Date(start.getTime() + 3600000))}`,
      `SUMMARY:${escape(`${m.team1_name || 'Équipe 1'} vs ${m.team2_name || 'Équipe 2'}`)}`,
      `DESCRIPTION:${escape(`Tournoi : ${m.tournament_name || 'Matchmaking'}`)}`,
      'END:VEVENT',
    )
  }
  return [...lines, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n'
}
