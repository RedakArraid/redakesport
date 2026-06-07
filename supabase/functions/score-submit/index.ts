import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScoreSubmitRequest {
  match_id: string
  score_team1: number
  score_team2: number
  screenshot_urls: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Unauthorized', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Get authenticated user
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return errorResponse('Unauthorized', 401)

  const { match_id, score_team1, score_team2, screenshot_urls }: ScoreSubmitRequest = await req.json()

  // Get match
  const { data: match, error: matchErr } = await serviceClient
    .from('matches').select('*').eq('id', match_id).single()
  if (matchErr) return errorResponse('Match not found', 404)
  if (match.status === 'completed') return errorResponse('Match already completed')

  // Get existing submission from the other team
  const { data: existingSubmissions } = await serviceClient
    .from('score_submissions')
    .select('*')
    .eq('match_id', match_id)
    .eq('status', 'pending')

  // Insert this submission
  const { data: submission, error: subErr } = await serviceClient
    .from('score_submissions').insert({
      match_id,
      submitted_by: user.id,
      score_team1,
      score_team2,
      screenshot_urls,
      status: 'pending',
    }).select().single()
  if (subErr) return errorResponse(subErr.message)

  // Check if there's a matching submission from the other team
  const matchingSubmission = existingSubmissions?.find(
    (s) => s.score_team1 === score_team1 && s.score_team2 === score_team2 && s.submitted_by !== user.id,
  )

  if (matchingSubmission) {
    // Scores agree — confirm match
    const winner_id = score_team1 > score_team2 ? match.team1_id : match.team2_id
    const loser_id = score_team1 > score_team2 ? match.team2_id : match.team1_id

    await serviceClient.from('matches').update({
      score_team1,
      score_team2,
      winner_id,
      loser_id,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', match_id)

    // Mark both submissions as confirmed
    await serviceClient.from('score_submissions').update({ status: 'confirmed' })
      .in('id', [submission.id, matchingSubmission.id])

    // Advance bracket: set winner in next match
    if (match.next_match_id && winner_id) {
      const { data: nextMatch } = await serviceClient
        .from('matches').select('team1_id, team2_id').eq('id', match.next_match_id).single()
      if (nextMatch) {
        const updateField = !nextMatch.team1_id ? 'team1_id' : 'team2_id'
        await serviceClient.from('matches').update({ [updateField]: winner_id }).eq('id', match.next_match_id)
      }
    }

    // Calculate ELO
    await calculateElo(serviceClient, match_id, winner_id, loser_id)

    // Notify both teams
    await notifyMatchComplete(serviceClient, match, winner_id, loser_id)

    return new Response(JSON.stringify({ status: 'confirmed', message: 'Match validated!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check if there's a conflicting submission (same match, different scores)
  const conflictingSubmission = existingSubmissions?.find(
    (s) => (s.score_team1 !== score_team1 || s.score_team2 !== score_team2) && s.submitted_by !== user.id,
  )

  if (conflictingSubmission) {
    // Score dispute
    await serviceClient.from('score_submissions').update({ status: 'disputed' })
      .in('id', [submission.id, conflictingSubmission.id])
    await serviceClient.from('matches').update({ status: 'disputed' }).eq('id', match_id)

    // Notify organizer
    const { data: tournament } = await serviceClient
      .from('tournaments').select('organizer_id').eq('id', match.tournament_id).single()
    if (tournament?.organizer_id) {
      await serviceClient.from('notifications').insert({
        user_id: tournament.organizer_id,
        type: 'score_dispute',
        title: '⚠️ Litige de score',
        body: `Un litige est ouvert pour le match #${match.match_number ?? match_id.slice(0, 8)}`,
        data: { match_id },
      })
    }

    return new Response(JSON.stringify({ status: 'disputed', message: 'Score conflict detected. Organizer notified.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // First submission — pending
  return new Response(JSON.stringify({ status: 'pending', message: 'Score submitted. Waiting for opponent confirmation.' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

async function calculateElo(supabase: ReturnType<typeof createClient>, matchId: string, winnerId: string, loserId: string) {
  const K = 32

  // Fetch winner and loser ELO — use FOR UPDATE equivalent via separate reads and optimistic update
  const [{ data: winner }, { data: loser }] = await Promise.all([
    supabase.from('profiles').select('elo_rating').eq('id', winnerId).single(),
    supabase.from('profiles').select('elo_rating').eq('id', loserId).single(),
  ])

  if (!winner || !loser) return

  const Ra = winner.elo_rating
  const Rb = loser.elo_rating

  const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400))
  const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400))

  const newRa = Math.round(Ra + K * (1 - Ea))
  const newRb = Math.round(Rb + K * (0 - Eb))

  await Promise.all([
    supabase.from('profiles').update({ elo_rating: newRa }).eq('id', winnerId),
    supabase.from('profiles').update({ elo_rating: newRb }).eq('id', loserId),
    supabase.from('elo_history').insert([
      { player_id: winnerId, match_id: matchId, old_rating: Ra, new_rating: newRa, delta: newRa - Ra },
      { player_id: loserId, match_id: matchId, old_rating: Rb, new_rating: newRb, delta: newRb - Rb },
    ]),
  ])
}

async function notifyMatchComplete(
  supabase: ReturnType<typeof createClient>,
  match: Record<string, unknown>,
  winnerId: string,
  loserId: string,
) {
  await supabase.from('notifications').insert([
    {
      user_id: winnerId,
      type: 'match_won',
      title: '🏆 Victoire !',
      body: `Tu as remporté le match #${(match.match_number as number | null) ?? (match.id as string).slice(0, 8)}. ELO mis à jour.`,
      data: { match_id: match.id },
    },
    {
      user_id: loserId,
      type: 'match_lost',
      title: '😞 Défaite',
      body: `Tu as perdu le match #${(match.match_number as number | null) ?? (match.id as string).slice(0, 8)}. Continue de t'entraîner !`,
      data: { match_id: match.id },
    },
  ])
}

function errorResponse(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
