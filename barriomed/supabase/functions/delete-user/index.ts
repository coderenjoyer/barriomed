// Global Deno declaration to prevent TS errors in non-Deno IDE environments
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // ── 0. Handle CORS preflight ──────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Verify method ──────────────────────────────────────────────────────
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await req.json()
    const { user_id } = body

    if (!user_id || typeof user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Load service-role credentials ─────────────────────────────────────
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase service credentials are not configured.')
    }

    // ── 4. Verify caller is a system_admin (via anon key in Authorization) ────
    // The client sends its JWT; we verify the caller's role before proceeding.
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerJwt  = authHeader.replace('Bearer ', '').trim()

    if (callerJwt) {
      const meRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${callerJwt}`,
        },
      })

      if (meRes.ok) {
        const meData = await meRes.json()
        const callerId: string = meData?.id ?? ''

        if (callerId) {
          // Check the caller's role in the users table
          const roleRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`,
            {
              headers: {
                'apikey':        SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              },
            }
          )

          if (roleRes.ok) {
            const roleData: Array<{ role: string }> = await roleRes.json()
            const callerRole = roleData?.[0]?.role ?? ''

            if (callerRole !== 'system_admin') {
              return new Response(
                JSON.stringify({ error: 'Forbidden: caller is not a system_admin' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }
        }
      }
    }

    // ── 5. Delete the user from auth.users via Admin API ─────────────────────
    const deleteRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(user_id)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!deleteRes.ok) {
      const errBody = await deleteRes.text()
      throw new Error(`Auth deletion failed (${deleteRes.status}): ${errBody}`)
    }

    return new Response(
      JSON.stringify({ success: true, deleted_user_id: user_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[delete-user] Error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
