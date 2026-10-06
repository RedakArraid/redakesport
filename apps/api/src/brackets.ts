export type Format =
  'single_elimination' | 'double_elimination' | 'round_robin' | 'hybrid' | 'swiss'
export interface Entrant {
  id: string
  type: 'club' | 'player'
}
export interface BracketMatch {
  id: string
  tournament_id: string
  group_id: string | null
  round: number
  match_number: number
  bracket_position: { side: string; round: number; position: number }
  team1_id: string | null
  team2_id: string | null
  team1_type: string
  team2_type: string
  status: 'pending'
  best_of: number
  next_match_id: string | null
  next_match_slot: number | null
  loser_match_id: string | null
  loser_match_slot: number | null
}
export function buildBracket(teams: Entrant[], tournamentId: string, format: Format) {
  if (
    teams.length < 2 ||
    teams.length > 256 ||
    new Set(teams.map((t) => t.id)).size !== teams.length
  )
    throw new Error('2 à 256 participants uniques requis')
  if (new Set(teams.map((t) => t.type)).size !== 1)
    throw new Error('Types de participants incompatibles')
  if (format === 'hybrid' && teams.length < 4)
    throw new Error('Le format hybride nécessite au moins 4 participants')
  const matches: BracketMatch[] = []
  const groups: { id: string; tournament_id: string; name: string; stage: number }[] = []
  const members: { group_id: string; club_id: string | null; player_id: string | null }[] = []
  const create = (
    side: string,
    round: number,
    position: number,
    a?: Entrant,
    b?: Entrant,
    groupId: string | null = null,
  ) => {
    const m: BracketMatch = {
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      group_id: groupId,
      round,
      match_number: matches.length + 1,
      bracket_position: { side, round, position },
      team1_id: a?.id ?? null,
      team2_id: b?.id ?? null,
      team1_type: teams[0].type,
      team2_type: teams[0].type,
      status: 'pending',
      best_of: 1,
      next_match_id: null,
      next_match_slot: null,
      loser_match_id: null,
      loser_match_slot: null,
    }
    matches.push(m)
    return m
  }
  const link = (from: BracketMatch, to: BracketMatch, slot: number, loser = false) => {
    if (loser) {
      from.loser_match_id = to.id
      from.loser_match_slot = slot
    } else {
      from.next_match_id = to.id
      from.next_match_slot = slot
    }
  }
  const roundRobin = (entrants: Entrant[], name: string) => {
    const g = { id: crypto.randomUUID(), tournament_id: tournamentId, name, stage: 1 }
    groups.push(g)
    for (const t of entrants)
      members.push({
        group_id: g.id,
        club_id: t.type === 'club' ? t.id : null,
        player_id: t.type === 'player' ? t.id : null,
      })
    const circle: (Entrant | undefined)[] = [...entrants]
    if (circle.length % 2) circle.push(undefined)
    for (let r = 1; r < circle.length; r++) {
      for (let i = 0; i < circle.length / 2; i++) {
        const a = circle[i],
          b = circle[circle.length - 1 - i]
        if (a && b) create('group', r, i, a, b, g.id)
      }
      circle.splice(1, 0, circle.pop())
    }
  }
  if (format === 'round_robin') roundRobin(teams, 'Poule unique')
  else if (format === 'hybrid') {
    roundRobin(
      teams.filter((_, i) => i % 2 === 0),
      'Groupe A',
    )
    roundRobin(
      teams.filter((_, i) => i % 2 === 1),
      'Groupe B',
    )
    const a = create('winners', 1, 0),
      b = create('winners', 1, 1),
      final = create('winners', 2, 0)
    link(a, final, 1)
    link(b, final, 2)
  } else if (format === 'swiss') {
    for (let i = 0; i < teams.length; i += 2) create('swiss', 1, i / 2, teams[i], teams[i + 1])
  } else {
    const rounds = Math.ceil(Math.log2(teams.length)),
      slots = 2 ** rounds
    // Standard seeding distributes byes; no first-round pairing contains two empty slots.
    let seeds = [1, 2]
    while (seeds.length < slots) {
      const sum = seeds.length * 2 + 1
      seeds = seeds.flatMap((n) => [n, sum - n])
    }
    const winners: BracketMatch[][] = []
    for (let r = 0; r < rounds; r++) {
      winners[r] = Array.from({ length: slots / 2 ** (r + 1) }, (_, p) =>
        create(
          'winners',
          r + 1,
          p,
          r === 0 ? teams[seeds[p * 2] - 1] : undefined,
          r === 0 ? teams[seeds[p * 2 + 1] - 1] : undefined,
        ),
      )
      if (r > 0)
        winners[r - 1].forEach((m, p) => link(m, winners[r][Math.floor(p / 2)], (p % 2) + 1))
    }
    if (format === 'double_elimination') {
      const final = create('grand_final', 1, 0)
      create('reset', 1, 0) // Activated only if the lower-bracket winner wins the grand final.
      link(winners[rounds - 1][0], final, 1)
      if (rounds === 1) link(winners[0][0], final, 2, true)
      else {
        const lower: BracketMatch[][] = []
        for (let r = 0; r < 2 * (rounds - 1); r++) {
          const count = slots / 2 ** (Math.floor(r / 2) + 2)
          lower[r] = Array.from({ length: count }, (_, p) => create('losers', r + 1, p))
          if (r > 0)
            lower[r - 1].forEach((m, p) =>
              link(m, lower[r][r % 2 === 1 ? p : Math.floor(p / 2)], r % 2 === 1 ? 1 : (p % 2) + 1),
            )
        }
        winners[0].forEach((m, p) => link(m, lower[0][Math.floor(p / 2)], (p % 2) + 1, true))
        for (let r = 1; r < rounds; r++)
          winners[r].forEach((m, p) => {
            const destination = lower[r * 2 - 1]
            link(m, destination[destination.length - 1 - p], 2, true)
          })
        link(lower[lower.length - 1][0], final, 2)
      }
    }
  }
  return { matches, groups, members }
}
