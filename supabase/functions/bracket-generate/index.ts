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
  } else {
    // Default to single elimination for other formats
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

function errorResponse(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
