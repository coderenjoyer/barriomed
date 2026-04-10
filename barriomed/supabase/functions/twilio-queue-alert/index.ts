import '@supabase/functions-js/edge-runtime.d.ts'

// Global Deno declaration to prevent TS errors in non-Deno IDE environments
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req: Request) => {
  try {
    // 1. Receive the payload from your database trigger
    const { patient_number, queue_number } = await req.json()

    // 2. Format the message (Keep it under 160 chars and avoid emojis!)
    const messageBody = `BarrioMed: Ticket #${queue_number}, malapit na ang numerong tatawagin! Please proceed to the Barangay Health Center. (Do not reply)`

    // 3. Pull the secure keys you set in Step 2
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials are not set.')
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    // 4. Format data for Twilio (URL Encoded)
    const body = new URLSearchParams({
      To: patient_number,       // e.g., +639171234567
      From: TWILIO_PHONE_NUMBER, // e.g., +15551234567
      Body: messageBody,
    })

    // 5. Send the API request to Twilio
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
      },
      body: body.toString(),
    })

    const data = await response.json()
    return new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json" } })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }
})