import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getWhatsAppCredentials(stationId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('station_settings')
    .select('key, value')
    .eq('station_id', stationId)
    .in('key', ['whatsapp_access_token', 'whatsapp_phone_number_id'])

  const settings: Record<string, string> = {}
  data?.forEach((s: { key: string; value: string }) => {
    settings[s.key] = s.value
  })

  return {
    phoneNumberId: settings.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: settings.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || '',
  }
}

/**
 * Format a Romanian phone number for WhatsApp
 * 07xx xxx xxx -> 407xxxxxxxx
 */
function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')

  // Remove leading +
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1)

  // Romanian mobile: 07xx -> 407xx
  if (cleaned.startsWith('0')) {
    cleaned = '40' + cleaned.substring(1)
  }

  // If doesn't start with country code, add Romania
  if (!cleaned.startsWith('40') && cleaned.length <= 10) {
    cleaned = '40' + cleaned
  }

  return cleaned
}

// POST /api/whatsapp/send — Send a WhatsApp message
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    // Get station_id for the user
    const admin = createAdminClient()
    const { data: staffData } = await admin
      .from('staff')
      .select('station_id')
      .eq('user_id', user.id)
      .single()

    if (!staffData) {
      return NextResponse.json({ error: 'Utilizator fara statie asociata' }, { status: 403 })
    }

    const { phoneNumberId: PHONE_NUMBER_ID, accessToken: ACCESS_TOKEN } =
      await getWhatsAppCredentials(staffData.station_id)

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'WhatsApp API nu este configurat. Mergeti la Setari > API pentru configurare.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { phone, message, templateName, templateParams, language = 'ro' } = body

    if (!phone) {
      return NextResponse.json({ error: 'Numarul de telefon este obligatoriu' }, { status: 400 })
    }

    const formattedPhone = formatPhoneForWhatsApp(phone)

    let whatsappPayload: Record<string, unknown>

    if (templateName) {
      // Send as TEMPLATE message (works for business-initiated conversations)
      whatsappPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: templateParams
            ? [
                {
                  type: 'body',
                  parameters: (templateParams as string[]).map((text: string) => ({
                    type: 'text',
                    text,
                  })),
                },
              ]
            : undefined,
        },
      }
    } else if (message) {
      // Send as TEXT message (only works in 24h customer service window)
      whatsappPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      }
    } else {
      return NextResponse.json(
        { error: 'Trebuie specificat fie un mesaj, fie un template' },
        { status: 400 }
      )
    }

    // Call WhatsApp Cloud API
    console.log('[WhatsApp] Sending payload:', JSON.stringify(whatsappPayload, null, 2))
    console.log('[WhatsApp] Using Phone Number ID:', PHONE_NUMBER_ID)
    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappPayload),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', JSON.stringify(result, null, 2))

      const errorMessage =
        result?.error?.message ||
        result?.error?.error_data?.details ||
        'Eroare la trimiterea mesajului WhatsApp'

      return NextResponse.json(
        {
          error: errorMessage,
          details: result?.error,
        },
        { status: response.status }
      )
    }

    // Log success
    console.log('WhatsApp message sent successfully:', {
      to: formattedPhone,
      messageId: result?.messages?.[0]?.id,
    })

    return NextResponse.json({
      success: true,
      messageId: result?.messages?.[0]?.id,
    })
  } catch (err: any) {
    console.error('WhatsApp send error:', err)
    return NextResponse.json(
      { error: err.message || 'Eroare la trimiterea mesajului' },
      { status: 500 }
    )
  }
}
