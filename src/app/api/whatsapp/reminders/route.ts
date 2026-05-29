import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { format, addHours } from 'date-fns'
import { ro } from 'date-fns/locale'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getWhatsAppCredentials(stationId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
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

function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1)
  if (cleaned.startsWith('0')) cleaned = '40' + cleaned.substring(1)
  if (!cleaned.startsWith('40') && cleaned.length <= 10) cleaned = '40' + cleaned
  return cleaned
}

/**
 * GET /api/whatsapp/reminders
 *
 * Checks for appointments happening within the configured reminder window
 * and sends WhatsApp reminder messages.
 *
 * This should be called periodically (e.g., every 15 minutes via cron).
 * Query params:
 *   - secret: A simple API key to protect the endpoint (optional for local dev)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const now = new Date()

    // Get all stations with reminder settings
    const { data: allStations } = await supabase
      .from('stations')
      .select('id, name, address')

    if (!allStations || allStations.length === 0) {
      return NextResponse.json({ message: 'No stations found', sent: 0 })
    }

    let totalSent = 0
    const errors: string[] = []

    for (const stationObj of allStations) {
      // Get WhatsApp credentials for this station
      const { phoneNumberId: PHONE_NUMBER_ID, accessToken: ACCESS_TOKEN } =
        await getWhatsAppCredentials(stationObj.id)

      if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) continue

      // Load reminder settings for this station
      const { data: settings } = await supabase
        .from('station_settings')
        .select('*')
        .eq('station_id', stationObj.id)
        .in('key', [
          'sms_reamintire_enabled',
          'sms_reamintire_template',
          'sms_reamintire_meta_template',
          'whatsapp_template_lang',
          'reminder_hours',
        ])

      if (!settings) continue

      const settingsMap = Object.fromEntries(
        (settings as Array<{ key: string; value: string }>).map((s) => [s.key, s.value])
      )

      // Check if reminders are enabled
      if (settingsMap.sms_reamintire_enabled === 'false') continue

      const reminderHours = parseInt(settingsMap.reminder_hours || '1') || 1
      const metaTemplate = settingsMap.sms_reamintire_meta_template || ''
      const textTemplate =
        settingsMap.sms_reamintire_template ||
        'Va reamintim ca astazi la ora {ora} aveti programare ITP Manager pentru {numar}. Va asteptam la {statie}.'
      const lang = settingsMap.whatsapp_template_lang || 'ro'

      // Find appointments in the reminder window:
      // appointments where date = today AND time is within [now + reminderHours - 15min, now + reminderHours + 15min]
      const reminderTime = addHours(now, reminderHours)
      const targetDate = format(reminderTime, 'yyyy-MM-dd')
      const targetTimeStart = format(addHours(now, reminderHours - 0.25), 'HH:mm:00')
      const targetTimeEnd = format(addHours(now, reminderHours + 0.25), 'HH:mm:00')

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, date, time, send_sms, reminder_sent,
          client:clients(id, phone, name),
          vehicle:vehicles(id, plate_number, brand)
        `)
        .eq('station_id', stationObj.id)
        .eq('date', targetDate)
        .eq('status', 'scheduled')
        .eq('send_sms', true)
        .gte('time', targetTimeStart)
        .lte('time', targetTimeEnd)

      if (!appointments || appointments.length === 0) continue

      for (const apt of appointments as any[]) {
        // Skip if reminder already sent
        if (apt.reminder_sent) continue

        const clientPhone = apt.client?.phone
        if (!clientPhone) continue

        const formattedPhone = formatPhoneForWhatsApp(clientPhone)
        const aptTime = (apt.time as string).substring(0, 5)
        const plateNumber = apt.vehicle?.plate_number || ''

        let success = false

        if (metaTemplate) {
          // Send via Meta template
          const payload = {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              name: metaTemplate,
              language: { code: lang },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: stationObj.name || 'ITP Manager' },
                    { type: 'text', text: aptTime },
                    { type: 'text', text: plateNumber },
                  ],
                },
              ],
            },
          }

          const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          success = res.ok
          if (!res.ok) {
            const err = await res.json()
            errors.push(`Template reminder failed for ${clientPhone}: ${err?.error?.message}`)
          }
        } else {
          // Send via text message
          const message = textTemplate
            .replace('{data}', format(new Date(apt.date), 'd MMM yyyy', { locale: ro }))
            .replace('{ora}', aptTime)
            .replace('{numar}', plateNumber)
            .replace('{statie}', stationObj.name || '')
            .replace('{adresa}', stationObj.address || '')
            .replace('{client}', apt.client?.name || '')
            .replace('{telefon}', clientPhone)
            .replace('{marca}', apt.vehicle?.brand || '')

          const payload = {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { preview_url: false, body: message },
          }

          const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          success = res.ok
          if (!res.ok) {
            const err = await res.json()
            errors.push(`Text reminder failed for ${clientPhone}: ${err?.error?.message}`)
          }
        }

        // Mark reminder as sent to avoid duplicates
        if (success) {
          await supabase
            .from('appointments')
            .update({ reminder_sent: true })
            .eq('id', apt.id)

          totalSent++
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    console.error('Reminder cron error:', err)
    return NextResponse.json(
      { error: err.message || 'Eroare la trimiterea reamintirilor' },
      { status: 500 }
    )
  }
}
