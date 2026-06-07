import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Card, Btn, Spinner } from '../../components/ui'

type Tab = 'discord' | 'api' | 'calendar'

interface DiscordIntegration {
  id: string
  user_id: string
  guild_id: string
  channel_id: string
  webhook_url: string
  created_at: string
}

const API_ENDPOINTS = [
  { method: 'GET', path: '/rest/v1/tournaments', desc: 'Liste tous les tournois publics' },
  { method: 'GET', path: '/rest/v1/tournaments?id=eq.{id}', desc: 'Détails d\'un tournoi' },
  { method: 'GET', path: '/rest/v1/matches?tournament_id=eq.{id}', desc: 'Matches d\'un tournoi' },
  { method: 'GET', path: '/rest/v1/profiles?order=elo_rating.desc', desc: 'Classement ELO global' },
  { method: 'GET', path: '/rest/v1/standings?tournament_id=eq.{id}', desc: 'Classement d\'un tournoi' },
  { method: 'GET', path: '/rest/v1/clubs', desc: 'Liste des clubs/équipes' },
  { method: 'POST', path: '/rest/v1/score_submissions', desc: 'Soumettre un score (auth requis)' },
]

function generateICSFromMatches(matches: { id: string; scheduled_at: string; team1_name?: string; team2_name?: string; tournament_name?: string }[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Redak Esport//Calendar//FR',
    'CALSCALE:GREGORIAN',
  ]
  for (const m of matches) {
    const d = new Date(m.scheduled_at)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = new Date(d.getTime() + 3600000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.id}@redakesport.com`,
      `DTSTART:${fmt(d)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${m.team1_name ?? 'Équipe 1'} vs ${m.team2_name ?? 'Équipe 2'}`,
      `DESCRIPTION:Tournoi: ${m.tournament_name ?? ''}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function IntegrationsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('discord')
  const [discordForm, setDiscordForm] = useState({ guild_id: '', channel_id: '', webhook_url: '' })
  const [showKey, setShowKey] = useState(false)
  const [testResult, setTestResult] = useState<null | 'ok' | 'error'>(null)
  const [testLoading, setTestLoading] = useState(false)

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  const maskedKey = ANON_KEY ? ANON_KEY.slice(0, 8) + '••••••••••••••••••••••••••••' + ANON_KEY.slice(-6) : '(non configurée)'

  const { data: discordIntegration, isLoading: loadingDiscord } = useQuery({
    queryKey: ['discord-integration', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase
        .from('discord_integrations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setDiscordForm({ guild_id: data.guild_id, channel_id: data.channel_id, webhook_url: data.webhook_url })
      }
      return data as DiscordIntegration | null
    },
    enabled: !!user,
  })

  const saveDiscord = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non connecté')
      const payload = { ...discordForm, user_id: user.id }
      if (discordIntegration) {
        const { error } = await supabase
          .from('discord_integrations')
          .update(payload)
          .eq('id', discordIntegration.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('discord_integrations')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discord-integration'] }),
  })

  const testWebhook = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const { error } = await supabase.functions.invoke('discord-webhook', {
        body: { webhook_url: discordForm.webhook_url, message: '✅ Test Redak Esport — webhook opérationnel !' },
      })
      setTestResult(error ? 'error' : 'ok')
    } catch {
      setTestResult('error')
    } finally {
      setTestLoading(false)
    }
  }

  const downloadMyICS = async () => {
    if (!user) return
    const { data: clubMembers } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id)
    const teamIds = (clubMembers ?? []).map(c => c.club_id)

    let matchQuery = supabase
      .from('matches')
      .select('id, scheduled_at, team1_id, team2_id, tournament_id')
      .not('scheduled_at', 'is', null)

    if (teamIds.length > 0) {
      matchQuery = matchQuery.or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
    }

    const { data: matches } = await matchQuery
    if (!matches || matches.length === 0) return

    const teamIdsAll = [...new Set([...matches.map(m => m.team1_id), ...matches.map(m => m.team2_id)])]
    const tIds = [...new Set(matches.map(m => m.tournament_id).filter(Boolean))]
    const [{ data: clubs }, { data: profiles }, { data: tournaments }] = await Promise.all([
      supabase.from('clubs').select('id, name').in('id', teamIdsAll),
      supabase.from('profiles').select('id, username').in('id', teamIdsAll),
      supabase.from('tournaments').select('id, name').in('id', tIds),
    ])
    const tMap: Record<string, string> = {}
    for (const t of tournaments ?? []) tMap[t.id] = t.name
    const teamMap: Record<string, string> = {}
    for (const c of clubs ?? []) teamMap[c.id] = c.name
    for (const p of profiles ?? []) if (!teamMap[p.id]) teamMap[p.id] = p.username

    const enriched = matches.map(m => ({
      id: m.id,
      scheduled_at: m.scheduled_at,
      team1_name: teamMap[m.team1_id],
      team2_name: teamMap[m.team2_id],
      tournament_name: m.tournament_id ? tMap[m.tournament_id] : undefined,
    }))

    const ics = generateICSFromMatches(enriched)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'mes-matches-redak.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'discord', label: 'Discord' },
    { id: 'api', label: 'API' },
    { id: 'calendar', label: 'Calendrier' },
  ]

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '9px 20px',
    borderRadius: 999,
    border: 'none',
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    transition: 'all 0.15s',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1.5px solid var(--border)',
    background: 'var(--mute-bg)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--muted)',
    fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6,
  }

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 24, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
        Intégrations
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: 'var(--mute-bg)', borderRadius: 999,
        padding: 4, width: 'fit-content',
      }}>
        {tabs.map(t => (
          <button key={t.id} style={tabStyle(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Discord ── */}
      {tab === 'discord' && (
        <div style={{ maxWidth: 560 }}>
          <Card style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 28 }}>🎮</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>Discord Webhook</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Recevez des notifications automatiques dans votre serveur Discord.
                </div>
              </div>
            </div>

            {loadingDiscord ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size={24} /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Guild ID (Serveur Discord)</label>
                  <input style={inputStyle} placeholder="123456789012345678" value={discordForm.guild_id}
                    onChange={e => setDiscordForm(f => ({ ...f, guild_id: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Channel ID</label>
                  <input style={inputStyle} placeholder="987654321098765432" value={discordForm.channel_id}
                    onChange={e => setDiscordForm(f => ({ ...f, channel_id: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Webhook URL *</label>
                  <input style={inputStyle} placeholder="https://discord.com/api/webhooks/..." value={discordForm.webhook_url}
                    onChange={e => setDiscordForm(f => ({ ...f, webhook_url: e.target.value }))} />
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Btn
                    onClick={() => saveDiscord.mutate()}
                    loading={saveDiscord.isPending}
                    disabled={!discordForm.webhook_url}
                  >
                    {discordIntegration ? 'Mettre à jour' : 'Enregistrer'}
                  </Btn>
                  <Btn
                    variant="secondary"
                    onClick={testWebhook}
                    loading={testLoading}
                    disabled={!discordForm.webhook_url}
                  >
                    Tester le webhook
                  </Btn>
                </div>

                {testResult === 'ok' && (
                  <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>✓ Webhook fonctionnel !</div>
                )}
                {testResult === 'error' && (
                  <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>✕ Erreur lors du test. Vérifiez l'URL.</div>
                )}
                {saveDiscord.isError && (
                  <div style={{ color: 'var(--accent)', fontSize: 13 }}>{(saveDiscord.error as Error).message}</div>
                )}
                {saveDiscord.isSuccess && (
                  <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>✓ Configuration sauvegardée</div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── API ── */}
      {tab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 16 }}>
              🔑 Clé API publique
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
              Base URL: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--blue)' }}>{SUPABASE_URL}</code>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <code style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                background: 'var(--mute-bg)',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                wordBreak: 'break-all',
                color: 'var(--ink)',
              }}>
                {showKey ? ANON_KEY : maskedKey}
              </code>
              <Btn variant="secondary" size="sm" onClick={() => setShowKey(s => !s)}>
                {showKey ? 'Masquer' : 'Révéler'}
              </Btn>
              {showKey && ANON_KEY && (
                <Btn variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(ANON_KEY)}>
                  Copier
                </Btn>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              Ajoutez le header <code style={{ fontFamily: 'var(--font-mono)' }}>apikey: &lt;clé&gt;</code> à chaque requête.
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 16 }}>
              📋 Endpoints disponibles
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {API_ENDPOINTS.map(ep => (
                <div key={ep.path} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--mute-bg)', border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
                    color: ep.method === 'GET' ? '#22c55e' : 'var(--blue)',
                    background: (ep.method === 'GET' ? '#22c55e' : 'var(--blue)') + '18',
                    padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                  }}>
                    {ep.method}
                  </span>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', flex: 1, wordBreak: 'break-all' }}>
                    {ep.path}
                  </code>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: '100%', paddingLeft: 58 }}>{ep.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Calendrier ── */}
      {tab === 'calendar' && (
        <div style={{ maxWidth: 480 }}>
          <Card style={{ padding: 28 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              📅 Exporter votre calendrier
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.6 }}>
              Téléchargez vos matches au format iCal (.ics) ou ajoutez-les directement à votre agenda.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Btn onClick={downloadMyICS} disabled={!user}>
                ⬇ Télécharger iCal (mes matches)
              </Btn>

              <div style={{
                padding: '16px 18px', borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--mute-bg)',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                  Ajouter à votre agenda
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href={`https://calendar.google.com/calendar/render?cid=webcal://${window.location.hostname}/api/calendar/${user?.id}.ics`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px', borderRadius: 999,
                      background: '#4285F4', color: '#fff',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                      textDecoration: 'none', display: 'inline-block',
                    }}
                  >
                    Google Calendar
                  </a>
                  <a
                    href={`webcal://${window.location.hostname}/api/calendar/${user?.id}.ics`}
                    style={{
                      padding: '8px 16px', borderRadius: 999,
                      background: 'var(--ink)', color: '#fff',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                      textDecoration: 'none', display: 'inline-block',
                    }}
                  >
                    Apple iCal
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
