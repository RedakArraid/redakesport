import {
  formatLabels,
  formatPrize,
  tournamentStatusLabels,
  registrationStatusLabels,
} from '../../lib/labels'
import { useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Card, Badge, Btn, LinkBtn, Spinner } from '../../components/ui'
import { invokeFunction } from '../../lib/functions'

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const base = useLocation().pathname.startsWith('/app') ? '/app' : ''
  const [tab, setTab] = useState<'overview' | 'teams'>('overview')
  const {
    data: t,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => {
      const { data, error } = await db
        .from('tournaments')
        .select('*, game:games(name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
  const { data: registrations = [] } = useQuery({
    queryKey: ['tournament', id, 'registrations'],
    queryFn: async () => {
      const { data, error } = await db
        .from('tournament_registrations')
        .select('*, club:clubs(name), player:profiles(username)')
        .eq('tournament_id', id!)
        .order('registered_at')
      if (error) throw error
      return data
    },
    enabled: !!t,
  })
  const { data: clubs = [] } = useQuery({
    queryKey: ['registration-clubs', user?.id],
    queryFn: async () => {
      const { data, error } = await db.from('clubs').select('id, name').eq('captain_id', user!.id)
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
  const { data: membership } = useQuery({
    queryKey: ['registration-membership', user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('club_members')
        .select('club_id')
        .eq('player_id', user!.id)
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
  const refresh = () => {
    void qc.invalidateQueries()
  }
  const action = useMutation({
    mutationFn: async (job: () => Promise<void>) => job(),
    onSuccess: refresh,
    onError: (e: Error) => addToast('error', e.message),
  })
  const run = (job: () => Promise<void>) => action.mutate(job)
  if (isLoading) return <Spinner />
  if (error || !t)
    return (
      <Card>
        <h1>Tournoi indisponible</h1>
        <p>Ce tournoi est privé, n’existe plus ou ne peut pas être chargé.</p>
        <Link to={`${base}/tournaments`}>Voir les tournois</Link>
      </Card>
    )
  const owner = !!user && t.organizer_id === user.id
  const team = t.team_size > 1
  const myRegistration = registrations.find(
    (r) =>
      ['pending', 'approved'].includes(r.status) &&
      (r.player_id === user?.id || membership?.some((m) => m.club_id === r.club_id)),
  )
  const approved = registrations.filter((r) => r.status === 'approved').length
  const open =
    t.status === 'registration' &&
    (!t.registration_deadline || new Date(t.registration_deadline) > new Date())
  const full =
    !!t.max_teams &&
    registrations.filter((r) => ['pending', 'approved'].includes(r.status)).length >= t.max_teams
  const publish = async () => {
    const { error } = await db.from('tournaments').update({ status: 'registration' }).eq('id', id!)
    if (error) throw error
    addToast('success', 'Inscriptions ouvertes')
  }
  const register = async () => {
    const { error } = await db.rpc('register_tournament', {
      p_tournament_id: id!,
      p_club_id: team ? clubs[0]?.id : null,
    })
    if (error) throw error
    addToast('success', 'Inscription envoyée')
  }
  return (
    <div className="screen-enter">
      <Link to={`${base}/tournaments`}>← Tournois</Link>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          margin: '20px 0',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 8px' }}>{t.name}</h1>
          <p style={{ color: 'var(--muted)' }}>
            {t.game?.name} · {t.team_size}v{t.team_size} · {t.region || 'Toutes régions'}
          </p>
        </div>
        <Badge label={tournamentStatusLabels[t.status]} />
      </div>
      <div className="action-row" style={{ marginBottom: 24 }}>
        {owner && t.status === 'draft' && (
          <Btn loading={action.isPending} onClick={() => run(publish)}>
            Ouvrir les inscriptions
          </Btn>
        )}
        {owner && t.status === 'registration' && (
          <Btn
            disabled={approved < 2 || (t.format === 'hybrid' && approved < 4)}
            loading={action.isPending}
            onClick={() =>
              run(async () => {
                await invokeFunction('bracket-generate', { tournament_id: id, seeding: 'elo' })
                addToast('success', 'Tournoi lancé !')
              })
            }
          >
            Lancer le tournoi ({approved} validés)
          </Btn>
        )}
        {owner && (
          <LinkBtn to={`/app/tournaments/${id}/analytics`} variant="secondary">
            Statistiques
          </LinkBtn>
        )}
        {open &&
          !myRegistration &&
          !owner &&
          (!user ? (
            <LinkBtn to={`/app/tournaments/${id}`}>Se connecter pour s’inscrire</LinkBtn>
          ) : team && !clubs.length ? (
            <Link to="/app/club">Ton capitaine peut inscrire ton club</Link>
          ) : (
            <Btn disabled={full} loading={action.isPending} onClick={() => run(register)}>
              {full ? 'Tournoi complet' : team ? `Inscrire ${clubs[0]?.name}` : 'S’inscrire'}
            </Btn>
          ))}
        {myRegistration && (
          <>
            <Badge label={`Inscription : ${registrationStatusLabels[myRegistration.status]}`} />
            {t.status === 'registration' &&
              (myRegistration.player_id === user?.id ||
                clubs.some((c) => c.id === myRegistration.club_id)) && (
                <Btn
                  variant="secondary"
                  loading={action.isPending}
                  onClick={() =>
                    run(async () => {
                      const { error } = await db.rpc('withdraw_registration', {
                        p_id: myRegistration.id,
                      })
                      if (error) throw error
                    })
                  }
                >
                  Retirer l’inscription
                </Btn>
              )}
          </>
        )}
      </div>
      <div className="action-row" style={{ marginBottom: 20 }}>
        <button
          className={`topnav-item ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Aperçu
        </button>
        <button
          className={`topnav-item ${tab === 'teams' ? 'active' : ''}`}
          onClick={() => setTab('teams')}
        >
          Participants ({approved}
          {t.max_teams ? `/${t.max_teams}` : ''})
        </button>
        <Link className="topnav-item" to={`${base}/tournaments/${id}/bracket`}>
          Matchs et bracket
        </Link>
        <Link className="topnav-item" to={`${base}/tournaments/${id}/standings`}>
          Classement
        </Link>
        {['hybrid', 'round_robin'].includes(t.format) && (
          <Link className="topnav-item" to={`${base}/tournaments/${id}/groups`}>
            Poules
          </Link>
        )}
      </div>
      {tab === 'overview' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <h2>Informations</h2>
            <p>
              Format : {formatLabels[t.format]} · BO{t.best_of}
            </p>
            <p>
              {t.best_of > 1
                ? `Résultat de série : ${Math.floor(t.best_of / 2) + 1} manches gagnées pour remporter une rencontre.`
                : 'Résultat : score du jeu sur un seul match.'}{' '}
              Un forfait valide la victoire adverse sans modifier l’ELO.
            </p>
            {t.format === 'swiss' && (
              <p>
                {approved >= 2
                  ? `${Math.ceil(Math.log2(approved))} rondes pour ${approved} participants validés.`
                  : 'Nombre de rondes fixé au lancement (4 pour 16 participants).'}{' '}
                Aucune rencontre répétée, une exemption maximum par participant. Départage : points,
                Buchholz (points des adversaires), Sonneborn-Berger (points des adversaires battus,
                moitié en cas de nul), différence de scores, puis identifiant.
              </p>
            )}
            <p>
              Début :{' '}
              {t.start_date
                ? new Date(t.start_date).toLocaleString('fr-FR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'À programmer'}
            </p>
            <p>
              Fin des inscriptions :{' '}
              {!['draft', 'registration'].includes(t.status)
                ? 'Inscriptions closes'
                : t.registration_deadline
                  ? new Date(t.registration_deadline).toLocaleString('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'À la fermeture par l’organisateur'}
            </p>
            {t.prize_pool && <p>Dotation : {formatPrize(t.prize_pool)}</p>}
          </Card>
          <Card>
            <h2>Règlement</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {t.rules || 'L’organisateur n’a pas renseigné de règlement complémentaire.'}
            </p>
          </Card>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {!registrations.length && <Card>Aucun participant inscrit pour le moment.</Card>}
          {registrations.map((r) => (
            <Card
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <strong>{r.club?.name ?? r.player?.username ?? 'Participant'}</strong>
              <div className="action-row">
                <Badge label={registrationStatusLabels[r.status]} />
                {owner && t.status === 'registration' && r.status === 'pending' && (
                  <>
                    {[true, false].map((approve) => (
                      <Btn
                        key={String(approve)}
                        variant={approve ? 'primary' : 'secondary'}
                        loading={action.isPending}
                        onClick={() =>
                          run(async () => {
                            const { error } = await db.rpc('review_registration', {
                              p_id: r.id,
                              p_approve: approve,
                            })
                            if (error) throw error
                          })
                        }
                      >
                        {approve ? 'Accepter' : 'Refuser'}
                      </Btn>
                    ))}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
