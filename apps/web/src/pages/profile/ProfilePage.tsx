import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Card, SectionTitle, Btn, Badge, Spinner } from '../../components/ui'
import type { EloHistory } from '../../types/database'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function ProfilePage() {
  const { user, profile, setProfile } = useAuthStore()
  const { addToast } = useUIStore()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [discordTag, setDiscordTag] = useState(profile?.discord_tag ?? '')

  const { data: eloHistory, isLoading: eloLoading } = useQuery({
    queryKey: ['elo-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elo_history')
        .select('*')
        .eq('player_id', user!.id)
        .order('recorded_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as EloHistory[]
    },
    enabled: !!user,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: displayName || null, bio: bio || null, country: country || null, discord_tag: discordTag || null })
        .eq('id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setProfile(data)
      setEditing(false)
      addToast('success', 'Profil mis à jour !')
    },
    onError: (e: Error) => addToast('error', e.message),
  })

  if (!profile) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>

  return (
    <div className="screen-enter" style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Hero profil */}
      <Card style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--ink)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, flexShrink: 0,
          }}>
            {profile.username[0]?.toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nom affiché" style={inputSt} />
                <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Bio..." rows={2} style={{ ...inputSt, resize: 'vertical' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays" style={inputSt} />
                  <input value={discordTag} onChange={(e) => setDiscordTag(e.target.value)} placeholder="Discord tag" style={inputSt} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} size="sm">Sauvegarder</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => setEditing(false)}>Annuler</Btn>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
                      {profile.display_name ?? profile.username}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>@{profile.username}</div>
                  </div>
                  <Btn variant="secondary" size="sm" onClick={() => { setDisplayName(profile.display_name ?? ''); setBio(profile.bio ?? ''); setCountry(profile.country ?? ''); setDiscordTag(profile.discord_tag ?? ''); setEditing(true) }}>
                    Modifier
                  </Btn>
                </div>
                {profile.bio && <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 0' }}>{profile.bio}</p>}
              </>
            )}
          </div>
        </div>

        {/* Infos */}
        {!editing && (
          <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
            <Badge label={profile.role} color="var(--ink)" bg="var(--mute-bg)" />
            {profile.country && <span style={{ fontSize: 13, color: 'var(--muted)' }}>🌍 {profile.country}</span>}
            {profile.discord_tag && <span style={{ fontSize: 13, color: 'var(--muted)' }}>💬 {profile.discord_tag}</span>}
          </div>
        )}
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'ELO', value: profile.elo_rating, icon: '⚡' },
          { label: 'Membre depuis', value: format(new Date(profile.created_at), 'MMM yyyy', { locale: fr }), icon: '📅' },
          { label: 'Rôle', value: profile.role, icon: '🎖' },
        ].map((s) => (
          <Card key={s.label} style={{ padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* ELO History */}
      <Card>
        <SectionTitle>Historique ELO</SectionTitle>
        {eloLoading ? <Spinner /> : !eloHistory || eloHistory.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
            Pas encore de matchs classés
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {eloHistory.map((h) => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {h.old_rating} → {h.new_rating}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {format(new Date(h.recorded_at), 'd MMM', { locale: fr })}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
                    color: h.delta > 0 ? '#1a7a4a' : 'var(--accent)',
                  }}>
                    {h.delta > 0 ? '+' : ''}{h.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid var(--border)', background: 'var(--bg)',
  fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
}
