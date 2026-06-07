import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Card, Badge, Btn, SectionTitle, Spinner } from '../../components/ui'
import type { Club, ClubMember, ClubApplication, Profile } from '../../types/database'

type Tab = 'overview' | 'roster' | 'applications'

export function ClubPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: club, isLoading } = useQuery({
    queryKey: ['my-club', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('clubs').select('*').eq('captain_id', user!.id).maybeSingle()
      return data as Club | null
    },
    enabled: !!user,
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>

  if (!club) return <CreateClubCard userId={user?.id} />

  return (
    <div className="screen-enter">
      {/* Hero */}
      <div style={{
        background: 'var(--ink)', color: '#fff', borderRadius: 20,
        padding: '28px 32px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: -1, marginBottom: 4 }}>
            {club.name}
          </div>
          <div style={{ opacity: 0.6, fontSize: 13 }}>
            {club.region && `🌍 ${club.region} · `}ELO {club.elo_rating}
          </div>
        </div>
        {club.is_verified && <Badge label="Vérifié" color="#4ade80" bg="rgba(74,222,128,0.2)" />}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['overview', 'roster', 'applications'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`topnav-item${tab === t ? ' active' : ''}`}>
            {t === 'overview' ? '📋 Aperçu' : t === 'roster' ? '👥 Roster' : '📥 Candidatures'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <ClubOverview club={club} />}
      {tab === 'roster' && <ClubRoster clubId={club.id} />}
      {tab === 'applications' && <ClubApplications clubId={club.id} />}
    </div>
  )
}

function ClubOverview({ club }: { club: Club }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
      {[
        { label: 'ELO', value: club.elo_rating },
        { label: 'Statut', value: club.is_verified ? 'Vérifié ✓' : 'Non vérifié' },
        { label: 'Région', value: club.region ?? '—' },
      ].map((s) => (
        <Card key={s.label} style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{s.value}</div>
        </Card>
      ))}
      {club.description && (
        <Card style={{ padding: '16px 20px', gridColumn: '1 / -1' }}>
          <SectionTitle>À propos</SectionTitle>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{club.description}</div>
        </Card>
      )}
    </div>
  )
}

function ClubRoster({ clubId }: { clubId: string }) {
  const { data: members, isLoading } = useQuery({
    queryKey: ['club-members', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('*, profiles(*)')
        .eq('club_id', clubId)
      if (error) throw error
      return data as (ClubMember & { profiles: Profile })[]
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionTitle>Membres ({members?.length ?? 0})</SectionTitle>
      </div>
      {members?.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Aucun membre pour l'instant</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members?.map((m) => (
            <Card key={m.player_id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--mute-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-display)',
              }}>
                {m.profiles?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {m.profiles?.display_name ?? m.profiles?.username}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.profiles?.country}</div>
              </div>
              <Badge label={m.role} />
              {m.jersey_number && (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--muted)' }}>
                  #{m.jersey_number}
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ClubApplications({ clubId }: { clubId: string }) {
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  const { data: applications, isLoading } = useQuery({
    queryKey: ['club-applications', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_applications')
        .select('*, profiles(*)')
        .eq('club_id', clubId)
        .eq('status', 'pending')
      if (error) throw error
      return data as (ClubApplication & { profiles: Profile })[]
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) => {
      const { error } = await supabase
        .from('club_applications')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      addToast('success', status === 'accepted' ? 'Candidature acceptée !' : 'Candidature refusée')
      qc.invalidateQueries({ queryKey: ['club-applications', clubId] })
    },
    onError: (e: Error) => addToast('error', e.message),
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <SectionTitle style={{ marginBottom: 16 }}>Candidatures en attente ({applications?.length ?? 0})</SectionTitle>
      {applications?.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Aucune candidature en attente</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {applications?.map((a) => (
            <Card key={a.id} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 15 }}>
                    {a.profiles?.display_name ?? a.profiles?.username}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    ELO {a.profiles?.elo_rating} · {a.profiles?.country}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(a.applied_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {a.message && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, fontStyle: 'italic', lineHeight: 1.6 }}>
                  "{a.message}"
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" onClick={() => reviewMutation.mutate({ id: a.id, status: 'accepted' })} loading={reviewMutation.isPending}>
                  Accepter
                </Btn>
                <Btn size="sm" variant="secondary" onClick={() => reviewMutation.mutate({ id: a.id, status: 'rejected' })} loading={reviewMutation.isPending}>
                  Refuser
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateClubCard({ userId }: { userId?: string }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  const handleCreate = async () => {
    if (!name.trim() || !userId) return
    setLoading(true)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    const { error } = await supabase.from('clubs').insert({
      name, slug, captain_id: userId, elo_rating: 1000,
    })
    if (error) { addToast('error', error.message); setLoading(false); return }
    addToast('success', 'Club créé !')
    qc.invalidateQueries({ queryKey: ['my-club'] })
    setLoading(false)
  }

  return (
    <div className="screen-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Card style={{ maxWidth: 440, width: '100%', padding: '36px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛡</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, marginBottom: 8, letterSpacing: -0.5 }}>
          Crée ton club
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Rassemble des joueurs, engage-toi en tournoi, domine la scène.
        </div>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nom de ton club"
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
        />
        <Btn onClick={handleCreate} loading={loading} disabled={!name.trim()} size="lg" style={{ width: '100%' }}>
          Créer le club →
        </Btn>
      </Card>
    </div>
  )
}
