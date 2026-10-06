import { broadcastStatusLabels } from '../../lib/labels'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Card, Btn, Badge, Spinner } from '../../components/ui'
import type { BroadcastStatus, StreamPlatform } from '../../types/database'
export function BroadcastPage() {
  const user = useAuthStore((s) => s.user),
    qc = useQueryClient(),
    addToast = useUIStore((s) => s.addToast)
  const [title, setTitle] = useState(''),
    [platform, setPlatform] = useState<StreamPlatform>('twitch'),
    [matchId, setMatchId] = useState(''),
    [vod, setVod] = useState<Record<string, string>>({})
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['broadcast-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('broadcast_sessions')
        .select('*')
        .eq('organizer_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
  const { data: matches = [] } = useQuery({
    queryKey: ['overlay-matches'],
    queryFn: async () => {
      const { data, error } = await db
        .from('matches')
        .select('*, tournaments(name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await db.from('broadcast_sessions').insert({
        organizer_id: user!.id,
        title: title.trim(),
        platform,
        match_id: matchId || null,
        status: 'offline',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setTitle('')
      void qc.invalidateQueries({ queryKey: ['broadcast-sessions'] })
    },
  })
  const update = useMutation({
    mutationFn: async ({
      id,
      status,
      url,
    }: {
      id: string
      status?: BroadcastStatus
      url?: string
    }) => {
      if (url && !/^https?:\/\//i.test(url)) throw new Error('Lien HTTP(S) requis')
      const { error } = await db
        .from('broadcast_sessions')
        .update({
          ...(status
            ? {
                status,
                ...(status === 'live'
                  ? { started_at: new Date().toISOString() }
                  : { ended_at: new Date().toISOString() }),
              }
            : {}),
          ...(url !== undefined ? { vod_url: url || null } : {}),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcast-sessions'] }),
  })
  async function copyOverlay(kind: string) {
    if (!matchId) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/overlay/${matchId}?view=${kind}`,
      )
      addToast('success', 'Adresse de l’overlay copiée')
    } catch {
      addToast('error', 'Copie impossible depuis ce navigateur')
    }
  }
  return (
    <div className="screen-enter">
      <h1>Broadcast & streaming</h1>
      <div style={{ display: 'grid', gap: 20 }}>
        <Card>
          <h2>Préparer une diffusion</h2>
          <div className="form-grid">
            <label>
              Titre
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </label>
            <label>
              Plateforme
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as StreamPlatform)}
              >
                {['twitch', 'youtube', 'kick', 'custom'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Match pour la diffusion et les overlays
            <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
              <option value="">Choisir un match</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tournaments?.name || 'Matchmaking'} · Match{' '}
                  {m.match_number || m.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <Btn disabled={!title.trim()} loading={create.isPending} onClick={() => create.mutate()}>
            Créer la diffusion
          </Btn>
          {create.error && <p role="alert">{create.error.message}</p>}
        </Card>
        <Card>
          <h2>Overlays OBS</h2>
          <p>
            Choisis un match, puis ajoute l’adresse comme source navigateur dans OBS (1920 × 1080).
            Le tournoi doit être public pour une source OBS sans connexion. Les scores sont
            actualisés toutes les 5 secondes.
          </p>
          <div className="action-row">
            {[
              ['scoreboard', 'Tableau de score'],
              ['winner', 'Écran de victoire'],
              ['bracket', 'Tableau du tournoi'],
            ].map(([kind, label]) => (
              <Btn
                key={kind}
                disabled={!matchId}
                variant="secondary"
                onClick={() => void copyOverlay(kind)}
              >
                Copier : {label}
              </Btn>
            ))}
            {matchId && (
              <a href={`/overlay/${matchId}`} target="_blank" rel="noreferrer">
                Prévisualiser ↗
              </a>
            )}
          </div>
        </Card>
        <Card>
          <h2>Mes diffusions et replays</h2>
          {isLoading ? (
            <Spinner />
          ) : !sessions.length ? (
            <p>Aucune diffusion enregistrée.</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} style={{ borderTop: '1px solid var(--border)', padding: '16px 0' }}>
                <h3>
                  {s.title} <Badge label={broadcastStatusLabels[s.status]} />
                </h3>
                <p>{s.platform}</p>
                <div className="action-row">
                  {s.status !== 'ended' && (
                    <Btn
                      variant="secondary"
                      loading={update.isPending}
                      onClick={() =>
                        update.mutate({
                          id: s.id,
                          status: s.status === 'offline' ? 'live' : 'ended',
                        })
                      }
                    >
                      {s.status === 'offline' ? 'Marquer en direct' : 'Terminer la diffusion'}
                    </Btn>
                  )}
                  {s.vod_url && (
                    <a href={s.vod_url} target="_blank" rel="noreferrer">
                      Voir le replay ↗
                    </a>
                  )}
                </div>
                <label>
                  Lien du replay
                  <input
                    type="url"
                    value={vod[s.id] ?? s.vod_url ?? ''}
                    placeholder="https://…"
                    onChange={(e) => setVod({ ...vod, [s.id]: e.target.value })}
                  />
                </label>
                <Btn
                  size="sm"
                  loading={update.isPending}
                  onClick={() => update.mutate({ id: s.id, url: vod[s.id] ?? s.vod_url ?? '' })}
                >
                  Enregistrer le replay
                </Btn>
              </div>
            ))
          )}
          {update.error && <p role="alert">{update.error.message}</p>}
        </Card>
        <Card>
          <h2>Guide de diffusion</h2>
          <ol>
            <li>Configure la connexion à Twitch, YouTube ou Kick directement dans OBS.</li>
            <li>Ajoute une source navigateur avec l’adresse de l’overlay.</li>
            <li>
              Marque la diffusion en direct ici, puis termine-la et enregistre le lien du replay.
            </li>
          </ol>
          <p>Les clés de diffusion restent dans ton logiciel de streaming.</p>
        </Card>
      </div>
    </div>
  )
}
