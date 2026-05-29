'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  CalendarIcon,
  UserRound,
  Clock,
  CalendarX2,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Staff, EngineerWorkingHours, EngineerBlockedInterval } from '@/types/database'

const DAY_LABELS: Record<number, string> = {
  1: 'Luni',
  2: 'Marti',
  3: 'Miercuri',
  4: 'Joi',
  5: 'Vineri',
  6: 'Sambata',
}

// Generate time options from 06:00 to 22:00 in 30-min steps
const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`)
  if (h < 22) TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:30`)
}

type EngineerData = Staff & {
  working_hours: EngineerWorkingHours[]
  blocked_intervals: EngineerBlockedInterval[]
}

export function EngineersTab() {
  const { staff } = useAuth()
  const supabase = createClient()
  const [engineers, setEngineers] = useState<EngineerData[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const loadEngineers = useCallback(async () => {
    if (!staff) return

    // Load all engineers/admins from this station
    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('station_id', staff.station_id)
      .in('role', ['admin', 'engineer'])
      .order('name')

    if (!staffData) return

    // Load working hours and blocked intervals for all engineers
    const engineerIds = staffData.map((s: Staff) => s.id)

    const [{ data: whData }, { data: biData }] = await Promise.all([
      supabase
        .from('engineer_working_hours')
        .select('*')
        .in('engineer_id', engineerIds)
        .order('day_of_week'),
      supabase
        .from('engineer_blocked_intervals')
        .select('*')
        .in('engineer_id', engineerIds)
        .order('blocked_date'),
    ])

    const enriched: EngineerData[] = staffData.map((eng: Staff) => ({
      ...eng,
      working_hours: (whData || []).filter((wh: EngineerWorkingHours) => wh.engineer_id === eng.id),
      blocked_intervals: (biData || []).filter((bi: EngineerBlockedInterval) => bi.engineer_id === eng.id),
    }))

    setEngineers(enriched)
    setLoading(false)
  }, [staff])

  useEffect(() => {
    loadEngineers()
  }, [loadEngineers])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Se incarca...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserRound size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-primary">Ingineri</h2>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="gap-2">
          <Plus size={16} />
          Adauga inginer
        </Button>
      </div>

      {engineers.map((engineer) => (
        <EngineerCard
          key={engineer.id}
          engineer={engineer}
          stationId={staff!.station_id}
          currentUserId={staff!.user_id}
          onUpdate={loadEngineers}
        />
      ))}

      {engineers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl">
          Nu aveti ingineri adaugati. Apasati butonul „Adauga inginer" pentru a adauga.
        </div>
      )}

      {/* Add Engineer Modal */}
      <AddEngineerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false)
          loadEngineers()
        }}
      />
    </div>
  )
}

// ── Add Engineer Modal ────────────────────────────────────────────

function AddEngineerModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'engineer' | 'admin'>('engineer')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setPassword('')
      setRole('engineer')
      setError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Introduceti numele')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Introduceti un email valid')
      return
    }
    if (!password || password.length < 6) {
      setError('Parola trebuie sa aiba minim 6 caractere')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/engineers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Eroare la crearea inginerului')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound size={18} />
            Adauga inginer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nume complet</Label>
            <Input
              placeholder="Ion Popescu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              placeholder="inginer@itpmanager.ro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Parola</Label>
            <Input
              type="password"
              placeholder="Minim 6 caractere"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'engineer' | 'admin')}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engineer">Inginer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Anuleaza
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Se creeaza...' : 'Creeaza inginer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Engineer Card ─────────────────────────────────────────────────

function EngineerCard({
  engineer,
  stationId,
  currentUserId,
  onUpdate,
}: {
  engineer: EngineerData
  stationId: string
  currentUserId: string
  onUpdate: () => void
}) {
  const supabase = createClient()
  const [blockedModalOpen, setBlockedModalOpen] = useState(false)
  const [editingBlocked, setEditingBlocked] = useState<EngineerBlockedInterval | null>(null)
  const isSelf = engineer.user_id === currentUserId

  // Toggle accepts_online
  const toggleOnline = async (value: boolean) => {
    await supabase
      .from('staff')
      .update({ accepts_online: value })
      .eq('id', engineer.id)
    onUpdate()
  }

  // Toggle is_active
  const toggleActive = async (value: boolean) => {
    await supabase
      .from('staff')
      .update({ is_active: value })
      .eq('id', engineer.id)
    onUpdate()
  }

  // Toggle day working status
  const toggleDay = async (dayOfWeek: number, isWorking: boolean) => {
    const existing = engineer.working_hours.find((wh) => wh.day_of_week === dayOfWeek)

    if (existing) {
      await supabase
        .from('engineer_working_hours')
        .update({ is_working: isWorking })
        .eq('id', existing.id)
    } else {
      await supabase.from('engineer_working_hours').insert({
        engineer_id: engineer.id,
        station_id: stationId,
        day_of_week: dayOfWeek,
        is_working: isWorking,
        start_time: '08:30',
        end_time: '20:00',
      })
    }
    onUpdate()
  }

  // Update time for a day
  const updateTime = async (
    dayOfWeek: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    const existing = engineer.working_hours.find((wh) => wh.day_of_week === dayOfWeek)

    if (existing) {
      await supabase
        .from('engineer_working_hours')
        .update({ [field]: value + ':00' })
        .eq('id', existing.id)
    } else {
      await supabase.from('engineer_working_hours').insert({
        engineer_id: engineer.id,
        station_id: stationId,
        day_of_week: dayOfWeek,
        [field]: value + ':00',
        is_working: true,
      })
    }
    onUpdate()
  }

  // Delete blocked interval
  const deleteBlocked = async (id: string) => {
    await supabase.from('engineer_blocked_intervals').delete().eq('id', id)
    onUpdate()
  }

  // Delete engineer completely (via API — removes auth user too)
  const deleteEngineer = async () => {
    if (isSelf) return
    if (!confirm(`Sigur doriti sa stergeti inginerul ${engineer.name}? Aceasta actiune este ireversibila.`)) return

    try {
      const res = await fetch(`/api/engineers?id=${engineer.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Eroare la stergere')
        return
      }
      onUpdate()
    } catch {
      alert('Eroare la stergerea inginerului')
    }
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50">
        <div className="flex items-center gap-3">
          <UserRound size={18} className="text-muted-foreground" />
          <span className="font-semibold text-foreground">{engineer.name}</span>
          <div className="flex items-center gap-2 ml-3">
            <Switch
              checked={engineer.accepts_online ?? true}
              onCheckedChange={toggleOnline}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-sm text-muted-foreground">Programari online</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={engineer.is_active}
              onCheckedChange={toggleActive}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-sm text-muted-foreground">Activ</span>
          </div>
          {!isSelf && (
            <button
              onClick={deleteEngineer}
              className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
              title="Sterge inginer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-[1fr_1fr] divide-x">
        {/* Program (Working Hours) */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Program</span>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((day) => {
              const wh = engineer.working_hours.find((w) => w.day_of_week === day)
              const isWorking = wh ? wh.is_working : false
              const startTime = wh?.start_time?.substring(0, 5) || '08:30'
              const endTime = wh?.end_time?.substring(0, 5) || '20:00'

              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm w-20 text-foreground">{DAY_LABELS[day]}</span>
                  <Switch
                    checked={isWorking}
                    onCheckedChange={(v) => toggleDay(day, v)}
                    className="data-[state=checked]:bg-primary"
                  />
                  {isWorking ? (
                    <div className="flex items-center gap-2">
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
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Inchis</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Blocked Intervals */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarX2 size={15} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Intervale blocate</span>
          </div>

          <div className="space-y-2">
            {engineer.blocked_intervals.map((bi) => (
              <div
                key={bi.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg border bg-gray-50/50"
              >
                <div className="flex items-center gap-2">
                  <CalendarX2 size={14} className="text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(bi.blocked_date + 'T00:00:00'), 'd MMM yyyy', { locale: ro })}
                  </span>
                  {bi.start_time && bi.end_time && (
                    <span className="text-xs text-muted-foreground">
                      {bi.start_time.substring(0, 5)} - {bi.end_time.substring(0, 5)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingBlocked(bi)
                      setBlockedModalOpen(true)
                    }}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteBlocked(bi.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                setEditingBlocked(null)
                setBlockedModalOpen(true)
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
            >
              <span className="text-lg leading-none">+</span>
              <span>Interval blocat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Blocked Interval Modal */}
      <BlockedIntervalModal
        open={blockedModalOpen}
        onClose={() => {
          setBlockedModalOpen(false)
          setEditingBlocked(null)
        }}
        onSuccess={() => {
          setBlockedModalOpen(false)
          setEditingBlocked(null)
          onUpdate()
        }}
        engineerId={engineer.id}
        stationId={stationId}
        editInterval={editingBlocked}
      />
    </div>
  )
}

// ── Blocked Interval Modal ────────────────────────────────────────

function BlockedIntervalModal({
  open,
  onClose,
  onSuccess,
  engineerId,
  stationId,
  editInterval,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  engineerId: string
  stationId: string
  editInterval: EngineerBlockedInterval | null
}) {
  const supabase = createClient()
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [wholeDay, setWholeDay] = useState(true)
  const [startTime, setStartTime] = useState('08:30')
  const [endTime, setEndTime] = useState('20:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editInterval) {
        setDate(new Date(editInterval.blocked_date + 'T00:00:00'))
        if (editInterval.start_time && editInterval.end_time) {
          setWholeDay(false)
          setStartTime(editInterval.start_time.substring(0, 5))
          setEndTime(editInterval.end_time.substring(0, 5))
        } else {
          setWholeDay(true)
          setStartTime('08:30')
          setEndTime('20:00')
        }
      } else {
        setDate(undefined)
        setWholeDay(true)
        setStartTime('08:30')
        setEndTime('20:00')
      }
    }
  }, [open, editInterval])

  const handleSave = async () => {
    if (!date) return

    setSaving(true)

    const payload = {
      engineer_id: engineerId,
      station_id: stationId,
      blocked_date: format(date, 'yyyy-MM-dd'),
      start_time: wholeDay ? null : startTime + ':00',
      end_time: wholeDay ? null : endTime + ':00',
    }

    if (editInterval) {
      await supabase
        .from('engineer_blocked_intervals')
        .update(payload)
        .eq('id', editInterval.id)
    } else {
      await supabase.from('engineer_blocked_intervals').insert(payload)
    }

    setSaving(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {editInterval ? 'Editeaza interval blocat' : 'Adauga interval blocat'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full h-10 justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'd MMM yyyy', { locale: ro }) : 'Alege data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ro}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={wholeDay} onCheckedChange={setWholeDay} />
            <span className="text-sm">Toata ziua</span>
          </div>

          {!wholeDay && (
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">De la</label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Pana la</label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Anuleaza
          </Button>
          <Button onClick={handleSave} disabled={saving || !date}>
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
