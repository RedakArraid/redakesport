import type {
  TournamentFormat,
  TournamentStatus,
  MatchStatus,
  Role,
  ClubMemberRole,
  Match,
} from '../types/database'

export const formatLabels: Record<TournamentFormat, string> = {
  single_elimination: 'Élimination simple',
  double_elimination: 'Double élimination',
  round_robin: 'Poules (tous contre tous)',
  swiss: 'Rondes suisses',
  hybrid: 'Poules et élimination directe',
}
export const tournamentStatusLabels: Record<TournamentStatus, string> = {
  draft: 'Brouillon',
  registration: 'Inscriptions ouvertes',
  ongoing: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
}
export const matchStatusLabels: Record<MatchStatus, string> = {
  pending: 'À jouer',
  live: 'En direct',
  completed: 'Terminé',
  disputed: 'Litige',
  forfeit: 'Forfait',
}
export function bracketMatchStatusLabel(match: Match, cancelled = false) {
  if (cancelled && match.status !== 'completed') return 'Non joué'
  if (match.result_kind === 'forfeit') return 'Forfait'
  if (match.status === 'completed' && (!match.team1_id || !match.team2_id))
    return match.winner_id ? 'Exemption' : 'Non joué'
  if (match.bracket_position?.side === 'reset' && !match.team1_id) return 'Si nécessaire'
  return matchStatusLabels[match.status]
}
export const registrationStatusLabels: Record<string, string> = {
  pending: 'En attente',
  approved: 'Validée',
  rejected: 'Refusée',
  withdrawn: 'Retirée',
}
export const roleLabels: Record<Role | ClubMemberRole, string> = {
  player: 'Joueur',
  captain: 'Capitaine',
  organizer: 'Organisateur',
  coach: 'Entraîneur',
  substitute: 'Remplaçant',
}
export const broadcastStatusLabels = { offline: 'Hors ligne', live: 'En direct', ended: 'Terminée' }
export function formatPrize(pool: { total: number; currency: string }) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: pool.currency,
    maximumFractionDigits: 2,
  }).format(pool.total)
}
