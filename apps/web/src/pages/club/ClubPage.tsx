import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Card, Badge, Btn, SectionTitle, Spinner } from '../../components/ui'
import type { Club, ClubMember, ClubApplication, Profile } from '../../types/database'

type Tab = 'overview' | 'roster' | 'applications'

export function ClubPage() {
  const { user, profile } = useAuthStore()
  const [tab, setTab] = useState<Tab>('overview')

  // 1. Charger si l'utilisateur est le capitaine d'un club
  const { data: captainClub, isLoading: loadingCaptainClub } = useQuery({
    queryKey: ['captain-club', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('clubs').select('*').eq('captain_id', user!.id).maybeSingle()
      return data as Club | null
    },
    enabled: !!user && profile?.role === 'captain',
  })

  // 2. Charger si l'utilisateur est membre d'un club
  const { data: playerMembership, isLoading: loadingMembership } = useQuery({
    queryKey: ['player-club-membership', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('*, club:clubs(*)')
        .eq('player_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as (ClubMember & { club: Club }) | null
    },
    enabled: !!user && profile?.role === 'player',
  })

  const isLoading = loadingCaptainClub || loadingMembership

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>

  // Rôle : ORGANISATEUR (Vue de modération des clubs)
  if (profile?.role === 'organizer') {
    return <OrganizerClubsView />
  }

  // Rôle : CAPITAINE
  if (profile?.role === 'captain') {
    if (!captainClub) {
      return <CreateClubCard userId={user?.id} />
    }
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
              {captainClub.name}
            </div>
            <div style={{ opacity: 0.6, fontSize: 13 }}>
              {captainClub.region && `🌍 ${captainClub.region} · `}ELO {captainClub.elo_rating}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge label="Capitaine" color="#fff" bg="rgba(255,255,255,0.15)" />
            {captainClub.is_verified && <Badge label="Vérifié" color="#4ade80" bg="rgba(74,222,128,0.2)" />}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {(['overview', 'roster', 'applications'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`topnav-item${tab === t ? ' active' : ''}`}>
              {t === 'overview' ? '📋 Aperçu' : t === 'roster' ? '👥 Roster' : '📥 Candidatures'}
            </button>
          ))}
        </div>

        {tab === 'overview' && <ClubOverview club={captainClub} />}
        {tab === 'roster' && <ClubRoster clubId={captainClub.id} isAdmin={true} />}
        {tab === 'applications' && <ClubApplications clubId={captainClub.id} />}
      </div>
    )
  }

  // Rôle : JOUEUR
  if (profile?.role === 'player') {
    // Joueur membre d'un club
    if (playerMembership && playerMembership.club) {
      const club = playerMembership.club
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
                {club.region && `🌍 ${club.region} · `} ELO {club.elo_rating}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge label={`Membre · ${playerMembership.role}`} color="#fff" bg="rgba(255,255,255,0.15)" />
              {club.is_verified && <Badge label="Vérifié" color="#4ade80" bg="rgba(74,222,128,0.2)" />}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {(['overview', 'roster'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`topnav-item${tab === t ? ' active' : ''}`}>
                {t === 'overview' ? '📋 Aperçu' : '👥 Roster'}
              </button>
            ))}
          </div>

          {tab === 'overview' && <ClubOverview club={club} />}
          {tab === 'roster' && <ClubRoster clubId={club.id} isAdmin={false} />}
        </div>
      )
    }

    // Joueur sans club (Hub de découverte)
    return <PlayerClubDiscoveryView />
  }

  return <div style={{ padding: 40, textAlign: 'center' }}>Rôle non pris en charge pour cette page</div>
}

// ── COMPOSANT : APERÇU DU CLUB ──
function ClubOverview({ club }: { club: Club }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
      {[
        { label: 'ELO Club', value: club.elo_rating },
        { label: 'Statut', value: club.is_verified ? 'Vérifié ✓' : 'Non vérifié' },
        { label: 'Région', value: club.region ?? 'Globale' },
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

// ── COMPOSANT : ROSTER DU CLUB ──
function ClubRoster({ clubId, isAdmin }: { clubId: string; isAdmin: boolean }) {
  const qc = useQueryClient()
  const { addToast } = useUIStore()

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

  const kickMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('player_id', playerId)
      if (error) throw error
    },
    onSuccess: () => {
      addToast('success', 'Joueur exclu du club')
      qc.invalidateQueries({ queryKey: ['club-members', clubId] })
    },
    onError: (e: Error) => addToast('error', e.message),
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionTitle>Membres ({members?.length ?? 0})</SectionTitle>
      </div>
      {members?.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Aucun membre dans le club</Card>
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
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.profiles?.country ?? 'Région inconnue'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge label={m.role} color="var(--ink)" bg="var(--mute-bg)" />
                {m.jersey_number && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--muted)' }}>
                    #{m.jersey_number}
                  </span>
                )}
                {isAdmin && m.role !== 'captain' && (
                  <Btn size="sm" variant="ghost" style={{ color: 'var(--accent)' }} onClick={() => kickMutation.mutate(m.player_id)} loading={kickMutation.isPending}>
                    Exclure
                  </Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── COMPOSANT : CANDIDATURES REÇUES (CAPITAINE) ──
function ClubApplications({ clubId }: { clubId: string }) {
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  const { data: applications, isLoading } = useQuery({
    queryKey: ['club-applications', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_applications')
        .select('*, profiles:profiles!club_applications_player_id_fkey(*)')
        .eq('club_id', clubId)
        .eq('status', 'pending')
      if (error) throw error
      return data as (ClubApplication & { profiles: Profile })[]
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, playerId }: { id: string; status: 'accepted' | 'rejected'; playerId: string }) => {
      // 1. Mettre à jour le statut de la candidature
      const { error: appError } = await supabase
        .from('club_applications')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id)
      if (appError) throw appError

      // 2. Si acceptée, ajouter le joueur dans club_members
      if (status === 'accepted') {
        const { error: memberError } = await supabase
          .from('club_members')
          .insert({
            club_id: clubId,
            player_id: playerId,
            role: 'player',
          })
        if (memberError) throw memberError
      }
    },
    onSuccess: (_, { status }) => {
      addToast('success', status === 'accepted' ? 'Candidature acceptée et joueur ajouté !' : 'Candidature refusée')
      qc.invalidateQueries({ queryKey: ['club-applications', clubId] })
      qc.invalidateQueries({ queryKey: ['club-members', clubId] })
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
                    ELO {a.profiles?.elo_rating} · {a.profiles?.country ?? 'Globale'}
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
                <Btn size="sm" onClick={() => reviewMutation.mutate({ id: a.id, status: 'accepted', playerId: a.player_id })} loading={reviewMutation.isPending}>
                  Accepter
                </Btn>
                <Btn size="sm" variant="secondary" onClick={() => reviewMutation.mutate({ id: a.id, status: 'rejected', playerId: a.player_id })} loading={reviewMutation.isPending}>
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

// ── COMPOSANT : CRÉER UN CLUB ──
function CreateClubCard({ userId }: { userId?: string }) {
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  const handleCreate = async () => {
    if (!name.trim() || !userId) return
    setLoading(true)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    
    // 1. Insérer le club
    const { data: newClub, error } = await supabase.from('clubs').insert({
      name, slug, captain_id: userId, elo_rating: 1000, region: region || null, description: description || null, is_verified: false
    }).select().single()

    if (error) { addToast('error', error.message); setLoading(false); return }

    // 2. Ajouter le capitaine en tant que premier membre dans club_members
    await supabase.from('club_members').insert({
      club_id: newClub.id,
      player_id: userId,
      role: 'captain',
    })

    addToast('success', 'Votre club a été créé avec succès !')
    qc.invalidateQueries({ queryKey: ['captain-club'] })
    setLoading(false)
  }

  return (
    <div className="screen-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px 0' }}>
      <Card style={{ maxWidth: 500, width: '100%', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
            Créez votre structure esport
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Rassemblez vos joueurs, gérez votre roster et menez votre équipe au sommet !
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Nom du club *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Team Vitality, Karmine Corp..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Région</label>
            <input
              value={region} onChange={(e) => setRegion(e.target.value)}
              placeholder="Ex: France, Europe, Nord..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Description du club</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'histoire ou les objectifs du club..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <Btn onClick={handleCreate} loading={loading} disabled={!name.trim()} size="lg" style={{ width: '100%', marginTop: 10 }}>
            Créer le club
          </Btn>
        </div>
      </Card>
    </div>
  )
}

// ── COMPOSANT : HUB DE DÉCOUVERTE DE CLUBS (JOUEUR SANS CLUB) ──
function PlayerClubDiscoveryView() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [motivationText, setMotivationText] = useState('')
  const [applyingToClubId, setApplyingToClubId] = useState<string | null>(null)
  const [submittingApp, setSubmittingApp] = useState(false)

  // A. Charger tous les clubs
  const { data: clubs, isLoading: loadingClubs } = useQuery({
    queryKey: ['all-clubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('elo_rating', { ascending: false })
      if (error) throw error
      return data as Club[]
    },
  })

  // B. Charger mes candidatures envoyées
  const { data: myApps, isLoading: loadingMyApps } = useQuery({
    queryKey: ['my-sent-applications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_applications')
        .select('*, club:clubs(name)')
        .eq('player_id', user!.id)
        .order('applied_at', { ascending: false })
      if (error) throw error
      return data as any[]
    },
    enabled: !!user,
  })

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user || !applyingToClubId) return
      setSubmittingApp(true)
      const { error } = await supabase
        .from('club_applications')
        .insert({
          club_id: applyingToClubId,
          player_id: user.id,
          status: 'pending',
          message: motivationText || null,
        })
      if (error) throw error
    },
    onSuccess: () => {
      addToast('success', 'Votre candidature a été transmise !')
      setApplyingToClubId(null)
      setMotivationText('')
      qc.invalidateQueries({ queryKey: ['my-sent-applications'] })
    },
    onError: (e: Error) => addToast('error', e.message),
    onSettled: () => setSubmittingApp(false),
  })

  // Filtrer les clubs localement
  const filteredClubs = clubs?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchesRegion = !regionFilter || c.region?.toLowerCase().includes(regionFilter.toLowerCase())
    return matchesSearch && matchesRegion
  })

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5, marginBottom: 4 }}>
          🛡️ Hub de Recrutement & Découverte de Clubs
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          Rejoignez un club existant pour participer aux tournois par équipe et progresser ensemble.
        </div>
      </div>

      {/* Barre de filtre */}
      <Card style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom de club..."
          style={{ ...inputStyle, flex: 2, minWidth: 200 }}
        />
        <input
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          placeholder="Filtrer par région..."
          style={{ ...inputStyle, flex: 1, minWidth: 150 }}
        />
      </Card>

      {/* Liste des Clubs */}
      <SectionTitle>Clubs actifs ({filteredClubs?.length ?? 0})</SectionTitle>
      {loadingClubs ? (
        <Spinner size={32} />
      ) : filteredClubs?.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', marginBottom: 28 }}>
          Aucun club ne correspond à votre recherche.
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 36 }}>
          {filteredClubs?.map(c => {
            const hasApplied = myApps?.some(app => app.club_id === c.id && app.status === 'pending')
            return (
              <Card key={c.id} style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
                      {c.name}
                    </span>
                    {c.is_verified && <Badge label="Vérifié" color="#4ade80" bg="rgba(74,222,128,0.1)" />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, marginBottom: 10 }}>
                    <span>🌍 {c.region ?? 'Globale'}</span>
                    <span>⚡ ELO: {c.elo_rating}</span>
                  </div>
                  {c.description && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.description}
                    </p>
                  )}
                </div>

                {hasApplied ? (
                  <Btn disabled style={{ width: '100%' }} variant="secondary">Candidature en attente</Btn>
                ) : (
                  <Btn onClick={() => setApplyingToClubId(c.id)} style={{ width: '100%' }}>
                    Rejoindre l'équipe
                  </Btn>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Mes Candidatures */}
      <SectionTitle>Mes candidatures envoyées</SectionTitle>
      {loadingMyApps ? (
        <Spinner />
      ) : !myApps || myApps.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
          Vous n'avez envoyé aucune candidature pour le moment.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myApps.map(a => (
            <Card key={a.id} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  🛡️ Candidature chez <span style={{ color: 'var(--blue)' }}>{a.club?.name ?? 'Club inconnu'}</span>
                </div>
                {a.message && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>"{a.message}"</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Envoyé le {new Date(a.applied_at).toLocaleDateString('fr-FR')}
                </span>
                <Badge
                  label={a.status === 'pending' ? 'En attente' : a.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                  color={a.status === 'pending' ? 'var(--blue)' : a.status === 'accepted' ? '#1a7a4a' : 'var(--accent)'}
                  bg={a.status === 'pending' ? '#e6eeff' : a.status === 'accepted' ? '#e6f7ef' : '#fee'}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL DE MOTIVATION */}
      {applyingToClubId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <Card style={{ maxWidth: 440, width: '100%', padding: '24px 28px' }}>
            <SectionTitle style={{ marginBottom: 8 }}>Motiver votre demande</SectionTitle>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              Saisissez un court message pour vous présenter au capitaine de l'équipe (facultatif).
            </p>
            <textarea
              value={motivationText}
              onChange={e => setMotivationText(e.target.value)}
              placeholder="Ex: Bonjour, je suis motivé à rejoindre votre équipe. Je joue DPS et je suis disponible tous les soirs !"
              rows={4}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 18, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="secondary" size="sm" onClick={() => setApplyingToClubId(null)}>Annuler</Btn>
              <Btn size="sm" onClick={() => applyMutation.mutate()} loading={submittingApp}>
                Soumettre
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── COMPOSANT : MODÉRATION DES CLUBS (ORGANISATEUR) ──
function OrganizerClubsView() {
  const { addToast } = useUIStore()
  const qc = useQueryClient()

  // Charger tous les clubs
  const { data: clubs, isLoading } = useQuery({
    queryKey: ['organizer-clubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*, captain:profiles(username)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  // Mutation pour modifier le statut vérifié d'un club
  const toggleVerifyMutation = useMutation({
    mutationFn: async ({ id, isVerified }: { id: string; isVerified: boolean }) => {
      const { error } = await supabase
        .from('clubs')
        .update({ is_verified: isVerified })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      addToast('success', variables.isVerified ? 'Club marqué comme vérifié !' : 'Vérification retirée')
      qc.invalidateQueries({ queryKey: ['organizer-clubs'] })
    },
    onError: (e: Error) => addToast('error', e.message),
  })

  if (isLoading) return <Spinner />

  return (
    <div className="screen-enter">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5, marginBottom: 4 }}>
          🛡️ Administration des Clubs
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          Gérez les structures d'équipes créées sur la plateforme et décernez le badge de vérification.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {clubs?.map((c: any) => (
          <Card key={c.id} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: 16 }}>
                  {c.name}
                </span>
                {c.is_verified ? (
                  <Badge label="Vérifié" color="#4ade80" bg="rgba(74,222,128,0.1)" />
                ) : (
                  <Badge label="Non Vérifié" color="var(--muted)" bg="var(--mute-bg)" />
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Capitaine : @{c.captain?.username ?? 'Inconnu'} · ELO : {c.elo_rating} · Région : {c.region ?? 'Globale'}
              </div>
            </div>
            <div>
              <Btn
                size="sm"
                variant={c.is_verified ? 'secondary' : 'primary'}
                onClick={() => toggleVerifyMutation.mutate({ id: c.id, isVerified: !c.is_verified })}
                loading={toggleVerifyMutation.isPending}
              >
                {c.is_verified ? 'Retirer vérification' : 'Vérifier le Club'}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── STYLES PARTAGÉS ──
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', background: 'var(--bg)',
  fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
}
