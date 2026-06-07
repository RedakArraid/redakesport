import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Card, Btn, Spinner } from '../../components/ui'

type Tab = 'streams' | 'overlays' | 'vod' | 'tools'

const PLATFORMS = ['twitch', 'youtube', 'kick'] as const
type Platform = typeof PLATFORMS[number]

interface BroadcastSession {
  id: string
  user_id: string
  title: string
  platform: Platform
  stream_key: string | null
  rtmp_url: string | null
  status: 'offline' | 'live' | 'ended'
  vod_url: string | null
  created_at: string
}

const OVERLAY_TEMPLATES = [
  {
    id: 'scoreboard',
    name: 'Scoreboard',
    description: 'Tableau de score en temps réel pour vos matches. Score, round, timer.',
    icon: '📊',
    key: 'scoreboard',
  },
  {
    id: 'lower-third',
    name: 'Lower Third',
    description: 'Bandeau bas de page avec nom du joueur, équipe et rôle.',
    icon: '🎬',
    key: 'lower-third',
  },
  {
    id: 'winner',
    name: 'Winner Screen',
    description: 'Écran de victoire animé avec logo de l\'équipe gagnante.',
    icon: '🏆',
    key: 'winner',
  },
  {
    id: 'bracket',
    name: 'Bracket',
    description: 'Arbre de tournoi mis à jour automatiquement.',
    icon: '🗂️',
    key: 'bracket',
  },
]

const DISCORD_COMMANDS = [
  { cmd: '!match', desc: 'Affiche le prochain match programmé' },
  { cmd: '!score', desc: 'Annonce le score du match en cours' },
  { cmd: '!standings', desc: 'Affiche le classement du tournoi actif' },
  { cmd: '!roster @team', desc: 'Liste les joueurs d\'une équipe' },
  { cmd: '!caster on/off', desc: 'Active/désactive le mode caster pour la voix' },
  { cmd: '!highlight <description>', desc: 'Marque un moment pour la VOD' },
]

function statusColor(status: string) {
  switch (status) {
    case 'live': return '#22c55e'
    case 'ended': return 'var(--muted)'
    default: return 'var(--blue)'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'live': return '● LIVE'
    case 'ended': return 'Terminé'
    default: return 'Offline'
  }
}

function platformIcon(platform: string) {
  switch (platform) {
    case 'twitch': return '🟣'
    case 'youtube': return '🔴'
    case 'kick': return '🟢'
    default: return '📡'
  }
}

export function BroadcastPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('streams')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', platform: 'twitch' as Platform, stream_key: '', rtmp_url: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['broadcast-sessions', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('broadcast_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as BroadcastSession[]
    },
    enabled: !!user,
  })

  const createSession = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non connecté')
      const { error } = await supabase
        .from('broadcast_sessions')
        .insert({
          user_id: user.id,
          title: form.title,
          platform: form.platform,
          stream_key: form.stream_key || null,
          rtmp_url: form.rtmp_url || null,
          status: 'offline',
        })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcast-sessions'] })
      setShowForm(false)
      setForm({ title: '', platform: 'twitch', stream_key: '', rtmp_url: '' })
    },
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'streams', label: 'Mes streams' },
    { id: 'overlays', label: 'Overlays' },
    { id: 'vod', label: 'VOD' },
    { id: 'tools', label: 'Outils caster' },
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

  const copyOverlayUrl = (key: string, id: string) => {
    const url = `https://overlay.redakesport.com/${key}?key=demo_${Math.random().toString(36).slice(2, 10)}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const vodSessions = (sessions ?? []).filter(s => s.vod_url)

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 24, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
        Broadcast & Streaming
      </div>

      {/* Tabs */}
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

      {/* ── Mes streams ── */}
      {tab === 'streams' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Btn onClick={() => setShowForm(s => !s)} variant={showForm ? 'secondary' : 'primary'}>
              {showForm ? '✕ Annuler' : '+ Nouveau stream'}
            </Btn>
          </div>

          {showForm && (
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 18 }}>
                Nouveau stream
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6 }}>Titre *</label>
                  <input
                    style={inputStyle}
                    placeholder="Ex: Finale Coupe Redak S3"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6 }}>Plateforme</label>
                  <select
                    style={inputStyle}
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{platformIcon(p)} {p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6 }}>Clé de stream</label>
                  <input
                    style={inputStyle}
                    placeholder="live_xxxxxxxx"
                    value={form.stream_key}
                    onChange={e => setForm(f => ({ ...f, stream_key: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6 }}>URL RTMP</label>
                  <input
                    style={inputStyle}
                    placeholder="rtmp://live.twitch.tv/app"
                    value={form.rtmp_url}
                    onChange={e => setForm(f => ({ ...f, rtmp_url: e.target.value }))}
                  />
                </div>
                <Btn
                  onClick={() => createSession.mutate()}
                  loading={createSession.isPending}
                  disabled={!form.title}
                >
                  Créer le stream
                </Btn>
                {createSession.isError && (
                  <div style={{ color: 'var(--accent)', fontSize: 13 }}>
                    Erreur: {(createSession.error as Error).message}
                  </div>
                )}
              </div>
            </Card>
          )}

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
          ) : !sessions || sessions.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Aucun stream configuré</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Créez votre premier stream ci-dessus.</div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map(s => (
                <Card key={s.id} style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 22 }}>{platformIcon(s.platform)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {s.platform} · {new Date(s.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 12px', borderRadius: 999,
                      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                      background: statusColor(s.status) + '20',
                      color: statusColor(s.status),
                    }}>
                      {statusLabel(s.status)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Overlays ── */}
      {tab === 'overlays' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {OVERLAY_TEMPLATES.map(tpl => (
            <Card key={tpl.id} style={{ padding: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{tpl.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                {tpl.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.5 }}>
                {tpl.description}
              </div>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => copyOverlayUrl(tpl.key, tpl.id)}
              >
                {copiedId === tpl.id ? '✓ Copié !' : 'Copier URL'}
              </Btn>
            </Card>
          ))}
        </div>
      )}

      {/* ── VOD ── */}
      {tab === 'vod' && (
        <div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
          ) : vodSessions.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎥</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Aucune VOD disponible</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Les VODs apparaîtront ici une fois vos streams terminés.</div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vodSessions.map(s => (
                <Card key={s.id} style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 22 }}>{platformIcon(s.platform)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {new Date(s.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <a
                      href={s.vod_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '7px 16px', borderRadius: 999,
                        background: 'var(--ink)', color: '#fff',
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                        textDecoration: 'none',
                      }}
                    >
                      ▶ Voir la VOD
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Outils caster ── */}
      {tab === 'tools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
              🤖 Commandes Discord Bot
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
              Ces commandes sont disponibles dans votre serveur Discord une fois le bot Redak Esport invité.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DISCORD_COMMANDS.map(c => (
                <div key={c.cmd} style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--mute-bg)',
                  border: '1px solid var(--border)',
                }}>
                  <code style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13,
                    fontWeight: 700, color: 'var(--blue)',
                    background: 'var(--blue)14', padding: '2px 8px',
                    borderRadius: 6, whiteSpace: 'nowrap',
                  }}>
                    {c.cmd}
                  </code>
                  <span style={{ fontSize: 13, color: 'var(--muted)', paddingTop: 2 }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
              📚 Documentation
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Retrouvez tous les guides pour les casters sur notre documentation officielle.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href="https://docs.redakesport.com/caster-guide"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 18px', borderRadius: 999,
                  background: 'var(--mute-bg)', color: 'var(--ink)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                  textDecoration: 'none', border: '1.5px solid var(--border)',
                }}
              >
                Guide Caster
              </a>
              <a
                href="https://docs.redakesport.com/overlays"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 18px', borderRadius: 999,
                  background: 'var(--mute-bg)', color: 'var(--ink)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                  textDecoration: 'none', border: '1.5px solid var(--border)',
                }}
              >
                Guide Overlays
              </a>
              <a
                href="https://docs.redakesport.com/discord-bot"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 18px', borderRadius: 999,
                  background: 'var(--mute-bg)', color: 'var(--ink)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                  textDecoration: 'none', border: '1.5px solid var(--border)',
                }}
              >
                Bot Discord
              </a>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
