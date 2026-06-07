import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface TwitchStatusRequest {
  channel_name: string
}

interface TwitchStatusResponse {
  is_live: boolean
  viewer_count?: number
  game?: string
  title?: string
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return errorResponse('Method not allowed', 405)
    }

    let channel_name: string

    if (req.method === 'GET') {
      const url = new URL(req.url)
      channel_name = url.searchParams.get('channel_name') ?? ''
    } else {
      const body: TwitchStatusRequest = await req.json()
      channel_name = body.channel_name
    }

    if (!channel_name || typeof channel_name !== 'string' || channel_name.trim() === '') {
      return errorResponse('Missing required field: channel_name')
    }

    // Sanitize channel name (alphanumeric + underscores only)
    const sanitizedChannel = channel_name.trim().toLowerCase()
    if (!/^[a-z0-9_]{1,25}$/.test(sanitizedChannel)) {
      return errorResponse('Invalid channel_name: must be 1-25 alphanumeric characters or underscores')
    }

    // Check for Twitch credentials
    const clientId = Deno.env.get('TWITCH_CLIENT_ID')
    const accessToken = Deno.env.get('TWITCH_ACCESS_TOKEN')

    if (!clientId || !accessToken) {
      const response: TwitchStatusResponse = {
        is_live: false,
        error: 'Twitch not configured',
      }
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Twitch Helix API
    const twitchUrl = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(sanitizedChannel)}`

    const twitchRes = await fetch(twitchUrl, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!twitchRes.ok) {
      const twitchError = await twitchRes.text()

      // Handle token expiry (401) gracefully
      if (twitchRes.status === 401) {
        return errorResponse('Twitch access token expired or invalid', 502)
      }

      return errorResponse(`Twitch API error (${twitchRes.status}): ${twitchError}`, 502)
    }

    const twitchData = await twitchRes.json()
    const stream = twitchData?.data?.[0]

    if (!stream) {
      // Channel exists but is offline
      const response: TwitchStatusResponse = { is_live: false }
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Stream is live
    const response: TwitchStatusResponse = {
      is_live: true,
      viewer_count: stream.viewer_count ?? 0,
      game: stream.game_name ?? undefined,
      title: stream.title ?? undefined,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})

function errorResponse(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg, is_live: false }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
