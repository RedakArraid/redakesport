import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db, rowsByIds } from '../../lib/api'
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
  {
    method: 'POST',
    path: '/api/data',
    desc: 'Lecture des tournois, matchs et classements autorisés. Corps JSON : table, select, filters.',
  },
  {
    method: 'POST',
    path: '/api/actions/register_tournament',
    desc: 'Inscription à un tournoi : p_tournament_id et p_club_id (équipe).',
  },
  {
    method: 'POST',
    path: '/api/actions/submit_score',
    desc: 'Résultat : p_match_id, p_score1, p_score2. Session du participant requise.',
  },
  { method: 'GET', path: '/api/health', desc: 'Disponibilité de l’API et de PostgreSQL.' },
]
import { generateICS as generateICSFromMatches } from '../../lib/calendar'

export function IntegrationsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('discord')
  const [discordForm, setDiscordForm] = useState({ guild_id: '', channel_id: '', webhook_url: '' })
  const [testResult, setTestResult] = useState<null | 'ok' | 'error'>(null)
  const [testLoading, setTestLoading] = useState(false)

  const { data: discordIntegration, isLoading: loadingDiscord } = useQuery({
    queryKey: ['discord-integration', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await db
        .from('discord_integrations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setDiscordForm({
          guild_id: data.guild_id,
          channel_id: data.channel_id ?? '',
          webhook_url: data.webhook_url ?? '',
        })
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
        const { error } = await db
          .from('discord_integrations')
          .update(payload)
          .eq('id', discordIntegration.id)
        if (error) throw error
      } else {
        const { error } = await db.from('discord_integrations').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discord-integration'] }),
  })

  const testWebhook = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const { error } = await db.functions.invoke('discord-webhook', {
        body: {
          webhook_url: discordForm.webhook_url,
          message: { title: 'Test Redak eSport', description: 'Webhook opérationnel !' },
        },
      })
      setTestResult(error ? 'error' : 'ok')
    } catch {
      setTestResult('error')
    } finally {
      setTestLoading(false)
    }
  }

  const downloadMyICS = useMutation({
    mutationFn: async () => {
      if (!user) return 0
      const { data: clubMembers, error: clubsError } = await db
        .from('club_members')
        .select('club_id')
        .eq('player_id', user.id)
      if (clubsError) throw clubsError
      const teamIds = [user.id, ...(clubMembers ?? []).map((c) => c.club_id)]

      let matchQuery = db
        .from('matches')
        .select('id, scheduled_at, team1_id, team2_id, tournament_id, status')
        .not('scheduled_at', 'is', null)

      if (teamIds.length > 0) {
        matchQuery = matchQuery.or(
          `team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`,
        )
      }

      const { data: matches, error } = await matchQuery.all()
      if (error) throw error
      if (!matches || matches.length === 0) return 0

      const teamIdsAll = [
        ...new Set(
          [...matches.map((m) => m.team1_id), ...matches.map((m) => m.team2_id)].filter(
            (id): id is string => !!id,
          ),
        ),
      ]
      const tIds = [
        ...new Set(matches.map((m) => m.tournament_id).filter((id): id is string => !!id)),
      ]
      const [clubs, profiles, tournaments] = await Promise.all([
        rowsByIds('clubs', teamIdsAll, 'id,name'),
        rowsByIds('profiles', teamIdsAll, 'id,username'),
        rowsByIds('tournaments', tIds, 'id,name,status'),
      ])
      const tMap: Record<string, string> = {}
      for (const t of tournaments ?? []) tMap[t.id] = t.name
      const teamMap: Record<string, string> = {}
      for (const c of clubs ?? []) teamMap[c.id] = c.name
      for (const p of profiles ?? []) if (!teamMap[p.id]) teamMap[p.id] = p.username

      const cancelled = new Set(
        tournaments.filter((t) => t.status === 'cancelled').map((t) => t.id),
      )
      const enriched = matches
        .filter((m) => m.status === 'completed' || !cancelled.has(m.tournament_id))
        .map((m) => ({
          id: m.id,
          scheduled_at: m.scheduled_at!,
          team1_name: teamMap[m.team1_id ?? ''],
          team2_name: teamMap[m.team2_id ?? ''],
          tournament_name: m.tournament_id ? tMap[m.tournament_id] : undefined,
        }))
      if (enriched.length === 0) return 0

      const ics = generateICSFromMatches(enriched)
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mes-matches-redak.ics'
      a.click()
      URL.revokeObjectURL(url)
      return enriched.length
    },
  })

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
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--muted)',
    fontFamily: 'var(--font-display)',
    display: 'block',
    marginBottom: 6,
  }

  return (
    <div className="screen-enter">
      <div
        style={{
          marginBottom: 24,
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: -0.5,
        }}
      >
        Intégrations
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          background: 'var(--mute-bg)',
          borderRadius: 999,
          padding: 4,
          width: 'fit-content',
        }}
      >
        {tabs.map((t) => (
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
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
                  Discord Webhook
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Enregistrez votre webhook et vérifiez son fonctionnement avec un message de test.
                </div>
              </div>
            </div>

            {loadingDiscord ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Spinner size={24} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label htmlFor="discord-guild" style={labelStyle}>
                    Guild ID (Serveur Discord)
                  </label>
                  <input
                    id="discord-guild"
                    style={inputStyle}
                    placeholder="123456789012345678"
                    value={discordForm.guild_id}
                    onChange={(e) => setDiscordForm((f) => ({ ...f, guild_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="discord-channel" style={labelStyle}>
                    Channel ID
                  </label>
                  <input
                    id="discord-channel"
                    style={inputStyle}
                    placeholder="987654321098765432"
                    value={discordForm.channel_id}
                    onChange={(e) => setDiscordForm((f) => ({ ...f, channel_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="discord-webhook" style={labelStyle}>
                    Webhook URL *
                  </label>
                  <input
                    id="discord-webhook"
                    style={inputStyle}
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordForm.webhook_url}
                    onChange={(e) => setDiscordForm((f) => ({ ...f, webhook_url: e.target.value }))}
                  />
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
                  <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
                    ✓ Webhook fonctionnel !
                  </div>
                )}
                {testResult === 'error' && (
                  <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                    ✕ Erreur lors du test. Vérifiez l'URL.
                  </div>
                )}
                {saveDiscord.isError && (
                  <div style={{ color: 'var(--accent)', fontSize: 13 }}>
                    {(saveDiscord.error as Error).message}
                  </div>
                )}
                {saveDiscord.isSuccess && (
                  <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
                    ✓ Configuration sauvegardée
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── API ── */}
      {tab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <h2>API de la plateforme</h2>
            <p>
              Adresse : <code>{window.location.origin}/api</code>
            </p>
            <p>
              Les actions utilisent la session du compte connecté. Les données publiques peuvent
              être consultées sans compte. Les autorisations sont contrôlées à chaque requête.
            </p>
          </Card>
          <Card style={{ padding: 24 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 16,
                marginBottom: 16,
              }}
            >
              📋 Endpoints disponibles
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {API_ENDPOINTS.map((ep) => (
                <div
                  key={ep.path}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--mute-bg)',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 800,
                      color: ep.method === 'GET' ? '#22c55e' : 'var(--blue)',
                      background: ep.method === 'GET' ? '#22c55e18' : '#2547ff18',
                      padding: '2px 8px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ep.method}
                  </span>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--ink)',
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {ep.path}
                  </code>
                  <span
                    style={{ fontSize: 12, color: 'var(--muted)', width: '100%', paddingLeft: 58 }}
                  >
                    {ep.desc}
                  </span>
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
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 16,
                marginBottom: 8,
              }}
            >
              📅 Exporter votre calendrier
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.6 }}>
              Téléchargez vos matches au format iCal (.ics) ou ajoutez-les directement à votre
              agenda.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Btn
                onClick={() => downloadMyICS.mutate()}
                loading={downloadMyICS.isPending}
                disabled={!user}
                style={{ whiteSpace: 'normal' }}
              >
                ⬇ Télécharger iCal (mes matches)
              </Btn>

              {downloadMyICS.isSuccess && downloadMyICS.data === 0 && (
                <p role="status">Aucun match programmé à exporter.</p>
              )}
              {downloadMyICS.isError && (
                <p role="alert" style={{ color: 'var(--accent)' }}>
                  {downloadMyICS.error.message}
                </p>
              )}

              <p>
                Importe le fichier .ics téléchargé dans Google Calendar, Outlook ou Apple Calendar.
                Exporte-le à nouveau après un changement de programmation.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
