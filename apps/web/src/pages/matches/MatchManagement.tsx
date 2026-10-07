import { MatchForfeit } from './MatchForfeit'
import { useRepresentedTeams } from '../../hooks/useParticipants'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { db } from '../../lib/api'
import { Card, Btn, LinkBtn } from '../../components/ui'
import type { Match } from '../../types/database'
export function MatchManagement({ match }: { match: Match }) {
  const user = useAuthStore((s) => s.user),
    qc = useQueryClient(),
    [date, setDate] = useState(
      match.scheduled_at
        ? new Date(
            new Date(match.scheduled_at).getTime() -
              new Date(match.scheduled_at).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : '',
    ),
    [vod, setVod] = useState(match.vod_url || ''),
    [notes, setNotes] = useState('')
  const { data: represented = [] } = useRepresentedTeams()
  const participant = represented.some((id) => id === match.team1_id || id === match.team2_id)
  const { data: t } = useQuery({
    queryKey: ['match-owner', match.tournament_id],
    queryFn: async () => {
      const { data, error } = await db
        .from('tournaments')
        .select('organizer_id,status')
        .eq('id', match.tournament_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!match.tournament_id,
    refetchInterval: 5000,
  })
  const save = useMutation({
    mutationFn: async () => {
      if (vod && !/^https?:\/\//i.test(vod)) throw new Error('Lien de replay invalide')
      const { error } = await db
        .from('matches')
        .update({
          ...(date ? { scheduled_at: new Date(date).toISOString() } : {}),
          vod_url: vod || null,
        })
        .eq('id', match.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match', match.id] }),
  })
  const event = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from('match_events')
        .insert({ match_id: match.id, event_type: 'comment', data: { description: notes.trim() } })
      if (error) throw error
    },
    onSuccess: () => {
      setNotes('')
      void qc.invalidateQueries({ queryKey: ['match-events', match.id] })
    },
  })
  return (
    <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
      {t?.status === 'cancelled' && (
        <Card>Tournoi annulé. Aucun nouveau résultat ne peut être enregistré.</Card>
      )}
      {user &&
        participant &&
        (!match.tournament_id || t?.status === 'ongoing') &&
        (['pending', 'live'].includes(match.status) ||
          (match.status === 'disputed' && !match.tournament_id)) &&
        match.team1_id &&
        match.team2_id && (
          <LinkBtn to={`/app/scores?match=${match.id}`}>Soumettre ou confirmer le résultat</LinkBtn>
        )}
      {user &&
        (!match.tournament_id || t?.status === 'ongoing') &&
        match.team1_id &&
        match.team2_id &&
        ['pending', 'live', 'disputed'].includes(match.status) &&
        (t?.organizer_id === user.id || participant) && (
          <MatchForfeit
            match={match}
            organizer={t?.organizer_id === user.id}
            represented={represented}
          />
        )}
      {t?.organizer_id === user?.id && t?.status !== 'cancelled' && user && (
        <Card>
          <h2>Gestion du match</h2>
          <div className="form-grid">
            <label>
              Date et heure
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              Lien du replay
              <input type="url" value={vod} onChange={(e) => setVod(e.target.value)} />
            </label>
          </div>
          <Btn onClick={() => save.mutate()} loading={save.isPending}>
            Enregistrer
          </Btn>
          {save.error && <p role="alert">{save.error.message}</p>}
          <label style={{ marginTop: 20 }}>
            Commentaire en direct
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </label>
          <Btn disabled={!notes.trim()} onClick={() => event.mutate()} loading={event.isPending}>
            Ajouter à la chronologie
          </Btn>
        </Card>
      )}
    </div>
  )
}
