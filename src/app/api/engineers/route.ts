import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Admin client with service role key (can create auth users)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/engineers — Create a new engineer
export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is authenticated and is admin
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    // Get the requesting user's staff record
    const adminClient = createAdminClient()
    const { data: requestingStaff } = await adminClient
      .from('staff')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!requestingStaff || requestingStaff.role !== 'admin') {
      return NextResponse.json({ error: 'Doar adminii pot adauga ingineri' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role = 'engineer' } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nume, email si parola sunt obligatorii' }, { status: 400 })
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for local dev
    })

    if (authError) {
      // If user already exists, try to find them
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: 'Un utilizator cu acest email exista deja' }, { status: 409 })
      }
      throw authError
    }

    // 2. Create staff record
    const { data: staffData, error: staffError } = await adminClient
      .from('staff')
      .insert({
        user_id: authData.user.id,
        station_id: requestingStaff.station_id,
        name,
        email,
        role,
        is_active: true,
        accepts_online: true,
      })
      .select()
      .single()

    if (staffError) throw staffError

    // 3. Create default working hours (Mon-Fri 08:30-20:00, Sat 09:00-14:00)
    const defaultHours = [
      { day: 1, start: '08:30', end: '20:00', working: true },
      { day: 2, start: '08:30', end: '20:00', working: true },
      { day: 3, start: '08:30', end: '20:00', working: true },
      { day: 4, start: '08:30', end: '20:00', working: true },
      { day: 5, start: '08:30', end: '20:00', working: true },
      { day: 6, start: '09:00', end: '14:00', working: true },
    ]

    await adminClient.from('engineer_working_hours').insert(
      defaultHours.map((h) => ({
        engineer_id: staffData.id,
        station_id: requestingStaff.station_id,
        day_of_week: h.day,
        start_time: h.start,
        end_time: h.end,
        is_working: h.working,
      }))
    )

    return NextResponse.json({ success: true, engineer: staffData })
  } catch (err: any) {
    console.error('Error creating engineer:', err)
    return NextResponse.json(
      { error: err.message || 'Eroare la crearea inginerului' },
      { status: 500 }
    )
  }
}

// DELETE /api/engineers — Delete an engineer (removes auth user + staff)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: requestingStaff } = await adminClient
      .from('staff')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!requestingStaff || requestingStaff.role !== 'admin') {
      return NextResponse.json({ error: 'Doar adminii pot sterge ingineri' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const engineerId = searchParams.get('id')

    if (!engineerId) {
      return NextResponse.json({ error: 'ID inginer lipsa' }, { status: 400 })
    }

    // Get staff record to find user_id
    const { data: staffRecord } = await adminClient
      .from('staff')
      .select('*')
      .eq('id', engineerId)
      .eq('station_id', requestingStaff.station_id)
      .single()

    if (!staffRecord) {
      return NextResponse.json({ error: 'Inginerul nu a fost gasit' }, { status: 404 })
    }

    // Don't allow deleting yourself
    if (staffRecord.user_id === user.id) {
      return NextResponse.json({ error: 'Nu te poti sterge pe tine' }, { status: 400 })
    }

    // Delete working hours and blocked intervals first
    await adminClient.from('engineer_working_hours').delete().eq('engineer_id', engineerId)
    await adminClient.from('engineer_blocked_intervals').delete().eq('engineer_id', engineerId)

    // Delete staff record
    await adminClient.from('staff').delete().eq('id', engineerId)

    // Delete auth user
    await adminClient.auth.admin.deleteUser(staffRecord.user_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error deleting engineer:', err)
    return NextResponse.json(
      { error: err.message || 'Eroare la stergerea inginerului' },
      { status: 500 }
    )
  }
}
