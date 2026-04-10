import '@supabase/functions-js/edge-runtime.d.ts'

// Global Deno declaration to prevent TS errors in non-Deno IDE environments
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req: Request) => {
  try {
    // ── 1. Parse request body ────────────────────────────────────────────────
    // Accepts: { user_id: string | null, queue_number: number }
    // Legacy support: { patient_number: string, queue_number: number }
    const body = await req.json()
    const { user_id, queue_number, patient_number: legacyPhone } = body

    // ── 2. Load secrets ──────────────────────────────────────────────────────
    const TWILIO_ACCOUNT_SID   = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN    = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER  = Deno.env.get('TWILIO_PHONE_NUMBER')
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials are not configured.')
    }

    // ── 3. Resolve the patient's phone number ────────────────────────────────
    let patientPhone: string | null = legacyPhone ?? null

    if (!patientPhone && user_id) {
      // Look up the mobile_number from the users table.
      // We use the service role key so RLS does not block the read.
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('Supabase service credentials are not configured.')
      }

      const userRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=mobile_number&id=eq.${encodeURIComponent(user_id)}&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      )

      if (!userRes.ok) {
        throw new Error(`Supabase users lookup failed: ${userRes.status}`)
      }

      const users: Array<{ mobile_number: string | null }> = await userRes.json()
      patientPhone = users?.[0]?.mobile_number ?? null
    }

    // ── 4. Guard: no phone number available (walk-in or unregistered) ────────
    if (!patientPhone) {
      return new Response(
        JSON.stringify({ success: false, reason: 'No phone number for this patient. SMS skipped.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Build the SMS message ─────────────────────────────────────────────
    // Keep it under 160 characters and avoid emojis for reliable delivery.
    const messageBody =
      `BarrioMed: Ticket #${queue_number} malapit nang tatawagin! ` +
      `Pumunta na po sa Barangay Health Center. Salamat. (Huwag sumagot.)`

    // ── 6. Send via Twilio Messages API ─────────────────────────────────────
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    const formBody = new URLSearchParams({
      To:   patientPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: messageBody,
    })

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
      body: formBody.toString(),
    })

    const twilioData = await twilioRes.json()

    if (!twilioRes.ok) {
      throw new Error(`Twilio error ${twilioRes.status}: ${twilioData?.message ?? 'Unknown'}`)
    }

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[twilio-queue-alert] Error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})