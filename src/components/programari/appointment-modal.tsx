'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, AlertTriangle, Trash2 } from 'lucide-react'
import { format, isBefore, startOfDay, parseISO } from 'date-fns'
import { ro } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Client, Vehicle, AppointmentWithDetails } from '@/types/database'

const TIME_OPTIONS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30',
]

const CATEGORIES = [
  'A', 'B', 'C', 'D', 'BE', 'CE', 'DE',
  'M1', 'M2', 'M3', 'N1', 'N2', 'N3',
  'O1', 'O2', 'O3', 'O4', 'L1e', 'L2e', 'L3e',
]

const FUEL_TYPES = [
  'Benzina', 'Motorina', 'GPL', 'Electric', 'Hybrid', 'Hidrogen',
]

const BRANDS = [
  'Audi', 'BMW', 'Citroën', 'Dacia', 'Fiat', 'Ford', 'Honda',
  'Hyundai', 'Kia', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Opel',
  'Peugeot', 'Renault', 'Seat', 'Škoda', 'Toyota', 'Volkswagen',
  'Volvo', 'Alta marca',
]

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** When set, the modal opens in edit mode with all fields pre-filled */
  editAppointment?: AppointmentWithDetails | null
  /** Pre-fill date when clicking on an empty calendar slot */
  prefillDate?: Date
  /** Pre-fill time when clicking on an empty calendar slot */
  prefillTime?: string
  /** Pre-fill engineer when clicking on a specific engineer's slot */
  prefillEngineerId?: string
}

export function AppointmentModal({
  open,
  onClose,
  onSuccess,
  editAppointment,
  prefillDate,
  prefillTime,
  prefillEngineerId,
}: Props) {
  const { staff, engineers, station } = useAuth()
  const supabase = createClient()
  const isEditMode = !!editAppointment

  // Client fields
  const [phone, setPhone] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientInfo, setClientInfo] = useState('')
  const [sendSms, setSendSms] = useState(true)
  const [existingClient, setExistingClient] = useState<Client | null>(null)
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Vehicle fields
  const [plateNumber, setPlateNumber] = useState('')
  const [vin, setVin] = useState('')
  const [civ, setCiv] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [existingVehicles, setExistingVehicles] = useState<Vehicle[]>([])
  const [vehicleSuggestions, setVehicleSuggestions] = useState<Vehicle[]>([])
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

  // Appointment fields
  const [engineerId, setEngineerId] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState('')

  // Rezultat inspectie
  const [result, setResult] = useState<'admis' | 'respins' | 'neprezentare' | ''>('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [itpDurationYears, setItpDurationYears] = useState<number>(2)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when modal opens
  useEffect(() => {
    if (!open) return

    setError(null)
    setSaving(false)
    setDeleting(false)
    setClientSuggestions([])
    setShowSuggestions(false)
    setVehicleSuggestions([])
    setShowVehicleSuggestions(false)

    if (editAppointment) {
      // EDIT MODE — pre-fill everything from the appointment
      const apt = editAppointment
      // Client
      setPhone(apt.client?.phone || '')
      setClientName(apt.client?.name || '')
      setClientInfo(apt.client?.info || '')
      setSendSms(apt.send_sms)
      setExistingClient(apt.client || null)
      // Vehicle
      setPlateNumber(apt.vehicle?.plate_number || '')
      setVin(apt.vehicle?.vin || '')
      setCiv((apt.vehicle as any)?.civ || '')
      setCategory(apt.vehicle?.category || '')
      setBrand(apt.vehicle?.brand || '')
      setManufactureYear(apt.vehicle?.manufacture_year?.toString() || '')
      setFuelType(apt.vehicle?.fuel_type || '')
      setSelectedVehicleId(apt.vehicle?.id || null)
      setExistingVehicles([])
      // Load client vehicles for edit mode too
      if (apt.client?.id) {
        supabase
          .from('vehicles')
          .select('*')
          .eq('client_id', apt.client.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setExistingVehicles(data as Vehicle[])
          })
      }
      // Appointment
      setEngineerId(apt.engineer_id)
      setDate(parseISO(apt.date))
      setTime(apt.time.substring(0, 5))
      // Rezultat inspectie
      setResult((apt as any).result || '')
      setRejectionReason((apt as any).rejection_reason || '')
      setItpDurationYears((apt as any).itp_duration_years || 2)
    } else {
      // ADD MODE — reset everything
      setPhone('')
      setClientName('')
      setClientInfo('')
      setSendSms(true)
      setExistingClient(null)
      setPlateNumber('')
      setVin('')
      setCiv('')
      setCategory('')
      setBrand('')
      setManufactureYear('')
      setFuelType('')
      setSelectedVehicleId(null)
      setExistingVehicles([])
      setEngineerId(prefillEngineerId || staff?.id || '')
      // Pre-fill date/time from slot click
      setDate(prefillDate || undefined)
      setTime(prefillTime || '')
      // Reset rezultat
      setResult('')
      setRejectionReason('')
      setItpDurationYears(2)
    }
  }, [open, editAppointment, prefillDate, prefillTime, prefillEngineerId, staff])

  // Phone autocomplete - search after 4 digits
  const searchClients = useCallback(async (phoneInput: string) => {
    if (!staff || phoneInput.length < 4) {
      setClientSuggestions([])
      setShowSuggestions(false)
      return
    }

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('station_id', staff.station_id)
      .like('phone', `${phoneInput}%`)
      .limit(5)

    if (data && data.length > 0) {
      setClientSuggestions(data)
      setShowSuggestions(true)
    } else {
      setClientSuggestions([])
      setShowSuggestions(false)
    }
  }, [staff])

  // Format phone display: 0744 123 456
  const formatPhone = (digits: string) => {
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10)
    setPhone(cleaned)
    setExistingClient(null)

    if (cleaned.length >= 4) {
      searchClients(cleaned)
    } else {
      setClientSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectClient = async (client: Client) => {
    setExistingClient(client)
    setPhone(client.phone)
    setClientName(client.name || '')
    setClientInfo(client.info || '')
    setShowSuggestions(false)

    // Load client's vehicles
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    if (vehicles && vehicles.length > 0) {
      setExistingVehicles(vehicles)
      const v = vehicles[0] as any
      setPlateNumber(v.plate_number)
      setVin(v.vin || '')
      setCiv(v.civ || '')
      setCategory(v.category || '')
      setBrand(v.brand || '')
      setManufactureYear(v.manufacture_year?.toString() || '')
      setFuelType(v.fuel_type || '')
    }
  }

  const selectVehicle = (vehicle: Vehicle) => {
    setPlateNumber(vehicle.plate_number)
    setVin(vehicle.vin || '')
    setCiv((vehicle as any).civ || '')
    setCategory(vehicle.category || '')
    setBrand(vehicle.brand || '')
    setManufactureYear(vehicle.manufacture_year?.toString() || '')
    setFuelType(vehicle.fuel_type || '')
    setSelectedVehicleId(vehicle.id)
    setShowVehicleSuggestions(false)
  }

  // Plate number autocomplete — search client vehicles + station vehicles
  const handlePlateChange = useCallback(async (value: string) => {
    const upper = value.toUpperCase()
    setPlateNumber(upper)
    setSelectedVehicleId(null)

    if (upper.length < 2) {
      setVehicleSuggestions([])
      setShowVehicleSuggestions(false)
      return
    }

    // First search within client's existing vehicles
    let suggestions: Vehicle[] = []
    if (existingVehicles.length > 0) {
      suggestions = existingVehicles.filter((v) =>
        v.plate_number.toUpperCase().includes(upper)
      )
    }

    // Also search in station vehicles (to find vehicles from any client)
    if (staff) {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('station_id', staff.station_id)
        .ilike('plate_number', `%${upper}%`)
        .limit(8)

      if (data) {
        // Merge, avoiding duplicates
        const existingIds = new Set(suggestions.map((v) => v.id))
        for (const v of data as Vehicle[]) {
          if (!existingIds.has(v.id)) suggestions.push(v)
        }
      }
    }

    if (suggestions.length > 0) {
      setVehicleSuggestions(suggestions)
      setShowVehicleSuggestions(true)
    } else {
      setVehicleSuggestions([])
      setShowVehicleSuggestions(false)
    }

    // Auto-select if exact match
    const exactMatch = suggestions.find((v) => v.plate_number.toUpperCase() === upper)
    if (exactMatch) {
      setVin(exactMatch.vin || '')
      setCiv((exactMatch as any).civ || '')
      setCategory(exactMatch.category || '')
      setBrand(exactMatch.brand || '')
      setManufactureYear(exactMatch.manufacture_year?.toString() || '')
      setFuelType(exactMatch.fuel_type || '')
      setSelectedVehicleId(exactMatch.id)
    }
  }, [existingVehicles, staff])

  const isPastDate = date ? isBefore(date, startOfDay(new Date())) : false

  // ── SAVE (create or update) ──────────────────────────────────────
  // ── WhatsApp message (automatic via Cloud API) ──────────────────
  // msgType: 'programare' | 'reprogramare'
  const sendWhatsAppMessage = async (
    msgType: 'programare' | 'reprogramare',
    appointmentDate: Date,
    appointmentTime: string,
  ) => {
    if (!staff || !phone) return

    try {
      // Load all SMS settings
      const { data: settings } = await supabase
        .from('station_settings')
        .select('*')
        .eq('station_id', staff.station_id)
        .in('key', [
          `sms_${msgType}_enabled`,
          `sms_${msgType}_template`,
          `sms_${msgType}_meta_template`,
          'whatsapp_template_lang',
        ])

      if (!settings) return

      const settingsMap = Object.fromEntries(
        (settings as Array<{ key: string; value: string }>).map((s) => [s.key, s.value])
      )

      // Check if this message type is enabled
      if (settingsMap[`sms_${msgType}_enabled`] === 'false') return

      const metaTemplateName = settingsMap[`sms_${msgType}_meta_template`] || ''
      const templateLang = settingsMap.whatsapp_template_lang || 'ro'
      const formattedDate = format(appointmentDate, 'd MMM yyyy', { locale: ro })

      if (metaTemplateName) {
        // Send via META TEMPLATE
        const templateParams = [
          station?.name || 'ITP Manager',
          formattedDate,
          appointmentTime,
          plateNumber.toUpperCase(),
        ]

        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            templateName: metaTemplateName,
            templateParams,
            language: templateLang,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          console.warn(`[WhatsApp] ${msgType} template send failed:`, err?.error || err)
        } else {
          console.log(`[WhatsApp] ${msgType} template message sent`)
        }
      } else {
        // Send via TEXT message (fallback)
        const textTemplate =
          settingsMap[`sms_${msgType}_template`] ||
          'Programare ITP Manager pentru {numar} pe data de {data} la ora {ora}. Va asteptam la {statie}.'

        const message = textTemplate
          .replace('{data}', formattedDate)
          .replace('{ora}', appointmentTime)
          .replace('{numar}', plateNumber.toUpperCase())
          .replace('{statie}', station?.name || '')
          .replace('{adresa}', station?.address || '')
          .replace('{client}', clientName || '')
          .replace('{telefon}', phone)
          .replace('{marca}', brand || '')
          .replace('{vin}', vin || '')

        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message }),
        })

        if (!res.ok) {
          const err = await res.json()
          console.warn(`[WhatsApp] ${msgType} text send failed:`, err?.error || err)
        } else {
          console.log(`[WhatsApp] ${msgType} text message sent`)
        }
      }
    } catch (err) {
      // WhatsApp failure should never block the appointment save
      console.warn('[WhatsApp] Error (non-blocking):', err)
    }
  }

  const handleSubmit = async () => {
    if (!staff) return

    // Validation — only phone and plate number are mandatory
    if (!phone || phone.length < 4) {
      setError('Introduceti un numar de telefon valid')
      return
    }
    if (!plateNumber) {
      setError('Introduceti numarul de inmatriculare')
      return
    }
    if (!date || !time) {
      setError('Selectati data si ora')
      return
    }
    // Engineer defaults to current user if not selected
    const selectedEngineerId = engineerId || staff.id

    setSaving(true)
    setError(null)

    try {
      // 1. Create or get client
      let clientId = existingClient?.id
      if (!clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            station_id: staff.station_id,
            phone,
            name: clientName || null,
            info: clientInfo || null,
          })
          .select()
          .single()

        if (clientError) {
          if (clientError.code === '23505') {
            const { data: existing } = await supabase
              .from('clients')
              .select('*')
              .eq('station_id', staff.station_id)
              .eq('phone', phone)
              .single()
            if (existing) {
              clientId = existing.id
              if (clientName || clientInfo) {
                await supabase
                  .from('clients')
                  .update({
                    name: clientName || existing.name,
                    info: clientInfo || existing.info,
                  })
                  .eq('id', clientId)
              }
            }
          } else {
            throw clientError
          }
        } else {
          clientId = newClient.id
        }
      } else {
        // Update existing client
        await supabase
          .from('clients')
          .update({
            name: clientName || existingClient?.name || null,
            info: clientInfo || existingClient?.info || null,
          })
          .eq('id', clientId!)
      }

      // 2. Create or get vehicle
      let vehicleId: string | undefined

      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('*')
        .eq('station_id', staff.station_id)
        .eq('plate_number', plateNumber.toUpperCase())
        .single()

      if (existingVehicle) {
        vehicleId = existingVehicle.id
        const { error: updVehErr } = await supabase
          .from('vehicles')
          .update({
            vin: vin || existingVehicle.vin,
            civ: civ || (existingVehicle as any).civ,
            category: category || existingVehicle.category,
            brand: brand || existingVehicle.brand,
            manufacture_year: manufactureYear ? parseInt(manufactureYear) : existingVehicle.manufacture_year,
            fuel_type: fuelType || existingVehicle.fuel_type,
            client_id: clientId,
          })
          .eq('id', vehicleId)

        if (updVehErr) {
          if (updVehErr.code === '23505' && updVehErr.message?.includes('vin')) {
            throw new Error('Aceasta serie de sasiu (VIN) exista deja pentru un alt vehicul')
          }
          throw updVehErr
        }
      } else {
        const { data: newVehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .insert({
            client_id: clientId!,
            station_id: staff.station_id,
            plate_number: plateNumber.toUpperCase(),
            vin: vin || null,
            civ: civ || null,
            category: category || null,
            brand: brand || null,
            manufacture_year: manufactureYear ? parseInt(manufactureYear) : null,
            fuel_type: fuelType || null,
          })
          .select()
          .single()

        if (vehicleError) {
          if (vehicleError.code === '23505' && vehicleError.message?.includes('vin')) {
            throw new Error('Aceasta serie de sasiu (VIN) exista deja pentru un alt vehicul')
          }
          throw vehicleError
        }
        vehicleId = newVehicle.id
      }

      // 3. Create or UPDATE appointment
      if (isEditMode && editAppointment) {
        // Detect if date or time changed (= reprogramare)
        const oldDate = editAppointment.date
        const oldTime = editAppointment.time.substring(0, 5)
        const newDate = format(date, 'yyyy-MM-dd')
        const newTime = time
        const isRescheduled = oldDate !== newDate || oldTime !== newTime

        // UPDATE existing appointment
        const updateData: Record<string, any> = {
          client_id: clientId!,
          vehicle_id: vehicleId!,
          engineer_id: selectedEngineerId,
          date: newDate,
          time: newTime + ':00',
          send_sms: isPastDate ? false : sendSms,
        }

        // Result fields
        if (result) {
          updateData.result = result
          updateData.itp_duration_years = result === 'admis' ? itpDurationYears : null
          updateData.rejection_reason = result === 'respins' ? rejectionReason : null

          // Auto-set status based on result
          if (result === 'admis' || result === 'respins') {
            updateData.status = 'completed'
          } else if (result === 'neprezentare') {
            updateData.status = 'no_show'
          }

          // If admis → update vehicle itp_expiry_date
          if (result === 'admis' && vehicleId) {
            const inspDate = parseISO(newDate)
            const expiryDate = new Date(inspDate)
            expiryDate.setFullYear(expiryDate.getFullYear() + itpDurationYears)
            await supabase
              .from('vehicles')
              .update({ itp_expiry_date: format(expiryDate, 'yyyy-MM-dd') })
              .eq('id', vehicleId)
          }
        }

        const { error: aptError } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', editAppointment.id)

        if (aptError) throw aptError

        // Send REPROGRAMARE WhatsApp message if date/time changed
        if (isRescheduled && sendSms && !isPastDate && date) {
          await sendWhatsAppMessage('reprogramare', date, time)
        }
      } else {
        // INSERT new appointment
        const { error: aptError } = await supabase
          .from('appointments')
          .insert({
            station_id: staff.station_id,
            client_id: clientId!,
            vehicle_id: vehicleId!,
            engineer_id: selectedEngineerId,
            date: format(date, 'yyyy-MM-dd'),
            time: time + ':00',
            type: 'staff',
            status: 'scheduled',
            send_sms: isPastDate ? false : sendSms,
          })

        if (aptError) throw aptError

        // Send PROGRAMARE WhatsApp message for new appointments
        if (sendSms && !isPastDate && date) {
          await sendWhatsAppMessage('programare', date, time)
        }
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'A aparut o eroare')
    } finally {
      setSaving(false)
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editAppointment) return
    if (!confirm('Sigur doriti sa stergeti aceasta programare?')) return

    setDeleting(true)
    setError(null)

    try {
      const { error: delError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', editAppointment.id)

      if (delError) throw delError
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'A aparut o eroare la stergere')
    } finally {
      setDeleting(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 40 }, (_, i) => currentYear - i)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-[960px] p-0 gap-0 overflow-hidden"
        onClick={() => {
          setShowSuggestions(false)
          setShowVehicleSuggestions(false)
        }}
      >
        <DialogHeader className="px-8 py-5 border-b">
          <DialogTitle className="text-center text-lg font-semibold">
            {isEditMode ? 'Editeaza programare' : 'Adauga programare'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_1fr_1fr] divide-x min-h-[420px]">
          {/* Client Section */}
          <div className="px-6 py-5 space-y-5">
            <h3 className="text-sm font-semibold text-primary text-center">Client</h3>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telefon</Label>
              <div className="relative">
                <Input
                  placeholder="07XX XXX XXX"
                  value={formatPhone(phone)}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="h-10"
                  maxLength={12}
                />
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-[200px] overflow-auto">
                    {clientSuggestions.map((client) => (
                      <button
                        key={client.id}
                        className="w-full px-3 py-2.5 text-left hover:bg-gray-50 text-sm border-b last:border-b-0"
                        onClick={() => selectClient(client)}
                      >
                        <div className="font-medium">{formatPhone(client.phone)}</div>
                        {client.name && (
                          <div className="text-xs text-muted-foreground">
                            {client.name}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Informare client</Label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm whitespace-nowrap">Trimite sms confirmare</span>
                <Switch
                  checked={isPastDate ? false : sendSms}
                  onCheckedChange={setSendSms}
                  disabled={isPastDate}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nume</Label>
              <Input
                placeholder="Introduceti numele"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Info</Label>
              <Input
                placeholder="Informatii aditionale"
                value={clientInfo}
                onChange={(e) => setClientInfo(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          {/* Vehicle Section */}
          <div className="px-6 py-5 space-y-5">
            <h3 className="text-sm font-semibold text-primary text-center">Vehicul</h3>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Numar</Label>
              <div className="relative">
                <Input
                  placeholder="ex: TM01TIM"
                  value={plateNumber}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  onFocus={() => {
                    if (vehicleSuggestions.length > 0) setShowVehicleSuggestions(true)
                  }}
                  className="h-10 uppercase"
                />
                {showVehicleSuggestions && vehicleSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-[200px] overflow-auto">
                    {vehicleSuggestions.map((v) => (
                      <button
                        key={v.id}
                        className={cn(
                          'w-full px-3 py-2.5 text-left hover:bg-gray-50 text-sm border-b last:border-b-0',
                          selectedVehicleId === v.id && 'bg-primary/5'
                        )}
                        onClick={() => selectVehicle(v)}
                      >
                        <div className="font-medium">{v.plate_number}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {v.brand && <span>{v.brand}</span>}
                          {v.manufacture_year && <span>· {v.manufacture_year}</span>}
                          {v.vin && <span>· VIN: {v.vin.substring(0, 8)}...</span>}
                          {!v.brand && !v.vin && <span>Fara detalii</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Serie sasiu</Label>
              <div className="relative">
                <Input
                  placeholder="INTRODUCETI SERIE SASIU"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  className="h-10 uppercase pr-14"
                  maxLength={17}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                  {vin.length}/17
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Seria C.I.V.</Label>
              <Input
                placeholder="C-123456"
                value={civ}
                onChange={(e) => setCiv(e.target.value.toUpperCase())}
                className="h-10 uppercase"
                maxLength={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecteaza" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Marca</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecteaza" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">An fabricatie</Label>
                <Select value={manufactureYear} onValueChange={setManufactureYear}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecteaza" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Combustibil</Label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecteaza" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Appointment Section */}
          <div className="px-6 py-5 space-y-5">
            <h3 className="text-sm font-semibold text-primary text-center">Programare</h3>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Inginer</Label>
              <Select value={engineerId} onValueChange={setEngineerId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecteaza inginer" />
                </SelectTrigger>
                <SelectContent>
                  {engineers.map((eng) => (
                    <SelectItem key={eng.id} value={eng.id}>
                      <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {eng.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data</Label>
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

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ora</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Alege ora" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Programare</Label>
              <div className="h-10 flex items-center px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium">
                Staff
              </div>
            </div>

            {/* ── Rezultat inspectie (only in edit mode) ── */}
            {isEditMode && (
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rezultat inspectie</h4>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rezultat</Label>
                  <Select value={result} onValueChange={(v) => setResult(v as any)}>
                    <SelectTrigger className={cn(
                      'h-10',
                      result === 'admis' && 'border-green-400 bg-green-50 text-green-700',
                      result === 'respins' && 'border-red-400 bg-red-50 text-red-700',
                      result === 'neprezentare' && 'border-yellow-400 bg-yellow-50 text-yellow-700',
                    )}>
                      <SelectValue placeholder="Selecteaza rezultat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admis">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Admis
                        </span>
                      </SelectItem>
                      <SelectItem value="respins">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Respins
                        </span>
                      </SelectItem>
                      <SelectItem value="neprezentare">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          Nu s-a prezentat
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {result === 'admis' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valabilitate ITP</Label>
                    <Select value={itpDurationYears.toString()} onValueChange={(v) => setItpDurationYears(parseInt(v))}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 an</SelectItem>
                        <SelectItem value="2">2 ani</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      ITP va expira pe {date ? format(new Date(date.getFullYear() + itpDurationYears, date.getMonth(), date.getDate()), 'd MMM yyyy', { locale: ro }) : '—'}
                    </p>
                  </div>
                )}

                {result === 'respins' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Motiv respingere</Label>
                    <textarea
                      placeholder="Descrieti motivul respingerii..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t bg-gray-50/50">
          <div className="flex items-center gap-3">
            {isPastDate && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Programare anterioara, fara notificare client
              </p>
            )}

            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5"
              >
                <Trash2 size={14} />
                {deleting ? 'Se sterge...' : 'Sterge'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <p className="text-sm text-destructive mr-2">{error}</p>
            )}
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || deleting}
              className="bg-primary hover:bg-primary/90"
            >
              {saving
                ? (isEditMode ? 'Se salveaza...' : 'Se creeaza...')
                : (isEditMode ? 'Salveaza modificarile' : 'Creeaza programare')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
