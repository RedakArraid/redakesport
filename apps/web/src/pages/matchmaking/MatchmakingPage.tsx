import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useRealtimeChannel } from '../../hooks/useRealtime'
import { Card, Badge, Btn, SectionTitle } from '../../components/ui'

export function MatchmakingPage() {
  const { user, profile } = useAuthStore()
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  const { data: queueEntry, isLoading } = useQuery({
    queryKey: ['matchmaking-queue', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('matchmaking_queue').select('*').eq('player_id', user!.id).maybeSingle()
      return data
    },
    enabled: !!user,
  })

  // Realtime: notifié quand un lobby est trouvé
  useRealtimeChannel(
    `matchmaking:${user?.id}`,
    {
      table: 'matchmaking_queue',
      filter: `player_id=eq.${user?.id}`,
      onUpdate: (payload) => {
        const row = payload.new as { status: string }
        if (row.status === 'matched') {
          addToast('success', '🎯 Match trouvé ! Prépare-toi.')
          qc.invalidateQueries({ queryKey: ['matchmaking-queue'] })
        }
      },
    },
    [user?.id],
  )

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('matchmaking_queue').insert({
        player_id: user!.id,
        elo_rating: profile?.elo_rating ?? 1000,
        queue_type: 'solo',
        status: 'searching',
      })
      if (error) throw error
    },
    onSuccess: () => { addToast('info', 'Recherche en cours...'); qc.invalidateQueries({ queryKey: ['matchmaking-queue'] }) },
    onError: (e: Error) => addToast('error', e.message),
  })

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('matchmaking_queue').delete().eq('player_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => { addToast('info', 'File d\'attente quittée'); qc.invalidateQueries({ queryKey: ['matchmaking-queue'] }) },
    onError: (e: Error) => addToast('error', e.message),
  })

  const inQueue = !!queueEntry && queueEntry.status === 'searching'
  const matched = queueEntry?.status === 'matched'

  React.useEffect(() => {
    if (!inQueue) return

    // Appeler matchmaking-tick immédiatement
    supabase.functions.invoke('matchmaking-tick').catch(console.error)

    const interval = setInterval(() => {
      supabase.functions.invoke('matchmaking-tick').catch(console.error)
    }, 10000) // Toutes les 10 secondes

    return () => clearInterval(interval)
  }, [inQueue])

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Matchmaking</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Trouve un adversaire à ton niveau</div>
      </div>

      {/* ELO Card */}
      <Card style={{ marginBottom: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: '#fff',
        }}>
          {profile?.elo_rating ?? 1000}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>Ton ELO actuel</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Recherche dans la plage ±200 ELO</div>
        </div>
      </Card>

      {/* Queue status */}
      <Card style={{ padding: '28px 32px', textAlign: 'center', marginBottom: 20 }}>
        {matched ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Match trouvé !</div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Rejoins ton lobby et prépare-toi.</div>
            <Btn size="lg">Rejoindre le lobby</Btn>
          </>
        ) : inQueue ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
                borderRadius: '50%', animation: 'spin 1s linear infinite',
              }} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
              Recherche en cours...
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              ELO cible : {Math.max(0, (profile?.elo_rating ?? 1000) - 200)} — {(profile?.elo_rating ?? 1000) + 200}
            </div>
            <Btn variant="secondary" onClick={() => leaveMutation.mutate()} loading={leaveMutation.isPending}>
              Quitter la file
            </Btn>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
              Prêt à jouer ?
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
              Lance une recherche de match · Solo · Ranked
            </div>
            <Btn size="lg" onClick={() => joinMutation.mutate()} loading={joinMutation.isPending || isLoading}>
              Rechercher un match
            </Btn>
          </>
        )}
      </Card>

      <SectionTitle>Comment ça marche</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { icon: '🔍', title: 'Recherche', desc: 'On trouve un adversaire dans ±200 ELO' },
          { icon: '🎮', title: 'Lobby', desc: 'Rejoins le serveur et jouez' },
          { icon: '📊', title: 'Score', desc: 'Soumettez le score · L\'ELO se met à jour' },
        ].map((s) => (
          <Card key={s.title} style={{ padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
