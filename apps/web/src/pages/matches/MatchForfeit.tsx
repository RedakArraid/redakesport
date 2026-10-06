import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParticipantNames } from '../../hooks/useParticipants'
import { db } from '../../lib/api'
import { Card, Btn } from '../../components/ui'
import type { Match } from '../../types/database'

export function MatchForfeit({
  match,
  organizer,
  represented,
}: {
  match: Match
  organizer: boolean
  represented: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loser, setLoser] = useState('')
  const [reason, setReason] = useState('')
  const qc = useQueryClient()
  const teams = [match.team1_id, match.team2_id].filter((id): id is string => !!id)
  const eligible = organizer ? teams : teams.filter((id) => represented.includes(id))
  const selected = loser || eligible[0]
  const { data: names = {} } = useParticipantNames(teams)
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc('forfeit_match', {
        p_match_id: match.id,
        p_loser_id: selected,
        p_reason: reason.trim(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setOpen(false)
      void qc.invalidateQueries()
    },
  })
  if (!eligible.length) return null
  if (!open)
    return (
      <div>
        <Btn variant="secondary" onClick={() => setOpen(true)}>
          {organizer ? 'Déclarer un forfait' : 'Déclarer mon forfait'}
        </Btn>
      </div>
    )
  return (
    <Card>
      <h2>Forfait du match</h2>
      <label>
        Participant qui déclare forfait
        <select
          value={selected}
          onChange={(e) => setLoser(e.target.value)}
          disabled={!organizer || mutation.isPending}
        >
          {eligible.map((id) => (
            <option key={id} value={id}>
              {names[id] || 'Participant'}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motif du forfait
        <textarea
          minLength={5}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Absence, abandon…"
        />
      </label>
      <p>
        La victoire sera attribuée à{' '}
        <strong>{names[teams.find((id) => id !== selected) || ''] || 'l’adversaire'}</strong>. Le
        tableau et le classement seront mis à jour. L’ELO reste inchangé. Cette décision est
        définitive.
      </p>
      <div className="action-row">
        <Btn
          onClick={() => mutation.mutate()}
          disabled={reason.trim().length < 5}
          loading={mutation.isPending}
        >
          Confirmer le forfait
        </Btn>
        <Btn variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
          Annuler
        </Btn>
      </div>
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </Card>
  )
}
