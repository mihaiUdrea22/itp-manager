'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Users,
  Car,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Timer,
  Phone,
  Minus,
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfDay, addDays, isToday, subWeeks } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import type { AppointmentWithDetails, Staff } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────────
const formatPhone = (digits: string) => {
  if (!digits) return ''
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
}

const statusLabel: Record<string, string> = {
  scheduled: 'Programat',
  completed: 'Finalizat',
  cancelled: 'Anulat',
  no_show: 'Neprezentare',
}

const statusColor: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-yellow-100 text-yellow-700',
}

// ── Page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { station, staff, engineers, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Data
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithDetails[]>([])
  const [weekAppointments, setWeekAppointments] = useState<AppointmentWithDetails[]>([])
  const [lastWeekCount, setLastWeekCount] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const [totalVehicles, setTotalVehicles] = useState(0)
  const [dailyCounts, setDailyCounts] = useState<number[]>([0, 0, 0, 0, 0, 0])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

  const fetchDashboard = useCallback(async () => {
    if (!staff) return
    setLoading(true)

    const sid = staff.station_id

    // Run all queries in parallel
    const [
      todayRes,
      weekRes,
      lastWeekRes,
      clientsRes,
      vehiclesRes,
    ] = await Promise.all([
      // Today appointments with details
      supabase
        .from('appointments')
        .select('*, client:clients(*), vehicle:vehicles(*), engineer:staff(*)')
        .eq('station_id', sid)
        .eq('date', todayStr)
        .neq('status', 'cancelled')
        .order('time'),
      // This week appointments
      supabase
        .from('appointments')
        .select('*, client:clients(*), vehicle:vehicles(*), engineer:staff(*)')
        .eq('station_id', sid)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')
        .order('date')
        .order('time'),
      // Last week count
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('station_id', sid)
        .gte('date', format(lastWeekStart, 'yyyy-MM-dd'))
        .lte('date', format(lastWeekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled'),
      // Total clients
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('station_id', sid),
      // Total vehicles
      supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('station_id', sid),
    ])

    const todayApts = (todayRes.data || []) as unknown as AppointmentWithDetails[]
    const weekApts = (weekRes.data || []) as unknown as AppointmentWithDetails[]

    setTodayAppointments(todayApts)
    setWeekAppointments(weekApts)
    setLastWeekCount(lastWeekRes.count || 0)
    setTotalClients(clientsRes.count || 0)
    setTotalVehicles(vehiclesRes.count || 0)

    // Daily counts for Mon-Sat
    const counts = [0, 0, 0, 0, 0, 0]
    weekApts.forEach((apt) => {
      const d = new Date(apt.date + 'T00:00:00')
      const dayIndex = d.getDay() // 0=Sun, 1=Mon...6=Sat
      if (dayIndex >= 1 && dayIndex <= 6) {
        counts[dayIndex - 1]++
      }
    })
    setDailyCounts(counts)

    setLoading(false)
  }, [staff])

  useEffect(() => {
    if (!authLoading && staff) fetchDashboard()
  }, [authLoading, staff])

  // Derived stats
  const todayCompleted = todayAppointments.filter((a) => a.status === 'completed').length
  const todayRemaining = todayAppointments.filter((a) => a.status === 'scheduled').length
  const weekTotal = weekAppointments.length
  const weekDiff = weekTotal - lastWeekCount
  const weekDiffPercent = lastWeekCount > 0 ? Math.round((weekDiff / lastWeekCount) * 100) : 0

  const isAppointmentComplete = (a: AppointmentWithDetails) =>
    !!a.client?.phone &&
    !!a.client?.name &&
    !!a.vehicle?.plate_number &&
    !!a.vehicle?.vin &&
    !!(a.vehicle as any)?.civ &&
    !!a.vehicle?.category &&
    !!a.vehicle?.brand &&
    !!a.vehicle?.manufacture_year &&
    !!a.vehicle?.fuel_type

  const incompleteAppointments = weekAppointments.filter(
    (a) => a.status === 'scheduled' && !isAppointmentComplete(a)
  )

  const todayComplete = todayAppointments.filter((a) => isAppointmentComplete(a)).length
  const todayIncomplete = todayAppointments.filter((a) => !isAppointmentComplete(a)).length

  // Rezultat inspectii stats
  const weekAdmis = weekAppointments.filter((a) => (a as any).result === 'admis').length
  const weekRespins = weekAppointments.filter((a) => (a as any).result === 'respins').length
  const weekNeprezentare = weekAppointments.filter((a) => (a as any).result === 'neprezentare').length
  const weekFaraRezultat = weekAppointments.filter((a) => !(a as any).result && a.status === 'scheduled').length

  const nowTime = format(now, 'HH:mm')
  const upcomingToday = todayAppointments
    .filter((a) => a.status === 'scheduled' && (a.time as string).substring(0, 5) >= nowTime)
    .slice(0, 5)

  // Engineer workload
  const engineerWorkload = engineers.map((eng) => {
    const todayCount = todayAppointments.filter((a) => a.engineer_id === eng.id).length
    const weekCount = weekAppointments.filter((a) => a.engineer_id === eng.id).length
    return { ...eng, todayCount, weekCount }
  })

  // Chart max for scaling bars
  const maxDaily = Math.max(...dailyCounts, 1)
  const dayLabels = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam']

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto max-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Bine ai venit, <span className="font-medium text-foreground">{staff?.name}</span>
            {station && <span> — {station.name}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchDashboard}>
          <RefreshCw size={14} />
          Actualizeaza
        </Button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Programari azi */}
        <div className="bg-white border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Programari azi</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <CalendarDays size={18} className="text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold">{todayAppointments.length}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-green-500" />
              {todayComplete} complete
            </span>
            <span className="flex items-center gap-1">
              <XCircle size={12} className="text-red-500" />
              {todayIncomplete} incomplete
            </span>
          </div>
        </div>

        {/* Programari saptamana */}
        <div className="bg-white border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Saptamana aceasta</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <CalendarDays size={18} className="text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold">{weekTotal}</div>
          <div className="flex items-center gap-1 text-xs">
            {weekDiff > 0 ? (
              <>
                <TrendingUp size={14} className="text-green-500" />
                <span className="text-green-600 font-medium">+{weekDiffPercent}%</span>
              </>
            ) : weekDiff < 0 ? (
              <>
                <TrendingDown size={14} className="text-red-500" />
                <span className="text-red-600 font-medium">{weekDiffPercent}%</span>
              </>
            ) : (
              <>
                <Minus size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground font-medium">0%</span>
              </>
            )}
            <span className="text-muted-foreground ml-1">vs saptamana trecuta</span>
          </div>
        </div>

        {/* Total clienti */}
        <div className="bg-white border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total clienti</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users size={18} className="text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold">{totalClients}</div>
          <p className="text-xs text-muted-foreground">Clienti inregistrati</p>
        </div>

        {/* Total vehicule */}
        <div className="bg-white border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total vehicule</span>
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Car size={18} className="text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-bold">{totalVehicles}</div>
          <p className="text-xs text-muted-foreground">Vehicule inregistrate</p>
        </div>
      </div>

      {/* ── Main Content Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Programari azi (tabel) ──────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's appointments table */}
          <div className="bg-white border rounded-xl">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-primary" />
                <h2 className="font-semibold text-sm">Programari azi — {format(now, 'd MMMM yyyy', { locale: ro })}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-primary"
                onClick={() => router.push('/programari')}
              >
                Vezi calendar <ArrowRight size={14} />
              </Button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nu exista programari pentru azi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8"></th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Ora</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Client</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nr. inmatriculare</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Inginer</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Rezultat</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppointments.map((apt) => {
                      const timeStr = (apt.time as string).substring(0, 5)
                      const isPast = timeStr < nowTime && apt.status === 'scheduled'
                      const complete = isAppointmentComplete(apt)
                      return (
                        <tr
                          key={apt.id}
                          className={`border-b last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors ${
                            !complete ? 'bg-red-50/40' : ''
                          }`}
                          onClick={() => router.push('/programari')}
                        >
                          <td className="px-4 py-3">
                            {complete ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                              <XCircle size={16} className="text-red-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium">{timeStr}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{apt.client?.name || '—'}</span>
                              <span className="text-xs text-muted-foreground">
                                {apt.client?.phone ? formatPhone(apt.client.phone) : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium uppercase">
                            {apt.vehicle?.plate_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{apt.engineer?.name || '—'}</td>
                          <td className="px-4 py-3">
                            {(apt as any).result ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                (apt as any).result === 'admis' ? 'bg-emerald-100 text-emerald-700' :
                                (apt as any).result === 'respins' ? 'bg-orange-100 text-orange-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {(apt as any).result === 'admis' ? '✓ Admis' :
                                 (apt as any).result === 'respins' ? '✗ Respins' :
                                 '— Neprezentare'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[apt.status] || ''}`}>
                              {statusLabel[apt.status] || apt.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Incomplete Appointments ─────────────────────── */}
          {incompleteAppointments.length > 0 && (
            <div className="bg-white border border-red-200 rounded-xl">
              <div className="px-5 py-4 border-b border-red-100 bg-red-50/50 rounded-t-xl flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-semibold text-sm text-red-700">
                  Programari incomplete ({incompleteAppointments.length})
                </h2>
              </div>

              <div className="divide-y">
                {incompleteAppointments.slice(0, 8).map((apt) => {
                  const missing: string[] = []
                  if (!apt.client?.phone) missing.push('telefon')
                  if (!apt.client?.name) missing.push('nume client')
                  if (!apt.vehicle?.plate_number) missing.push('nr. inmatriculare')
                  if (!apt.vehicle?.vin) missing.push('serie sasiu')
                  if (!(apt.vehicle as any)?.civ) missing.push('seria C.I.V.')
                  if (!apt.vehicle?.category) missing.push('categorie')
                  if (!apt.vehicle?.brand) missing.push('marca')
                  if (!apt.vehicle?.manufacture_year) missing.push('an fabricatie')
                  if (!apt.vehicle?.fuel_type) missing.push('combustibil')

                  return (
                    <div
                      key={apt.id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-red-50/30 cursor-pointer transition-colors"
                      onClick={() => router.push('/programari')}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-mono text-muted-foreground">
                          {format(new Date(apt.date + 'T00:00:00'), 'd MMM', { locale: ro })} {(apt.time as string).substring(0, 5)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {apt.vehicle?.plate_number?.toUpperCase() || 'Nr. lipsa'} — {apt.client?.name || 'Client necunoscut'}
                          </div>
                          <div className="text-xs text-red-500">
                            Lipseste: {missing.join(', ')}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground" />
                    </div>
                  )
                })}
                {incompleteAppointments.length > 8 && (
                  <div className="px-5 py-3 text-xs text-center text-muted-foreground">
                    ... si inca {incompleteAppointments.length - 8} programari incomplete
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT sidebar ────────────────────────────────── */}
        <div className="space-y-6">
          {/* Urmatoarele programari */}
          <div className="bg-white border rounded-xl">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">Urmatoarele programari</h2>
            </div>

            {upcomingToday.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Nu mai sunt programari azi.
              </div>
            ) : (
              <div className="divide-y">
                {upcomingToday.map((apt) => (
                  <div key={apt.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/5 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{(apt.time as string).substring(0, 5)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {apt.vehicle?.plate_number?.toUpperCase() || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {apt.client?.name || formatPhone(apt.client?.phone || '')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {apt.engineer?.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activitate ingineri */}
          <div className="bg-white border rounded-xl">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">Activitate ingineri</h2>
            </div>
            <div className="divide-y">
              {engineerWorkload.map((eng) => {
                const maxWeek = Math.max(...engineerWorkload.map((e) => e.weekCount), 1)
                const pct = Math.round((eng.weekCount / maxWeek) * 100)
                return (
                  <div key={eng.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{eng.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Azi: <span className="font-semibold text-foreground">{eng.todayCount}</span></span>
                        <span>Sapt: <span className="font-semibold text-foreground">{eng.weekCount}</span></span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {engineerWorkload.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Niciun inginer activ.
                </div>
              )}
            </div>
          </div>

          {/* Rezultate inspectii */}
          <div className="bg-white border rounded-xl">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">Rezultate inspectii (saptamana)</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Admis */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm">Admis</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">{weekAdmis}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${weekTotal > 0 ? (weekAdmis / weekTotal) * 100 : 0}%` }}
                />
              </div>

              {/* Respins */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">Respins</span>
                </div>
                <span className="text-sm font-bold text-orange-600">{weekRespins}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${weekTotal > 0 ? (weekRespins / weekTotal) * 100 : 0}%` }}
                />
              </div>

              {/* Neprezentare */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Neprezentare</span>
                </div>
                <span className="text-sm font-bold text-yellow-600">{weekNeprezentare}</span>
              </div>

              {/* Fara rezultat */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-sm text-muted-foreground">Fara rezultat</span>
                </div>
                <span className="text-sm font-bold text-muted-foreground">{weekFaraRezultat}</span>
              </div>

              {/* Rata admitere */}
              {(weekAdmis + weekRespins) > 0 && (
                <div className="pt-2 border-t text-center">
                  <span className="text-2xl font-bold text-emerald-600">
                    {Math.round((weekAdmis / (weekAdmis + weekRespins)) * 100)}%
                  </span>
                  <p className="text-xs text-muted-foreground">Rata admitere</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistici saptamanale - mini chart */}
          <div className="bg-white border rounded-xl">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">Saptamana curenta</h2>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-end justify-between gap-2 h-32">
                {dailyCounts.map((count, i) => {
                  const todayDayOfWeek = now.getDay() // 0=Sun, 1=Mon...
                  const barIsToday = todayDayOfWeek === i + 1
                  const pct = maxDaily > 0 ? (count / maxDaily) * 100 : 0
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{count}</span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            barIsToday ? 'bg-primary' : 'bg-primary/20'
                          }`}
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                      <span className={`text-xs ${barIsToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                        {dayLabels[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
