import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Generates a Supabase-policy-compliant temp password server-side, using
// the same character-class guarantees as the client-side
// generateTempPassword() in utils/helpers.js (lower/upper/digit/symbol),
// but with crypto.getRandomValues available natively in the Deno runtime
// rather than needing a browser API — this never runs in a browser.
function generateTempPassword(): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const numbers = '23456789'
  const symbols = '!@#$%&*'
  const all = lower + upper + numbers + symbols

  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length]

  const chars = [pick(lower), pick(upper), pick(numbers), pick(symbols)]
  for (let i = 0; i < 6; i++) chars.push(pick(all))

  // Fisher-Yates shuffle so the guaranteed characters aren't always in the
  // same four leading positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { target_user_id } = await req.json()
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'target_user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Identify the caller from their own token (never trust a client-sent id)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role client, bypasses RLS — only used after the admin check below
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Unlike delete-user, there's no "resetting your own password" carve-out
    // here — that's what Settings' own change-password flow is for (it
    // requires the current password). This function exists specifically for
    // an admin resetting *someone else's* forgotten password, so it's
    // admin-only, full stop.
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tempPassword = generateTempPassword()

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(target_user_id, {
      password: tempPassword,
    })

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Same flag the existing forced-password-change reminder banner
    // already reads (Register/AdminDashboard's own account-creation flow
    // sets this too) — reuses that UI rather than needing a new one.
    const { error: flagErr } = await adminClient
      .from('users')
      .update({ force_password_change: true })
      .eq('id', target_user_id)

    if (flagErr) {
      console.error('Password was reset but failed to set force_password_change flag:', flagErr)
    }

    return new Response(JSON.stringify({ success: true, temp_password: tempPassword }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('reset-user-password function error:', e)
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})