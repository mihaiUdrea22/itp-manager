'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  getDay,
} from 'date-fns'
import { ro } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type {
  AppointmentWithDetails,
  Staff,
  EngineerWorkingHours,
  EngineerBlockedInterval,
} from '@/types/database'

const TIME_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30',
]

// Saturday is a shorter day (until 14:00)
const SATURDAY_END = '14:00'

type Props = {
  currentDate: Date
  appointments: AppointmentWithDetails[]
  engineers: Staff[]
  engineerWorkingHours: EngineerWorkingHours[]
  engineerBlockedIntervals: EngineerBlockedInterval[]
  /** When true, show sub-columns per engineer; when false, single column per day */
  showAllEngineers: boolean
  onAppointmentClick: (appointment: AppointmentWithDetails) => void
  onSlotClick: (date: Date, time: string, engineerId?: string) => void
  onAppointmentMove?: (appointmentId: string, newDate: string, newTime: string) => void
}

export function WeeklyCalendar({
  currentDate,
  appointments,
  engineers,
  engineerWorkingHours,
  engineerBlockedIntervals,
  showAllEngineers,
  onAppointmentClick,
  onSlotClick,
  onAppointmentMove,
}: Props) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)) // Mon-Sat

  // Split into engineer columns only when showing all engineers AND there are multiple
  const splitByEngineer = showAllEngineers && engineers.length > 1

  // Drag state
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // ── Build working hours lookup: engineerId_dayOfWeek -> { is_working, start, end } ──
  const workingHoursMap = useMemo(() => {
    const map: Record<string, { is_working: boolean; start_time: string; end_time: string }> = {}
    engineerWorkingHours.forEach((wh) => {
      map[`${wh.engineer_id}_${wh.day_of_week}`] = {
        is_working: wh.is_working,
        start_time: wh.start_time?.substring(0, 5) || '08:30',
        end_time: wh.end_time?.substring(0, 5) || '20:00',
      }
    })
    return map
  }, [engineerWorkingHours])

  // ── Build blocked intervals lookup: engineerId_date -> array of { start, end } or 'full_day' ──
  const blockedMap = useMemo(() => {
    const map: Record<string, Array<{ start: string; end: string } | 'full_day'>> = {}
    engineerBlockedIntervals.forEach((bi) => {
      const key = `${bi.engineer_id}_${bi.blocked_date}`
      if (!map[key]) map[key] = []
      if (!bi.start_time || !bi.end_time) {
        map[key].push('full_day')
      } else {
        map[key].push({
          start: bi.start_time.substring(0, 5),
          end: bi.end_time.substring(0, 5),
        })
      }
    })
    return map
  }, [engineerBlockedIntervals])

  // ── Check if a specific slot is blocked for an engineer ──
  const isSlotBlocked = useCallback(
    (engineerId: string, dateStr: string, dayOfWeek: number, time: string): boolean => {
      // 1. Check engineer working hours for this day of week
      //    dayOfWeek from getDay(): 0=Sun, 1=Mon, ..., 6=Sat
      const whKey = `${engineerId}_${dayOfWeek}`
      const wh = workingHoursMap[whKey]

      if (wh) {
        // If the engineer doesn't work this day, block all slots
        if (!wh.is_working) return true
        // If the time is outside working hours, block
        if (time < wh.start_time || time >= wh.end_time) return true
      }

      // 2. Check blocked intervals for this specific date
      const biKey = `${engineerId}_${dateStr}`
      const blocks = blockedMap[biKey]
      if (blocks) {
        for (const block of blocks) {
          if (block === 'full_day') return true
          if (time >= block.start && time < block.end) return true
        }
      }

      return false
    },
    [workingHoursMap, blockedMap]
  )

  // Build map: date_time_engineerId -> appointment
  const appointmentMap = useMemo(() => {
    const map: Record<string, AppointmentWithDetails> = {}
    appointments.forEach((apt) => {
      const key = `${apt.date}_${apt.time.substring(0, 5)}_${apt.engineer_id}`
      map[key] = apt
    })
    return map
  }, [appointments])

  // Also keep the old format for single-engineer mode
  const appointmentsByDayTime = useMemo(() => {
    const map: Record<string, AppointmentWithDetails[]> = {}
    appointments.forEach((apt) => {
      const key = `${apt.date}_${apt.time.substring(0, 5)}`
      if (!map[key]) map[key] = []
      map[key].push(apt)
    })
    return map
  }, [appointments])

  // ── Drag handlers ───────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent, apt: AppointmentWithDetails) => {
      e.stopPropagation()
      setDraggedAptId(apt.id)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', apt.id)

      if (e.currentTarget instanceof HTMLElement) {
        requestAnimationFrame(() => {
          if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.4'
          }
        })
      }
    },
    []
  )

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '1'
      }
      setDraggedAptId(null)
      setDropTarget(null)
    },
    []
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, slotKey: string, isNonWorking: boolean) => {
      e.preventDefault()
      if (isNonWorking) {
        e.dataTransfer.dropEffect = 'none'
        return
      }
      e.dataTransfer.dropEffect = 'move'
      setDropTarget(slotKey)
    },
    []
  )

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dateStr: string, time: string, isNonWorking: boolean) => {
      e.preventDefault()
      setDropTarget(null)
      setDraggedAptId(null)

      if (isNonWorking || !onAppointmentMove) return

      const aptId = e.dataTransfer.getData('text/plain')
      if (!aptId) return

      const draggedApt = appointments.find((a) => a.id === aptId)
      if (draggedApt) {
        const currentSlot = `${draggedApt.date}_${draggedApt.time.substring(0, 5)}`
        const targetSlot = `${dateStr}_${time}`
        if (currentSlot === targetSlot) return
      }

      onAppointmentMove(aptId, dateStr, time + ':00')
    },
    [onAppointmentMove, appointments]
  )

  // ── Render appointment button ─────────────────────────────────

  const renderAppointment = (apt: AppointmentWithDetails) => {
    const isComplete =
      !!apt.client?.phone &&
      !!apt.client?.name &&
      !!apt.vehicle?.plate_number &&
      !!apt.vehicle?.vin &&
      !!(apt.vehicle as any)?.civ &&
      !!apt.vehicle?.category &&
      !!apt.vehicle?.brand &&
      !!apt.vehicle?.manufacture_year &&
      !!apt.vehicle?.fuel_type
    const isBeingDragged = draggedAptId === apt.id
    const aptResult = (apt as any).result as string | null

    // Color logic: result takes priority over complete/incomplete
    const getColorClasses = () => {
      if (aptResult === 'admis') return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      if (aptResult === 'respins') return 'bg-orange-100 text-orange-800 border-orange-300'
      if (aptResult === 'neprezentare') return 'bg-gray-100 text-gray-500 border-gray-300'
      if (isComplete) return 'bg-green-50 text-green-800 border-green-200'
      return 'bg-red-50 text-red-800 border-red-200'
    }

    return (
      <button
        key={apt.id}
        draggable
        onDragStart={(e) => handleDragStart(e, apt)}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation()
          if (!isBeingDragged) onAppointmentClick(apt)
        }}
        className={cn(
          'absolute inset-x-0.5 top-0.5 bottom-0.5 rounded-md px-1.5 flex items-center justify-center gap-1',
          'text-xs font-medium truncate transition-all',
          'border cursor-grab active:cursor-grabbing',
          isBeingDragged && 'opacity-40',
          !isBeingDragged && 'hover:opacity-80',
          getColorClasses()
        )}
      >
        {aptResult === 'admis' && <span className="flex-shrink-0">✓</span>}
        {aptResult === 'respins' && <span className="flex-shrink-0">✗</span>}
        {apt.vehicle?.plate_number || apt.client?.phone || 'N/A'}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ═══ Day headers ═══ */}
      <div className="bg-white sticky top-0 z-10 border-b">
        {/* Day names row */}
        <div className="flex">
          <div className="w-[60px] flex-shrink-0 border-r" />
          {days.map((day, dayIdx) => (
            <div
              key={day.toISOString()}
              className={cn(
                'text-center py-2.5',
                isToday(day) && 'bg-primary/5',
                dayIdx < days.length - 1 && 'border-r',
              )}
              style={{
                flex: splitByEngineer ? engineers.length : 1,
              }}
            >
              <span
                className={cn(
                  'text-sm font-medium',
                  isToday(day) ? 'text-primary font-semibold' : 'text-gray-700'
                )}
              >
                {format(day, 'EEE d MMM', { locale: ro })}
              </span>
            </div>
          ))}
        </div>

        {/* Engineer sub-headers (only if multiple engineers) */}
        {splitByEngineer && (
          <div className="flex border-t">
            <div className="w-[60px] flex-shrink-0 border-r" />
            {days.map((day, dayIdx) =>
              engineers.map((eng, engIdx) => {
                const isLastEngInDay = engIdx === engineers.length - 1
                const isLastDay = dayIdx === days.length - 1

                return (
                  <div
                    key={`${day.toISOString()}_${eng.id}`}
                    className={cn(
                      'flex-1 text-center py-1.5',
                      isToday(day) && 'bg-primary/5',
                      !isLastEngInDay && 'border-r border-gray-100',
                      isLastEngInDay && !isLastDay && 'border-r border-gray-300',
                    )}
                  >
                    <span className="text-[11px] text-muted-foreground font-medium truncate block px-1">
                      {eng.name.split(' ')[0]}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ═══ Time grid ═══ */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time labels */}
          <div className="w-[60px] flex-shrink-0">
            {TIME_SLOTS.map((time) => (
              <div
                key={time}
                className="h-[42px] flex items-center justify-end pr-2 border-r border-b"
              >
                <span className="text-[11px] text-muted-foreground font-medium">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {/* Day + engineer columns */}
          {days.map((day, dayIdx) => {
            const dayOfWeek = getDay(day) // 0=Sun, 1=Mon, ..., 6=Sat
            const isSat = dayOfWeek === 6
            const dateStr = format(day, 'yyyy-MM-dd')
            const isLastDay = dayIdx === days.length - 1

            if (splitByEngineer) {
              // ── Multiple engineers: sub-columns ─────────────────
              return engineers.map((eng, engIdx) => {
                const isLastEngInDay = engIdx === engineers.length - 1

                return (
                  <div
                    key={`${dateStr}_${eng.id}`}
                    className={cn(
                      'flex-1 min-w-0',
                      !isLastEngInDay && 'border-r border-gray-100',
                      isLastEngInDay && !isLastDay && 'border-r border-gray-300',
                    )}
                  >
                    {TIME_SLOTS.map((time) => {
                      const slotKey = `${dateStr}_${time}_${eng.id}`
                      const apt = appointmentMap[slotKey]
                      // Check if blocked: Saturday after 14:00, engineer not working, or blocked interval
                      const isSatNonWorking = isSat && time >= SATURDAY_END
                      const isEngBlocked = isSlotBlocked(eng.id, dateStr, dayOfWeek, time)
                      const isNonWorking = isSatNonWorking || isEngBlocked
                      const hasAppointment = !!apt
                      const isDropHover = dropTarget === slotKey && !isNonWorking
                      const isDragging = !!draggedAptId

                      return (
                        <div
                          key={time}
                          className={cn(
                            'h-[42px] border-b relative transition-colors',
                            isToday(day) && !isNonWorking && 'bg-blue-50/30',
                            isNonWorking && 'calendar-stripe',
                            !isNonWorking && !hasAppointment && !isDragging && 'cursor-pointer hover:bg-blue-50/40',
                            isDropHover && !hasAppointment && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
                            isDropHover && hasAppointment && 'bg-amber-50 ring-1 ring-inset ring-amber-300',
                          )}
                          onClick={() => {
                            if (!isNonWorking && !hasAppointment && !isDragging) {
                              onSlotClick(day, time, eng.id)
                            }
                          }}
                          onDragOver={(e) => handleDragOver(e, slotKey, isNonWorking)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dateStr, time, isNonWorking)}
                        >
                          {apt && renderAppointment(apt)}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            } else {
              // ── Single engineer: one column per day ─────────────
              const singleEng = engineers[0]

              return (
                <div
                  key={dateStr}
                  className={cn('flex-1 min-w-0', !isLastDay && 'border-r')}
                >
                  {TIME_SLOTS.map((time) => {
                    const slotKey = `${dateStr}_${time}`
                    const slotAppointments = appointmentsByDayTime[slotKey] || []
                    const isSatNonWorking = isSat && time >= SATURDAY_END
                    const isEngBlocked = singleEng
                      ? isSlotBlocked(singleEng.id, dateStr, dayOfWeek, time)
                      : false
                    const isNonWorking = isSatNonWorking || isEngBlocked
                    const hasAppointment = slotAppointments.length > 0
                    const isDropHover = dropTarget === slotKey && !isNonWorking
                    const isDragging = !!draggedAptId

                    return (
                      <div
                        key={time}
                        className={cn(
                          'h-[42px] border-b relative transition-colors',
                          isToday(day) && !isNonWorking && 'bg-blue-50/30',
                          isNonWorking && 'calendar-stripe',
                          !isNonWorking && !hasAppointment && !isDragging && 'cursor-pointer hover:bg-blue-50/40',
                          isDropHover && !hasAppointment && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
                          isDropHover && hasAppointment && 'bg-amber-50 ring-1 ring-inset ring-amber-300',
                        )}
                        onClick={() => {
                          if (!isNonWorking && !hasAppointment && !isDragging) {
                            onSlotClick(day, time, singleEng?.id)
                          }
                        }}
                        onDragOver={(e) => handleDragOver(e, slotKey, isNonWorking)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dateStr, time, isNonWorking)}
                      >
                        {slotAppointments.map((apt) => renderAppointment(apt))}
                      </div>
                    )
                  })}
                </div>
              )
            }
          })}
        </div>
      </div>
    </div>
  )
}
