import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useIsOrganizer } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Card, Badge, Btn, SectionTitle, Spinner } from '../../components/ui'
import type { Tournament, TournamentRegistration } from '../../types/database'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuthStore()
  const isOrganizer = useIsOrganizer()
  const { addToast } = useUIStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'bracket' | 'teams'>('overview')

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('tournaments').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Tournament
    },
    enabled: !!id,
  })

  const { data: registrations } = useQuery({
    queryKey: ['tournament', id, 'registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_registrations').select('*').eq('tournament_id', id!)
      if (error) throw error
      return data as TournamentRegistration[]
    },
    enabled: !!id,
  })

  const myRegistration = registrations?.find((r) => r.player_id === user?.id || r.club_id)

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tournament_registrations').insert({
        tournament_id: id!,
        player_id: user!.id,
        status: 'pending',
      })
      if (error) throw error
    },
    onSuccess: () => {
      addToast('success', 'Inscription envoyée !')
      qc.invalidateQueries({ queryKey: ['tournament', id, 'registrations'] })
    },
    onError: (e: Error) => addToast('error', e.message),
  })

  const generateBracketMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('bracket-generate', {
        body: { tournament_id: id, seeding: 'random' },
      })
      if (error) throw error
    },
    onSuccess: () => {
      addToast('success', 'Bracket généré !')
      qc.invalidateQueries({ queryKey: ['tournament', id] })
    },
    onError: (e: Error) => addToast('error', e.message),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
  if (!tournament) return <div>Tournoi introuvable</div>

  const approvedCount = registrations?.filter((r) => r.status === 'approved').length ?? 0

  return (
    <div className="screen-enter">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>
              {tournament.name}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>📋 {tournament.format.replace(/_/g, ' ')}</span>
              {tournament.region && <span>🌍 {tournament.region}</span>}
              {tournament.start_date && <span>📅 {format(new Date(tournament.start_date), 'd MMM yyyy', { locale: fr })}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge label={tournament.status} color="var(--ink)" bg="var(--mute-bg)" />
            {isOrganizer && tournament.status === 'registration' && (
              <Btn onClick={() => generateBracketMutation.mutate()} loading={generateBracketMutation.isPending} variant="secondary">
                Générer le bracket
              </Btn>
            )}
            {!isOrganizer && tournament.status === 'registration' && !myRegistration && (
              <Btn onClick={() => registerMutation.mutate()} loading={registerMutation.isPending}>
                S'inscrire
              </Btn>
            )}
            {myRegistration && (
              <Badge label={`Inscrit · ${myRegistration.status}`} color="#1a7a4a" bg="#e6f7ef" />
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Équipes inscrites', value: `${approvedCount}${tournament.max_teams ? `/${tournament.max_teams}` : ''}` },
          { label: 'Format', value: tournament.team_size + 'v' + tournament.team_size },
          tournament.prize_pool ? { label: 'Prize Pool', value: `${tournament.prize_pool.total.toLocaleString()} ${tournament.prize_pool.currency}` } : null,
        ].filter(Boolean).map((s) => s && (
          <Card key={s.label} style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: -0.5 }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        {(['overview', 'bracket', 'teams'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`topnav-item${activeTab === tab ? ' active' : ''}`}>
            {tab === 'overview' ? '📋 Aperçu' : tab === 'bracket' ? '⚡ Bracket' : '👥 Équipes'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tournament.rules && (
            <Card>
              <SectionTitle>Règlement</SectionTitle>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{tournament.rules}</div>
            </Card>
          )}
          {tournament.registration_deadline && (
            <Card style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 24 }}>⏰</span>
              <div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Fin des inscriptions</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {format(new Date(tournament.registration_deadline), 'd MMMM yyyy à HH:mm', { locale: fr })}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div>
          {registrations?.length === 0 ? (
            <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              Aucune équipe inscrite pour l'instant
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {registrations?.map((r) => (
                <Card key={r.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                    {r.club_id ?? r.player_id}
                  </span>
                  <Badge label={r.status} />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bracket' && (
        tournament.status === 'draft' || tournament.status === 'registration' ? (
          <Card style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
            <div style={{ fontWeight: 700 }}>Le bracket sera généré après la clôture des inscriptions</div>
          </Card>
        ) : (
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <Link to={`/app/tournaments/${id}/bracket`} style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700 }}>
              Voir le bracket en plein écran →
            </Link>
          </div>
        )
      )}
    </div>
  )
}
