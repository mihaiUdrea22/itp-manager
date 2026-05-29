'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Clock, CalendarDays, CalendarIcon, Pause } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { WorkingHours } from '@/types/database'

// ── Romanian Legal Holidays ───────────────────────────────────────

const ROMANIAN_HOLIDAYS = [
  { date: '01-01', label: 'Anul nou' },
  { date: '01-02', label: 'A doua zi de anul nou' },
  { date: '01-06', label: 'Boboteaza' },
  { date: '01-07', label: 'Sfantul Ioan Botezatorul' },
  { date: '01-24', label: 'Ziua Unirii Principatelor Romane' },
  { date: '04-10', label: 'Vinerea Mare a Pastelui' },
  { date: '04-12', label: 'Pastele Ortodox' },
  { date: '04-13', label: 'A doua zi de Paste' },
  { date: '05-01', label: 'Ziua Muncii' },
  { date: '05-31', label: 'Rusaliile' },
  { date: '06-01', label: 'Ziua Copilului' },
  { date: '08-15', label: 'Adormirea Maicii Domnului' },
  { date: '11-30', label: 'Sfantul Andrei' },
  { date: '12-01', label: 'Ziua Nationala a Romaniei' },
  { date: '12-25', label: 'Prima zi de Craciun' },
  { date: '12-26', label: 'A doua zi de Craciun' },
]

function formatHolidayDate(mmdd: string): string {
  const [month, day] = mmdd.split('-').map(Number)
  const monthNames = [
    '', 'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
  ]
  return `${day} ${monthNames[month]}`
}

// ── Time options ──────────────────────────────────────────────────

const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`)
  if (h < 22) TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:30`)
}

const DAY_LABELS: Record<number, string> = {
  1: 'Luni',
  2: 'Marti',
  3: 'Miercuri',
  4: 'Joi',
  5: 'Vineri',
  6: 'Sambata',
  0: 'Duminica',
}

// day_of_week order for display: 1,2,3,4,5,6,0
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// ── Component ─────────────────────────────────────────────────────

export function ProgramTab() {
  const { staff, station } = useAuth()
  const supabase = createClient()

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([])
  const [blockHolidays, setBlockHolidays] = useState(true)
  const [suspendFrom, setSuspendFrom] = useState<Date | undefined>(undefined)
  const [suspendTo, setSuspendTo] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!staff) return

    // Load working hours
    const { data: whData } = await supabase
      .from('working_hours')
      .select('*')
      .eq('station_id', staff.station_id)
      .order('day_of_week')

    if (whData) setWorkingHours(whData as WorkingHours[])

    // Load station settings
    const { data: stationData } = await supabase
      .from('stations')
      .select('block_holidays, suspend_from, suspend_to')
      .eq('id', staff.station_id)
      .single()

    if (stationData) {
      setBlockHolidays((stationData as any).block_holidays ?? true)
      setSuspendFrom((stationData as any).suspend_from ? new Date((stationData as any).suspend_from + 'T00:00:00') : undefined)
      setSuspendTo((stationData as any).suspend_to ? new Date((stationData as any).suspend_to + 'T00:00:00') : undefined)
    }

    setLoading(false)
  }, [staff])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Working hours handlers ────────────────────────────────────

  const toggleDay = async (dayOfWeek: number, isWorking: boolean) => {
    if (!staff) return
    const existing = workingHours.find((wh) => wh.day_of_week === dayOfWeek)

    if (existing) {
      await supabase
        .from('working_hours')
        .update({ is_working: isWorking })
        .eq('id', existing.id)
    } else {
      await supabase.from('working_hours').insert({
        station_id: staff.station_id,
        day_of_week: dayOfWeek,
        is_working: isWorking,
        start_time: '08:30',
        end_time: '20:00',
      })
    }
    loadData()
  }

  const updateTime = async (
    dayOfWeek: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    if (!staff) return
    const existing = workingHours.find((wh) => wh.day_of_week === dayOfWeek)

    if (existing) {
      await supabase
        .from('working_hours')
        .update({ [field]: value + ':00' })
        .eq('id', existing.id)
    } else {
      await supabase.from('working_hours').insert({
        station_id: staff.station_id,
        day_of_week: dayOfWeek,
        [field]: value + ':00',
        is_working: true,
      })
    }
    loadData()
  }

  // ── Station settings handlers ─────────────────────────────────

  const toggleBlockHolidays = async (value: boolean) => {
    if (!staff) return
    setBlockHolidays(value)
    await supabase
      .from('stations')
      .update({ block_holidays: value })
      .eq('id', staff.station_id)
  }

  const updateSuspend = async (from: Date | undefined, to: Date | undefined) => {
    if (!staff) return
    setSuspendFrom(from)
    setSuspendTo(to)
    await supabase
      .from('stations')
      .update({
        suspend_from: from ? format(from, 'yyyy-MM-dd') : null,
        suspend_to: to ? format(to, 'yyyy-MM-dd') : null,
      })
      .eq('id', staff.station_id)
  }

  const clearSuspend = async () => {
    await updateSuspend(undefined, undefined)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Se incarca...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8">
      {/* ═══ Left Column ═══ */}
      <div className="space-y-8">
        {/* Program de lucru */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Program de lucru</h2>
          </div>

          <div className="border rounded-xl overflow-hidden">
            {DAY_ORDER.map((day, idx) => {
              const wh = workingHours.find((w) => w.day_of_week === day)
              const isWorking = wh?.is_working ?? (day !== 0) // Default: closed on Sunday
              const startTime = wh?.start_time?.substring(0, 5) || (day === 6 ? '09:00' : '08:30')
              const endTime = wh?.end_time?.substring(0, 5) || (day === 6 ? '14:00' : '20:00')

              return (
                <div
                  key={day}
                  className={cn(
                    'flex items-center gap-4 px-5 py-3.5',
                    idx < DAY_ORDER.length - 1 && 'border-b'
                  )}
                >
                  <span className="text-sm font-medium w-24 text-foreground">
                    {DAY_LABELS[day]}
                  </span>
                  <Switch
                    checked={isWorking}
                    onCheckedChange={(v) => toggleDay(day, v)}
                    className="data-[state=checked]:bg-primary"
                  />
                  {isWorking ? (
                    <>
                      <span className="text-sm text-muted-foreground">Deschis</span>
                      <Select
                        value={startTime}
                        onValueChange={(v) => updateTime(day, 'start_time', v)}
                      >
                        <SelectTrigger className="h-8 w-[90px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">-</span>
                      <Select
                        value={endTime}
                        onValueChange={(v) => updateTime(day, 'end_time', v)}
                      >
                        <SelectTrigger className="h-8 w-[90px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Inchis</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Suspendare activitate */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Pause size={18} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Suspendare activitate</h2>
          </div>

          <div className="border rounded-xl p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Setati o perioada in care statia nu accepta programari.
            </p>

            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs text-muted-foreground font-medium">De la</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-9 justify-start text-left font-normal text-sm',
                        !suspendFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {suspendFrom
                        ? format(suspendFrom, 'd MMM yyyy', { locale: ro })
                        : 'Selecteaza'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={suspendFrom}
                      onSelect={(d) => updateSuspend(d, suspendTo)}
                      locale={ro}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5 flex-1">
                <label className="text-xs text-muted-foreground font-medium">Pana la</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-9 justify-start text-left font-normal text-sm',
                        !suspendTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {suspendTo
                        ? format(suspendTo, 'd MMM yyyy', { locale: ro })
                        : 'Selecteaza'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={suspendTo}
                      onSelect={(d) => updateSuspend(suspendFrom, d)}
                      locale={ro}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {(suspendFrom || suspendTo) && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm text-amber-600 font-medium">
                  {suspendFrom && suspendTo
                    ? `Statia suspendata: ${format(suspendFrom, 'd MMM', { locale: ro })} — ${format(suspendTo, 'd MMM yyyy', { locale: ro })}`
                    : 'Completati ambele date'}
                </p>
                <Button variant="outline" size="sm" onClick={clearSuspend} className="text-xs h-7">
                  Anuleaza suspendarea
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Right Column — Holidays ═══ */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Blocare zile (sarbatori legale)
            </h2>
          </div>
          <Switch
            checked={blockHolidays}
            onCheckedChange={toggleBlockHolidays}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <div className={cn(
          'border rounded-xl overflow-hidden transition-opacity',
          !blockHolidays && 'opacity-50 pointer-events-none'
        )}>
          {ROMANIAN_HOLIDAYS.map((holiday, idx) => (
            <div
              key={holiday.date}
              className={cn(
                'flex items-center gap-3 px-5 py-3',
                idx < ROMANIAN_HOLIDAYS.length - 1 && 'border-b'
              )}
            >
              <span className="text-sm font-semibold text-foreground w-32">
                {formatHolidayDate(holiday.date)}
              </span>
              <span className="text-sm text-muted-foreground">-</span>
              <span className="text-sm text-foreground">{holiday.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
