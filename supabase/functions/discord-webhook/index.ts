import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DiscordField {
  name: string
  value: string
  inline?: boolean
}

interface DiscordMessage {
  title: string
  description: string
  color?: number
  fields?: DiscordField[]
}

interface WebhookRequest {
  webhook_url: string
  message: DiscordMessage
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const body: WebhookRequest = await req.json()
    const { webhook_url, message } = body

    // Validate required fields
    if (!webhook_url || !message?.title || !message?.description) {
      return errorResponse('Missing required fields: webhook_url, message.title, message.description')
    }

    // Security: validate webhook URL
    if (!webhook_url.startsWith('https://discord.com/api/webhooks/')) {
      return errorResponse('Invalid webhook_url: must start with https://discord.com/api/webhooks/')
    }

    // Build Discord embed payload
    const embed: Record<string, unknown> = {
      title: message.title,
      description: message.description,
      color: message.color ?? 0x5865f2, // Default Discord blurple
      timestamp: new Date().toISOString(),
    }

    if (message.fields && message.fields.length > 0) {
      embed.fields = message.fields.map((f) => ({
        name: f.name,
        value: f.value,
        inline: f.inline ?? false,
      }))
    }

    const discordPayload = {
      embeds: [embed],
    }

    // Send to Discord
    const discordRes = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    })

    if (!discordRes.ok) {
      const discordError = await discordRes.text()
      return errorResponse(`Discord API error (${discordRes.status}): ${discordError}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
