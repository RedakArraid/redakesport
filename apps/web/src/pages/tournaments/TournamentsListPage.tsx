import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useIsOrganizer } from '../../stores/authStore'
import { Card, Badge, Btn, SectionTitle, Spinner } from '../../components/ui'
import type { Tournament, TournamentStatus } from '../../types/database'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Brouillon', registration: 'Inscriptions', ongoing: 'En cours',
  completed: 'Terminé', cancelled: 'Annulé',
}
const STATUS_COLORS: Record<TournamentStatus, { color: string; bg: string }> = {
  draft: { color: 'var(--muted)', bg: 'var(--mute-bg)' },
  registration: { color: '#1a3a7a', bg: '#e6eeff' },
  ongoing: { color: '#1a7a4a', bg: '#e6f7ef' },
  completed: { color: 'var(--muted)', bg: 'var(--mute-bg)' },
  cancelled: { color: 'var(--accent)', bg: '#fee' },
}

export function TournamentsListPage() {
  const isOrganizer = useIsOrganizer()
  const location = useLocation()
  const [filter, setFilter] = useState<TournamentStatus | 'all'>('all')

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments', filter],
    queryFn: async () => {
      let q = supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('status', filter)
      const { data, error } = await q
      if (error) throw error
      return data as Tournament[]
    },
  })

  const filters: Array<{ key: TournamentStatus | 'all'; label: string }> = [
    { key: 'all', label: 'Tous' },
    { key: 'registration', label: 'Inscriptions' },
    { key: 'ongoing', label: 'En cours' },
    { key: 'completed', label: 'Terminés' },
  ]

  return (
    <div className="screen-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Tournois</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Tous les tournois de la plateforme</div>
        </div>
        {isOrganizer && (
          <Link to="/app/tournaments/create">
            <Btn>+ Créer un tournoi</Btn>
          </Link>
        )}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`topnav-item${filter === f.key ? ' active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : tournaments?.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Aucun tournoi trouvé</div>
          {isOrganizer && <Link to="/app/tournaments/create"><Btn>Créer le premier tournoi</Btn></Link>}
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {tournaments?.map((t) => {
            const sc = STATUS_COLORS[t.status]
            const basePath = location.pathname.startsWith('/app') ? '/app/tournaments' : '/tournaments'
            return (
              <Link key={t.id} to={`${basePath}/${t.id}`} style={{ textDecoration: 'none' }}>
                <Card style={{ padding: '20px 22px', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: -0.3, lineHeight: 1.2, flex: 1 }}>
                      {t.name}
                    </div>
                    <Badge label={STATUS_LABELS[t.status]} color={sc.color} bg={sc.bg} />
                  </div>

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
                    <span>📋 {t.format.replace(/_/g, ' ')}</span>
                    {t.team_size && <span>👥 {t.team_size}v{t.team_size}</span>}
                    {t.region && <span>🌍 {t.region}</span>}
                  </div>

                  {t.prize_pool && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                      💰 {t.prize_pool.total.toLocaleString()} {t.prize_pool.currency}
                    </div>
                  )}

                  {t.start_date && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 'auto' }}>
                      📅 {format(new Date(t.start_date), 'd MMM yyyy', { locale: fr })}
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
