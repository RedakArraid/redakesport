import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface NotificationRequest {
  user_ids: string[]
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const body: NotificationRequest = await req.json()
    const { user_ids, type, title, body: notifBody, data } = body

    // Validate required fields
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return errorResponse('user_ids must be a non-empty array')
    }
    if (!type || !title || !notifBody) {
      return errorResponse('Missing required fields: type, title, body')
    }
    if (user_ids.length > 1000) {
      return errorResponse('Cannot send to more than 1000 users at once')
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Batch insert notifications
    const notifications = user_ids.map((user_id) => ({
      user_id,
      type,
      title,
      body: notifBody,
      data: data ?? null,
      read: false,
      created_at: new Date().toISOString(),
    }))

    const { error: insertErr, count } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id', { count: 'exact', head: true })

    if (insertErr) {
      return errorResponse(`Failed to insert notifications: ${insertErr.message}`)
    }

    // Optional: try Discord DM via webhook (best effort, non-blocking)
    // Fetch users who have a discord_webhook set in their profile
    const discordResults: { user_id: string; success: boolean }[] = []
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, discord_webhook')
        .in('id', user_ids)
        .not('discord_webhook', 'is', null)

      if (profiles && profiles.length > 0) {
        const discordPromises = profiles.map(async (profile) => {
          try {
            const webhookUrl: string = profile.discord_webhook
            if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
              return { user_id: profile.id, success: false }
            }

            const embed = {
              title,
              description: notifBody,
              color: 0x5865f2,
              timestamp: new Date().toISOString(),
            }

            const res = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ embeds: [embed] }),
              signal: AbortSignal.timeout(5000), // 5s timeout per webhook
            })

            return { user_id: profile.id, success: res.ok }
          } catch {
            // Best effort — swallow individual errors
            return { user_id: profile.id, success: false }
          }
        })

        const results = await Promise.allSettled(discordPromises)
        results.forEach((r) => {
          if (r.status === 'fulfilled') discordResults.push(r.value)
        })
      }
    } catch {
      // Best effort — Discord errors must never block the main response
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: user_ids.length,
        discord_notified: discordResults.filter((r) => r.success).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})

function errorResponse(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
