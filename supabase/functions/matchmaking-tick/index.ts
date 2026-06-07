import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Called by Supabase cron every 30 seconds
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Get all players searching for a match
  const { data: queue, error } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('status', 'searching')
    .order('joined_at', { ascending: true })

  if (error || !queue || queue.length < 2) {
    return new Response(JSON.stringify({ matched: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Group by game_id + region
  const groups = new Map<string, typeof queue>()
  for (const entry of queue) {
    const key = `${entry.game_id ?? 'any'}_${entry.region ?? 'any'}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }

  let totalMatched = 0

  for (const [, players] of groups) {
    // Sort by ELO for better matching
    players.sort((a, b) => a.elo_rating - b.elo_rating)

    // Try to pair players within ±200 ELO
    const matched = new Set<string>()

    for (let i = 0; i < players.length; i++) {
      if (matched.has(players[i].id)) continue

      for (let j = i + 1; j < players.length; j++) {
        if (matched.has(players[j].id)) continue

        const eloDiff = Math.abs(players[i].elo_rating - players[j].elo_rating)
        if (eloDiff <= 200) {
          // Create lobby
          const lobbyId = crypto.randomUUID()
          await supabase.from('lobbies').insert({
            id: lobbyId,
            game_id: players[i].game_id,
            status: 'forming',
            team1_player_ids: [players[i].player_id],
            team2_player_ids: [players[j].player_id],
          })

          // Update both queue entries
          await supabase.from('matchmaking_queue')
            .update({ status: 'matched', party_id: lobbyId })
            .in('id', [players[i].id, players[j].id])

          matched.add(players[i].id)
          matched.add(players[j].id)
          totalMatched += 2
          break
        }
      }
    }
  }

  return new Response(JSON.stringify({ matched: totalMatched }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
