import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BracketRequest {
  tournament_id: string
  seeding: 'elo' | 'manual' | 'random'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { tournament_id, seeding = 'random' }: BracketRequest = await req.json()

  // Get tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments').select('*').eq('id', tournament_id).single()
  if (tErr) return errorResponse(tErr.message)

  // Get approved registrations
  const { data: registrations, error: rErr } = await supabase
    .from('tournament_registrations')
    .select('*, profiles(*), clubs(*)')
    .eq('tournament_id', tournament_id)
    .eq('status', 'approved')
  if (rErr) return errorResponse(rErr.message)

  if (!registrations || registrations.length < 2) {
    return errorResponse('Need at least 2 approved registrations to generate bracket')
  }

  // Sort teams by seeding method
  let teams = [...registrations]
  if (seeding === 'random') {
    teams = teams.sort(() => Math.random() - 0.5)
  } else if (seeding === 'elo') {
    teams = teams.sort((a, b) => {
      const eloA = a.clubs?.elo_rating ?? a.profiles?.elo_rating ?? 1000
      const eloB = b.clubs?.elo_rating ?? b.profiles?.elo_rating ?? 1000
      return eloB - eloA
    })
  }

  const format = tournament.format
  let matches: Record<string, unknown>[] = []

  if (format === 'single_elimination') {
    matches = generateSingleElimination(teams, tournament_id)
  } else if (format === 'round_robin') {
    matches = generateRoundRobin(teams, tournament_id)
  } else if (format === 'double_elimination') {
    matches = generateDoubleElimination(teams, tournament_id)
  } else if (format === 'hybrid') {
    // Round robin for group stage + single elim bracket final
    matches = generateHybrid(teams, tournament_id)
  } else {
    // Default to single elimination for unknown formats
    matches = generateSingleElimination(teams, tournament_id)
  }

  // Insert all matches in batch
  const { error: insertErr } = await supabase.from('matches').insert(matches)
  if (insertErr) return errorResponse(insertErr.message)

  // Update tournament status to ongoing
  await supabase.from('tournaments').update({ status: 'ongoing' }).eq('id', tournament_id)

  return new Response(JSON.stringify({ success: true, matches_created: matches.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

// =============================================
// SINGLE ELIMINATION
// =============================================
function generateSingleElimination(teams: Record<string, unknown>[], tournamentId: string) {
  const matches: Record<string, unknown>[] = []
  const n = teams.length
  const rounds = Math.ceil(Math.log2(n))
  const totalSlots = Math.pow(2, rounds)

  // Pad with byes if not power of 2
  const paddedTeams = [...teams]
  while (paddedTeams.length < totalSlots) paddedTeams.push(null as unknown as Record<string, unknown>)

  // Generate all match IDs upfront to enable linking
  const matchIds: string[][][] = []
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round)
    matchIds[round] = []
    for (let pos = 0; pos < matchesInRound; pos++) {
      matchIds[round][pos] = [crypto.randomUUID()]
    }
  }

  // Round 1: fill with actual teams
  const r1Matches = totalSlots / 2
  for (let i = 0; i < r1Matches; i++) {
    const t1 = paddedTeams[i * 2]
    const t2 = paddedTeams[i * 2 + 1]
    const id = matchIds[1][i][0]
    const nextRound = 2
    const nextPos = Math.floor(i / 2)
    const nextMatchId = rounds > 1 ? matchIds[nextRound]?.[nextPos]?.[0] ?? null : null

    // If one team is a bye, auto-advance
    if (!t1 || !t2) {
      const winner = t1 ?? t2
      matches.push({
        id,
        tournament_id: tournamentId,
        round: 1,
        match_number: i + 1,
        bracket_position: { side: 'winners', round: 1, position: i },
        team1_id: (t1 as Record<string, unknown>)?.club_id ?? (t1 as Record<string, unknown>)?.player_id ?? null,
        team2_id: null,
        team1_type: 'club',
        team2_type: 'club',
        winner_id: (winner as Record<string, unknown>)?.club_id ?? (winner as Record<string, unknown>)?.player_id ?? null,
        status: 'completed',
        next_match_id: nextMatchId,
        best_of: 1,
      })
    } else {
      matches.push({
        id,
        tournament_id: tournamentId,
        round: 1,
        match_number: i + 1,
        bracket_position: { side: 'winners', round: 1, position: i },
        team1_id: (t1 as Record<string, unknown>)?.club_id ?? (t1 as Record<string, unknown>)?.player_id,
        team2_id: (t2 as Record<string, unknown>)?.club_id ?? (t2 as Record<string, unknown>)?.player_id,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        next_match_id: nextMatchId,
        best_of: 1,
      })
    }
  }

  // Subsequent rounds: empty slots
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round)
    for (let pos = 0; pos < matchesInRound; pos++) {
      const id = matchIds[round][pos][0]
      const nextRound = round + 1
      const nextPos = Math.floor(pos / 2)
      const nextMatchId = round < rounds ? matchIds[nextRound]?.[nextPos]?.[0] ?? null : null

      matches.push({
        id,
        tournament_id: tournamentId,
        round,
        match_number: pos + 1,
        bracket_position: { side: 'winners', round, position: pos },
        team1_id: null,
        team2_id: null,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        next_match_id: nextMatchId,
        best_of: round === rounds ? 3 : 1, // Finals are BO3
      })
    }
  }

  return matches
}

// =============================================
// ROUND ROBIN
// =============================================
function generateRoundRobin(teams: Record<string, unknown>[], tournamentId: string) {
  const matches: Record<string, unknown>[] = []
  let matchNum = 1

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const t1 = teams[i]
      const t2 = teams[j]
      matches.push({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        round: 1,
        match_number: matchNum++,
        bracket_position: { side: 'group', round: 1, position: matchNum },
        team1_id: (t1 as Record<string, unknown>)?.club_id ?? (t1 as Record<string, unknown>)?.player_id,
        team2_id: (t2 as Record<string, unknown>)?.club_id ?? (t2 as Record<string, unknown>)?.player_id,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        best_of: 1,
      })
    }
  }

  return matches
}

// =============================================
// DOUBLE ELIMINATION
// =============================================
function generateDoubleElimination(teams: Record<string, unknown>[], tournamentId: string) {
  const matches: Record<string, unknown>[] = []
  const n = teams.length
  const wRounds = Math.ceil(Math.log2(n))
  const totalSlots = Math.pow(2, wRounds)

  // Pad with byes for winners bracket
  const paddedTeams = [...teams]
  while (paddedTeams.length < totalSlots) paddedTeams.push(null as unknown as Record<string, unknown>)

  // --- Pre-generate IDs for winners bracket ---
  // winnersIds[round][pos]
  const winnersIds: string[][] = []
  for (let round = 1; round <= wRounds; round++) {
    const count = Math.pow(2, wRounds - round)
    winnersIds[round] = Array.from({ length: count }, () => crypto.randomUUID())
  }

  // --- Pre-generate IDs for losers bracket ---
  // Losers bracket has 2*(wRounds-1) rounds
  const lRounds = 2 * (wRounds - 1)
  const losersIds: string[][] = []
  for (let lr = 1; lr <= lRounds; lr++) {
    // Matches in losers round lr:
    // Odd rounds receive losers from winners → matches = 2^(wRounds - ceil(lr/2) - 1)
    // Even rounds are "consolidation" rounds
    const count = Math.max(1, Math.pow(2, wRounds - Math.ceil(lr / 2) - 1))
    losersIds[lr] = Array.from({ length: count }, () => crypto.randomUUID())
  }

  // Grand Final ID
  const grandFinalId = crypto.randomUUID()

  // =====================
  // Winners bracket
  // =====================
  // Round 1
  const r1Count = totalSlots / 2
  for (let i = 0; i < r1Count; i++) {
    const t1 = paddedTeams[i * 2]
    const t2 = paddedTeams[i * 2 + 1]
    const id = winnersIds[1][i]
    const nextMatchId = wRounds > 1 ? winnersIds[2]?.[Math.floor(i / 2)] ?? null : grandFinalId

    // loser_match_id: loser goes to losers bracket round 1
    // In round 1 of losers bracket, position maps to i
    const loserMatchId = lRounds >= 1 ? losersIds[1]?.[Math.floor(i / 2)] ?? null : null

    if (!t1 || !t2) {
      const winner = t1 ?? t2
      matches.push({
        id,
        tournament_id: tournamentId,
        round: 1,
        match_number: i + 1,
        bracket_position: { side: 'winners', round: 1, position: i },
        team1_id: (t1 as Record<string, unknown>)?.club_id ?? (t1 as Record<string, unknown>)?.player_id ?? null,
        team2_id: null,
        team1_type: 'club',
        team2_type: 'club',
        winner_id: (winner as Record<string, unknown>)?.club_id ?? (winner as Record<string, unknown>)?.player_id ?? null,
        status: 'completed',
        next_match_id: nextMatchId,
        loser_match_id: null, // bye, no loser
        best_of: 1,
      })
    } else {
      matches.push({
        id,
        tournament_id: tournamentId,
        round: 1,
        match_number: i + 1,
        bracket_position: { side: 'winners', round: 1, position: i },
        team1_id: (t1 as Record<string, unknown>)?.club_id ?? (t1 as Record<string, unknown>)?.player_id,
        team2_id: (t2 as Record<string, unknown>)?.club_id ?? (t2 as Record<string, unknown>)?.player_id,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        next_match_id: nextMatchId,
        loser_match_id: loserMatchId,
        best_of: 1,
      })
    }
  }

  // Winners bracket rounds 2..wRounds
  for (let round = 2; round <= wRounds; round++) {
    const count = Math.pow(2, wRounds - round)
    for (let pos = 0; pos < count; pos++) {
      const id = winnersIds[round][pos]
      const isWinnersFinal = round === wRounds
      const nextMatchId = isWinnersFinal ? grandFinalId : winnersIds[round + 1]?.[Math.floor(pos / 2)] ?? null

      // Loser from winners round `round` goes to losers round = round*2 - 2
      const losersDestRound = round * 2 - 2
      const loserMatchId = losersDestRound >= 1 && losersIds[losersDestRound]
        ? losersIds[losersDestRound][pos] ?? null
        : null

      matches.push({
        id,
        tournament_id: tournamentId,
        round,
        match_number: pos + 1,
        bracket_position: { side: 'winners', round, position: pos },
        team1_id: null,
        team2_id: null,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        next_match_id: nextMatchId,
        loser_match_id: loserMatchId,
        best_of: isWinnersFinal ? 3 : 1,
      })
    }
  }

  // =====================
  // Losers bracket
  // =====================
  for (let lr = 1; lr <= lRounds; lr++) {
    const count = Math.max(1, Math.pow(2, wRounds - Math.ceil(lr / 2) - 1))
    const isLosersFinal = lr === lRounds

    for (let pos = 0; pos < count; pos++) {
      const id = losersIds[lr][pos]
      const nextMatchId = isLosersFinal
        ? grandFinalId
        : losersIds[lr + 1]?.[Math.floor(pos / 2)] ?? null

      matches.push({
        id,
        tournament_id: tournamentId,
        round: lr,
        match_number: pos + 1,
        bracket_position: { side: 'losers', round: lr, position: pos },
        team1_id: null,
        team2_id: null,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        next_match_id: nextMatchId,
        loser_match_id: null, // eliminated from tournament
        best_of: isLosersFinal ? 3 : 1,
      })
    }
  }

  // =====================
  // Grand Final
  // =====================
  matches.push({
    id: grandFinalId,
    tournament_id: tournamentId,
    round: wRounds + lRounds + 1,
    match_number: 1,
    bracket_position: { side: 'grand_final', round: wRounds + lRounds + 1, position: 0 },
    team1_id: null, // Winners bracket winner
    team2_id: null, // Losers bracket winner
    team1_type: 'club',
    team2_type: 'club',
    status: 'pending',
    next_match_id: null,
    loser_match_id: null,
    best_of: 5, // Grand Final is BO5
  })

  return matches
}

// =============================================
// HYBRID (round robin groups + single elim bracket)
// =============================================
function generateHybrid(teams: Record<string, unknown>[], tournamentId: string) {
  const matches: Record<string, unknown>[] = []

  // Split teams into 2 groups
  const mid = Math.ceil(teams.length / 2)
  const groupA = teams.slice(0, mid)
  const groupB = teams.slice(mid)

  let matchNum = 1

  // Group A round robin
  for (let i = 0; i < groupA.length; i++) {
    for (let j = i + 1; j < groupA.length; j++) {
      const t1 = groupA[i]
      const t2 = groupA[j]
      matches.push({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        round: 1,
        match_number: matchNum++,
        bracket_position: { side: 'group_a', round: 1, position: matchNum },
        team1_id: (t1 as Record<string, unknown>)?.club_id ?? (t1 as Record<string, unknown>)?.player_id,
        team2_id: (t2 as Record<string, unknown>)?.club_id ?? (t2 as Record<string, unknown>)?.player_id,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        phase: 'group',
        best_of: 1,
      })
    }
  }

  // Group B round robin
  for (let i = 0; i < groupB.length; i++) {
    for (let j = i + 1; j < groupB.length; j++) {
      const t1 = groupB[i]
      const t2 = groupB[j]
      matches.push({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        round: 1,
        match_number: matchNum++,
        bracket_position: { side: 'group_b', round: 1, position: matchNum },
        team1_id: (t1 as Record<string, unknown>)?.club_id ?? (t1 as Record<string, unknown>)?.player_id,
        team2_id: (t2 as Record<string, unknown>)?.club_id ?? (t2 as Record<string, unknown>)?.player_id,
        team1_type: 'club',
        team2_type: 'club',
        status: 'pending',
        phase: 'group',
        best_of: 1,
      })
    }
  }

  // Top 2 from each group advance to single elimination bracket (4 teams → SF + Final)
  // Generate semi-finals: A1 vs B2, B1 vs A2
  const sf1Id = crypto.randomUUID()
  const sf2Id = crypto.randomUUID()
  const finalId = crypto.randomUUID()

  matches.push({
    id: sf1Id,
    tournament_id: tournamentId,
    round: 2,
    match_number: 1,
    bracket_position: { side: 'winners', round: 2, position: 0 },
    team1_id: null, // Group A 1st
    team2_id: null, // Group B 2nd
    team1_type: 'club',
    team2_type: 'club',
    status: 'pending',
    next_match_id: finalId,
    phase: 'bracket',
    best_of: 3,
  })

  matches.push({
    id: sf2Id,
    tournament_id: tournamentId,
    round: 2,
    match_number: 2,
    bracket_position: { side: 'winners', round: 2, position: 1 },
    team1_id: null, // Group B 1st
    team2_id: null, // Group A 2nd
    team1_type: 'club',
    team2_type: 'club',
    status: 'pending',
    next_match_id: finalId,
    phase: 'bracket',
    best_of: 3,
  })

  matches.push({
    id: finalId,
    tournament_id: tournamentId,
    round: 3,
    match_number: 1,
    bracket_position: { side: 'winners', round: 3, position: 0 },
    team1_id: null,
    team2_id: null,
    team1_type: 'club',
    team2_type: 'club',
    status: 'pending',
    next_match_id: null,
    phase: 'bracket',
    best_of: 5,
  })

  return matches
}

function errorResponse(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
