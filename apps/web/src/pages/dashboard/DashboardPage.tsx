import { formatLabels, formatPrize, roleLabels } from '../../lib/labels'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { Card, SectionTitle, Badge, Spinner, Btn } from '../../components/ui'
import type { Tournament } from '../../types/database'

function useTournaments(organizerId?: string) {
  return useQuery({
    queryKey: ['tournaments', 'ongoing', organizerId],
    queryFn: async () => {
      let query = db
        .from('tournaments')
        .select('*, game:games(name)')
        .in('status', ['registration', 'ongoing'])
        .order('start_date', { ascending: true })
        .limit(6)
      if (organizerId) query = query.eq('organizer_id', organizerId)
      const { data, error } = await query
      if (error) throw error
      return data as (Tournament & { game?: { name: string } | null })[]
    },
  })
}

export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const { data: tournaments, isLoading: tourneyLoading } = useTournaments(
    profile?.role === 'organizer' ? profile.id : undefined,
  )

  // ── 1. Données Organisateur ──
  const { data: ownedTournaments = [] } = useQuery({
    queryKey: ['owned-tournaments', profile?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('tournaments')
        .select('id,status')
        .eq('organizer_id', profile!.id)
        .all()
      if (error) throw error
      return data
    },
    enabled: profile?.role === 'organizer',
  })
  const { data: totalClubsCount } = useQuery({
    queryKey: ['organizer-clubs-count'],
    queryFn: async () => {
      const { count } = await db.from('clubs').select('id', { count: 'exact', head: true })
      return count ?? 0
    },
    enabled: profile?.role === 'organizer',
  })

  const { data: disputedSubmissions = [] } = useQuery({
    queryKey: ['organizer-disputed-matches', profile?.id, ownedTournaments.map((t) => t.id)],
    queryFn: async () => {
      const rows = []
      for (let i = 0; i < ownedTournaments.length; i += 500) {
        const { data, error } = await db
          .from('matches')
          .select('*, tournaments(name,status)')
          .in(
            'tournament_id',
            ownedTournaments.slice(i, i + 500).map((t) => t.id),
          )
          .eq('status', 'disputed')
          .all()
        if (error) throw error
        rows.push(...data.filter((m) => m.tournaments?.status === 'ongoing'))
      }
      return rows
    },
    enabled: profile?.role === 'organizer',
    refetchInterval: 5000,
  })
  const activeDisputesCount = disputedSubmissions.length
  const activeTournamentCount = ownedTournaments.filter((t) =>
    ['registration', 'ongoing'].includes(t.status),
  ).length
  // ── 2. Données Capitaine ──
  const { data: captainClub } = useQuery({
    queryKey: ['captain-club', profile?.id],
    queryFn: async () => {
      const { data } = await db
        .from('clubs')
        .select('*')
        .eq('captain_id', profile!.id)
        .maybeSingle()
      return data
    },
    enabled: profile?.role === 'captain',
  })

  const { data: clubMembersCount } = useQuery({
    queryKey: ['captain-club-members-count', captainClub?.id],
    queryFn: async () => {
      const { count } = await db
        .from('club_members')
        .select('player_id', { count: 'exact', head: true })
        .eq('club_id', captainClub!.id)
      return count ?? 0
    },
    enabled: !!captainClub,
  })

  const { data: pendingApplicationsCount } = useQuery({
    queryKey: ['captain-club-pending-apps-count', captainClub?.id],
    queryFn: async () => {
      const { count } = await db
        .from('club_applications')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', captainClub!.id)
        .eq('status', 'pending')
      return count ?? 0
    },
    enabled: !!captainClub,
  })

  // ── 3. Données Joueur ──
  const { data: playerClubMember } = useQuery({
    queryKey: ['player-club-membership', profile?.id],
    queryFn: async () => {
      const { data } = await db
        .from('club_members')
        .select('*, club:clubs(*)')
        .eq('player_id', profile!.id)
        .maybeSingle()
      return data
    },
    enabled: profile?.role === 'player',
  })

  const { data: upcomingMatchesCount } = useQuery({
    queryKey: ['player-upcoming-matches-count', profile?.id, playerClubMember?.club_id],
    queryFn: async () => {
      const ids = [profile!.id]
      if (playerClubMember?.club_id) ids.push(playerClubMember.club_id)
      const { data, error } = await db
        .from('matches')
        .select('id,tournament_id,tournaments(status)')
        .in('status', ['pending', 'live'])
        .or(`team1_id.in.(${ids.join(',')}),team2_id.in.(${ids.join(',')})`)
        .all()
      if (error) throw error
      return data.filter((m) => !m.tournament_id || m.tournaments?.status === 'ongoing').length
    },
    enabled: profile?.role === 'player',
  })

  if (!profile)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={32} />
      </div>
    )

  const greeting = profile.display_name ?? profile.username

  return (
    <div className="screen-enter">
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: -1,
            marginBottom: 4,
          }}
        >
          Bienvenue, <span style={{ color: 'var(--accent)' }}>{greeting}</span> 👋
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
          {profile.role === 'organizer' &&
            'Espace Organisateur · Gérez vos tournois et arbitrez leurs matchs'}
          {profile.role === 'captain' &&
            'Espace Capitaine · Gérez votre structure et inscrivez votre roster aux tournois'}
          {profile.role === 'player' &&
            'Espace Joueur · Améliorez votre ELO, trouvez un match ou rejoignez un club'}
        </div>
      </div>

      {/* ── SECTION DYNAMIQUE DE STATISTIQUES SELON LE RÔLE ── */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {profile.role === 'organizer' && (
          <>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Litiges Actifs
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: (activeDisputesCount ?? 0) > 0 ? 'var(--accent)' : 'var(--ink)',
                }}
              >
                🚨 {activeDisputesCount ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Matches à arbitrer
              </div>
            </Card>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Mes tournois actifs
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                🏆 {activeTournamentCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Ouverts aux inscriptions ou en cours
              </div>
            </Card>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Total Clubs
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                🛡 {totalClubsCount ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Structures d'équipes créées
              </div>
            </Card>
          </>
        )}

        {profile.role === 'captain' && (
          <>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Mon Club
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 4,
                }}
              >
                🛡 {captainClub?.name ?? 'Aucun club'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {captainClub
                  ? `Région : ${captainClub.region ?? 'Global'}`
                  : 'Créez votre club pour recruter'}
              </div>
            </Card>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Membres & Roster
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                👥 {clubMembersCount ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Joueurs enregistrés dans l'équipe
              </div>
            </Card>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Candidatures en Attente
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: (pendingApplicationsCount ?? 0) > 0 ? 'var(--blue)' : 'var(--ink)',
                }}
              >
                📥 {pendingApplicationsCount ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Joueurs postulant pour vous rejoindre
              </div>
            </Card>
          </>
        )}

        {profile.role === 'player' && (
          <>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Mon ELO Solo
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--accent)',
                }}
              >
                ⚡ {profile.elo_rating ?? 1000}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Classement général individuel
              </div>
            </Card>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Club Actuel
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 4,
                }}
              >
                🛡 {playerClubMember?.club?.name ?? 'Sans Club'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {playerClubMember
                  ? `Rôle : ${roleLabels[playerClubMember.role]}`
                  : 'Postulez pour rejoindre une équipe'}
              </div>
            </Card>
            <Card style={{ padding: '18px 22px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Matches à venir
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                📅 {upcomingMatchesCount ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Matches programmés ou en cours
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── SECTION D'ACTION OU ALERTE DYNAMIQUE SELON LE RÔLE ── */}
      {profile.role === 'organizer' && disputedSubmissions && disputedSubmissions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>🚨 Litiges de score en attente</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {disputedSubmissions.slice(0, 3).map((sub) => (
              <Card
                key={sub.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderLeft: '4px solid var(--accent)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    Litige sur le match #{sub.match_number ?? sub.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Tournoi : {sub.tournaments?.name ?? 'Inconnu'} · Résultat à arbitrer
                  </div>
                </div>
                <Link to="/app/admin">
                  <Btn size="sm" variant="danger">
                    Arbitrer
                  </Btn>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {profile.role === 'captain' && !captainClub && (
        <Card
          style={{
            padding: 24,
            background: 'var(--mute-bg)',
            border: '1.5px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛡</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
            Vous n'avez pas encore créé de Club
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Créez votre club pour recruter des joueurs, former un roster et participer aux
            compétitions par équipe.
          </div>
          <Link to="/app/club">
            <Btn size="sm">Créer mon club</Btn>
          </Link>
        </Card>
      )}

      {profile.role === 'player' && !playerClubMember && (
        <Card
          style={{
            padding: 24,
            background: 'var(--mute-bg)',
            border: '1.5px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎮</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
            Vous n'avez pas encore rejoint d'équipe
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Rejoignez un club pour participer aux tournois en équipe et améliorer l'ELO de votre
            structure.
          </div>
          <Link to="/app/club">
            <Btn size="sm" variant="secondary">
              Découvrir les clubs et postuler
            </Btn>
          </Link>
        </Card>
      )}

      {/* ── TOURNOIS EN COURS ── */}
      <SectionTitle>Tournois actifs</SectionTitle>
      {tourneyLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size={24} />
        </div>
      ) : tournaments?.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Aucun tournoi en cours</div>
          {profile.role === 'organizer' ? (
            <Link to="/app/tournaments/create" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Créer un tournoi →
            </Link>
          ) : (
            <Link to="/app/tournaments" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Voir tous les tournois →
            </Link>
          )}
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
            marginBottom: 28,
          }}
        >
          {tournaments?.map((t) => (
            <Link key={t.id} to={`/app/tournaments/${t.id}`} style={{ textDecoration: 'none' }}>
              <Card
                style={{
                  padding: '18px 20px',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize: 15,
                        letterSpacing: -0.3,
                      }}
                    >
                      {t.name}
                    </div>
                    <Badge
                      label={t.status === 'ongoing' ? 'En cours' : 'Inscriptions'}
                      color={t.status === 'ongoing' ? '#1a7a4a' : '#1a3a7a'}
                      bg={t.status === 'ongoing' ? '#e6f7ef' : '#e6eeff'}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap',
                      marginBottom: 8,
                    }}
                  >
                    {t.game?.name && <span>🎮 {t.game.name}</span>}
                    <span>📋 {formatLabels[t.format]}</span>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border)',
                    paddingTop: 8,
                    marginTop: 8,
                  }}
                >
                  <span>
                    Format: {t.team_size}v{t.team_size}
                  </span>
                  {t.prize_pool && (
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      💰 {formatPrize(t.prize_pool)}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Raccourcis et Actions */}
      <SectionTitle>Actions rapides</SectionTitle>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {profile.role === 'organizer' && (
          <>
            <Link to="/app/tournaments/create">
              <Card
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>➕</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  Créer un tournoi
                </span>
              </Card>
            </Link>
            <Link to="/app/admin">
              <Card
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>⚙️</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  Administration
                </span>
              </Card>
            </Link>
            <Link to="/app/broadcast">
              <Card
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>🎥</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  Studio Cast
                </span>
              </Card>
            </Link>
          </>
        )}

        {(profile.role === 'captain' || profile.role === 'player') && (
          <Link to="/app/club">
            <Card
              style={{
                padding: '14px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>🛡️</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {profile.role === 'captain' ? 'Gérer mon Club' : 'Mon Club / Découverte'}
              </span>
            </Card>
          </Link>
        )}

        <Link to="/app/matchmaking">
          <Card
            style={{
              padding: '14px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>⚔️</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Matchmaking</span>
          </Card>
        </Link>
        <Link to="/app/scores">
          <Card
            style={{
              padding: '14px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>✔️</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              Soumettre un score
            </span>
          </Card>
        </Link>
      </div>
    </div>
  )
}
