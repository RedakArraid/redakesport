import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useRealtimeChannel } from '../../hooks/useRealtime'
import { Card, Btn, LinkBtn, Spinner } from '../../components/ui'
export function LobbyPage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data: lobby, isLoading } = useQuery({
    queryKey: ['lobby', id],
    queryFn: async () => {
      const { data, error } = await db.from('lobbies').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
    refetchInterval: 5000,
  })
  useRealtimeChannel(`lobby:${id}`, {
    table: 'lobbies',
    filter: `id=eq.${id}`,
    onUpdate: () => qc.invalidateQueries({ queryKey: ['lobby', id] }),
  })
  const ids = [...(lobby?.team1_player_ids ?? []), ...(lobby?.team2_player_ids ?? [])]
  const { data: players = [] } = useQuery({
    queryKey: ['lobby-players', ids],
    queryFn: async () => {
      const { data, error } = await db.from('profiles').select('id,username').in('id', ids)
      if (error) throw error
      return data
    },
    enabled: ids.length > 0,
  })
  const action = useMutation({
    mutationFn: async (ready: boolean) => {
      const { error } = await db.rpc(ready ? 'lobby_ready' : 'cancel_lobby', { p_id: id! })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lobby', id] })
      void qc.invalidateQueries({ queryKey: ['matchmaking-queue'] })
    },
  })
  if (isLoading) return <Spinner />
  if (!lobby) return <Card>Lobby introuvable ou inaccessible.</Card>
  return (
    <div>
      <h1>Lobby de match</h1>
      <Card>
        <h2>
          {lobby.status === 'cancelled'
            ? 'Lobby annulé'
            : lobby.match_id
              ? 'Match prêt'
              : 'En attente des joueurs'}
        </h2>
        {players.map((p) => (
          <p key={p.id}>
            {p.username} {lobby.ready_player_ids.includes(p.id) ? '✓ Prêt' : '· En attente'}
          </p>
        ))}
        <p>
          Retrouvez-vous dans le jeu sélectionné. Une fois prêts, les deux joueurs peuvent déclarer
          le résultat du match.
        </p>
        <div className="action-row">
          {lobby.status === 'forming' && (
            <>
              <Btn
                disabled={lobby.ready_player_ids.includes(user!.id)}
                loading={action.isPending}
                onClick={() => action.mutate(true)}
              >
                Je suis prêt
              </Btn>
              <Btn
                variant="secondary"
                loading={action.isPending}
                onClick={() => action.mutate(false)}
              >
                Annuler le lobby
              </Btn>
            </>
          )}
          {lobby.match_id && (
            <LinkBtn to={`/app/matches/${lobby.match_id}`}>Ouvrir le match</LinkBtn>
          )}
          <Link to="/app/matchmaking">Retour au matchmaking</Link>
        </div>
        {action.error && <p role="alert">{action.error.message}</p>}
      </Card>
    </div>
  )
}
