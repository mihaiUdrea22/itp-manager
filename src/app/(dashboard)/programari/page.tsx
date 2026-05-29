'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { WeeklyCalendar } from '@/components/programari/weekly-calendar'
import { AppointmentModal } from '@/components/programari/appointment-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Plus,
  Search,
  RefreshCw,
  Home,
} from 'lucide-react'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  parseISO,
  isBefore,
  startOfDay,
} from 'date-fns'
import { ro } from 'date-fns/locale'
import type { AppointmentWithDetails, EngineerWorkingHours, EngineerBlockedInterval } from '@/types/database'

type FilterType = 'all' | 'online' | 'vin'

export default function ProgramariPage() {
  const { staff, station, engineers, loading: authLoading } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [engineerWorkingHours, setEngineerWorkingHours] = useState<EngineerWorkingHours[]>([])
  const [engineerBlockedIntervals, setEngineerBlockedIntervals] = useState<EngineerBlockedInterval[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editAppointment, setEditAppointment] = useState<AppointmentWithDetails | null>(null)
  const [prefillDate, setPrefillDate] = useState<Date | undefined>(undefined)
  const [prefillTime, setPrefillTime] = useState<string | undefined>(undefined)
  const [prefillEngineerId, setPrefillEngineerId] = useState<string | undefined>(undefined)

  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterEngineer, setFilterEngineer] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  const fetchAppointments = useCallback(async () => {
    if (!staff) return

    setLoading(true)

    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    // Fetch appointments, engineer working hours, and blocked intervals in parallel
    let query = supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        vehicle:vehicles(*),
        engineer:staff(*)
      `)
      .eq('station_id', staff.station_id)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .order('date')
      .order('time')

    if (filterType !== 'all') {
      query = query.eq('type', filterType)
    }

    if (filterEngineer !== 'all') {
      query = query.eq('engineer_id', filterEngineer)
    }

    const [aptResult, whResult, biResult] = await Promise.all([
      query,
      supabase
        .from('engineer_working_hours')
        .select('*')
        .eq('station_id', staff.station_id),
      supabase
        .from('engineer_blocked_intervals')
        .select('*')
        .eq('station_id', staff.station_id)
        .gte('blocked_date', weekStartStr)
        .lte('blocked_date', weekEndStr),
    ])

    if (!aptResult.error && aptResult.data) {
      let filtered = aptResult.data as unknown as AppointmentWithDetails[]

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (a) =>
            a.vehicle?.plate_number?.toLowerCase().includes(q) ||
            a.client?.phone?.includes(q) ||
            a.client?.name?.toLowerCase().includes(q)
        )
      }

      setAppointments(filtered)
    }

    if (whResult.data) {
      setEngineerWorkingHours(whResult.data as EngineerWorkingHours[])
    }

    if (biResult.data) {
      setEngineerBlockedIntervals(biResult.data as EngineerBlockedInterval[])
    }

    setLoading(false)
  }, [staff, weekStart, weekEnd, filterType, filterEngineer, searchQuery])

  useEffect(() => {
    if (!authLoading && staff) {
      fetchAppointments()
    }
  }, [authLoading, staff, currentDate, filterType, filterEngineer])

  // Search with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (staff) fetchAppointments()
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const goToToday = () => setCurrentDate(new Date())
  const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))

  // ── Open modal for adding (button) ─────────────────────────────
  const openAddModal = () => {
    setEditAppointment(null)
    setPrefillDate(undefined)
    setPrefillTime(undefined)
    setPrefillEngineerId(undefined)
    setModalOpen(true)
  }

  // ── Open modal for adding from a calendar slot click ────────────
  const openSlotModal = (date: Date, time: string, engineerId?: string) => {
    setEditAppointment(null)
    setPrefillDate(date)
    setPrefillTime(time)
    setPrefillEngineerId(engineerId || undefined)
    setModalOpen(true)
  }

  // ── Open modal for editing an existing appointment ──────────────
  const openEditModal = (appointment: AppointmentWithDetails) => {
    setPrefillDate(undefined)
    setPrefillTime(undefined)
    setEditAppointment(appointment)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditAppointment(null)
    setPrefillDate(undefined)
    setPrefillTime(undefined)
    setPrefillEngineerId(undefined)
  }

  const onModalSuccess = () => {
    closeModal()
    fetchAppointments()
  }

  // ── Drag & drop: move appointment to new date/time ────────────
  const handleAppointmentMove = useCallback(async (appointmentId: string, newDate: string, newTime: string) => {
    // Find the appointment being moved
    const apt = appointments.find((a) => a.id === appointmentId)

    const { error } = await supabase
      .from('appointments')
      .update({ date: newDate, time: newTime })
      .eq('id', appointmentId)

    if (!error) {
      fetchAppointments()

      // Send WhatsApp REPROGRAMARE message
      if (apt?.send_sms && apt?.client?.phone) {
        const targetDate = parseISO(newDate)
        const isPast = isBefore(targetDate, startOfDay(new Date()))
        if (isPast) return

        try {
          const { data: settings } = await supabase
            .from('station_settings')
            .select('key, value')
            .eq('station_id', staff!.station_id)
            .in('key', [
              'sms_reprogramare_enabled',
              'sms_reprogramare_template',
              'sms_reprogramare_meta_template',
              'whatsapp_template_lang',
            ])

          if (!settings) return

          const settingsMap = Object.fromEntries(
            (settings as Array<{ key: string; value: string }>).map((s) => [s.key, s.value])
          )

          if (settingsMap.sms_reprogramare_enabled === 'false') return

          const metaTemplate = settingsMap.sms_reprogramare_meta_template || ''
          const templateLang = settingsMap.whatsapp_template_lang || 'ro'
          const formattedDate = format(targetDate, 'd MMM yyyy', { locale: ro })
          const formattedTime = newTime.substring(0, 5)
          const plateNumber = apt.vehicle?.plate_number || ''

          if (metaTemplate) {
            const templateParams = [
              station?.name || 'ITP Manager',
              formattedDate,
              formattedTime,
              plateNumber,
            ]

            await fetch('/api/whatsapp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: apt.client.phone,
                templateName: metaTemplate,
                templateParams,
                language: templateLang,
              }),
            })
          } else {
            const textTemplate =
              settingsMap.sms_reprogramare_template ||
              'Reprogramare ITP Manager pentru {numar} pe data de {data} la ora {ora}. Va asteptam la {statie}.'

            const message = textTemplate
              .replace('{data}', formattedDate)
              .replace('{ora}', formattedTime)
              .replace('{numar}', plateNumber)
              .replace('{statie}', station?.name || '')
              .replace('{adresa}', station?.address || '')
              .replace('{client}', apt.client?.name || '')
              .replace('{telefon}', apt.client?.phone || '')

            await fetch('/api/whatsapp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: apt.client.phone, message }),
            })
          }

          console.log('[WhatsApp] Reprogramare message sent (drag & drop)')
        } catch (err) {
          console.warn('[WhatsApp] Reprogramare error (non-blocking):', err)
        }
      }
    }
  }, [supabase, fetchAppointments, appointments, staff, station])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-primary">Programari</h1>
          </div>

          {/* Engineer filter */}
          <Select value={filterEngineer} onValueChange={setFilterEngineer}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Toti inginerii" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toti inginerii</SelectItem>
              {engineers.map((eng) => (
                <SelectItem key={eng.id} value={eng.id}>
                  {eng.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filters */}
          <div className="flex items-center gap-1">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="h-8 text-xs"
            >
              Toate
            </Button>
            <Button
              variant={filterType === 'online' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('online')}
              className="h-8 text-xs"
            >
              Online
            </Button>
            <Button
              variant={filterType === 'vin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('vin')}
              className="h-8 text-xs"
            >
              VIN
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevWeek}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToToday}>
              <Home size={14} />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cautare ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-[200px]"
            />
          </div>

          {/* Add button */}
          <Button
            onClick={openAddModal}
            className="h-9 gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus size={16} />
            Adauga
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={fetchAppointments}
          >
            <RotateCw size={14} />
          </Button>
        </div>
      </header>

      {/* Calendar */}
      <div className="flex-1 overflow-auto">
        <WeeklyCalendar
          currentDate={currentDate}
          appointments={appointments}
          engineers={filterEngineer === 'all' ? engineers : engineers.filter(e => e.id === filterEngineer)}
          engineerWorkingHours={engineerWorkingHours}
          engineerBlockedIntervals={engineerBlockedIntervals}
          showAllEngineers={filterEngineer === 'all'}
          onAppointmentClick={openEditModal}
          onSlotClick={openSlotModal}
          onAppointmentMove={handleAppointmentMove}
        />
      </div>

      {/* Unified Add/Edit Modal */}
      <AppointmentModal
        open={modalOpen}
        onClose={closeModal}
        onSuccess={onModalSuccess}
        editAppointment={editAppointment}
        prefillDate={prefillDate}
        prefillTime={prefillTime}
        prefillEngineerId={prefillEngineerId}
      />
    </div>
  )
}
