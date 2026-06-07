import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Card, SectionTitle, StatTile, Badge, Spinner } from '../../components/ui'
import type { Tournament } from '../../types/database'

function useTournaments() {
  return useQuery({
    queryKey: ['tournaments', 'ongoing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['registration', 'ongoing'])
        .order('start_date', { ascending: true })
        .limit(6)
      if (error) throw error
      return data as Tournament[]
    },
  })
}

export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const { data: tournaments, isLoading } = useTournaments()

  const greeting = profile?.display_name ?? profile?.username ?? 'Joueur'

  return (
    <div className="screen-enter">
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: -1, marginBottom: 4 }}>
          Bienvenue, <span style={{ color: 'var(--accent)' }}>{greeting}</span> 👋
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
          {profile?.role === 'organizer' ? 'Gérez vos tournois et suivez les performances'
            : profile?.role === 'captain' ? 'Gérez votre club et engagez votre équipe'
            : 'Suivez vos tournois et trouvez des matchs'}
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'ELO', value: profile?.elo_rating ?? 1000, sub: 'Classement global' },
          { label: 'Tournois actifs', value: tournaments?.length ?? 0, sub: 'En cours' },
          { label: 'Pays', value: profile?.country ?? '—', sub: 'Région' },
        ].map((s) => (
          <Card key={s.label} style={{ padding: '16px 20px' }}>
            <StatTile {...s} />
          </Card>
        ))}
      </div>

      {/* Tournois en cours */}
      <SectionTitle>Tournois actifs</SectionTitle>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : tournaments?.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Aucun tournoi en cours</div>
          {profile?.role === 'organizer' ? (
            <Link to="/app/tournaments/create" style={{ color: 'var(--accent)', fontWeight: 700 }}>Créer un tournoi →</Link>
          ) : (
            <Link to="/app/tournaments" style={{ color: 'var(--accent)', fontWeight: 700 }}>Voir tous les tournois →</Link>
          )}
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {tournaments?.map((t) => (
            <Link key={t.id} to={`/app/tournaments/${t.id}`} style={{ textDecoration: 'none' }}>
              <Card style={{ padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>
                    {t.name}
                  </div>
                  <Badge
                    label={t.status === 'ongoing' ? 'En cours' : 'Inscriptions'}
                    color={t.status === 'ongoing' ? '#1a7a4a' : '#1a3a7a'}
                    bg={t.status === 'ongoing' ? '#e6f7ef' : '#e6eeff'}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12 }}>
                  <span>📋 {t.format.replace('_', ' ')}</span>
                  {t.max_teams && <span>👥 max {t.max_teams}</span>}
                  {t.prize_pool && <span>💰 {t.prize_pool.total.toLocaleString()}€</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Actions rapides selon rôle */}
      <div style={{ marginTop: 28 }}>
        <SectionTitle>Actions rapides</SectionTitle>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {profile?.role === 'organizer' && (
            <Link to="/app/tournaments/create">
              <Card style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>➕</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Créer un tournoi</span>
              </Card>
            </Link>
          )}
          {(profile?.role === 'captain' || profile?.role === 'organizer') && (
            <Link to="/app/club">
              <Card style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🛡</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Mon club</span>
              </Card>
            </Link>
          )}
          <Link to="/app/matchmaking">
            <Card style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚔</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Matchmaking</span>
            </Card>
          </Link>
          <Link to="/app/scores">
            <Card style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✔</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Soumettre un score</span>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
