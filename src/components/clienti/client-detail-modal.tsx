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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Phone,
  Car,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Calendar,
  Info,
  Hash,
} from 'lucide-react'
import type { Client, Vehicle } from '@/types/database'

const CATEGORIES = [
  'A', 'B', 'C', 'D', 'BE', 'CE', 'DE',
  'M1', 'M2', 'M3', 'N1', 'N2', 'N3',
  'O1', 'O2', 'O3', 'O4', 'L1e', 'L2e', 'L3e',
]

const FUEL_TYPES = ['Benzina', 'Motorina', 'GPL', 'Electric', 'Hybrid', 'Hidrogen']

const BRANDS = [
  'Audi', 'BMW', 'Citroën', 'Dacia', 'Fiat', 'Ford', 'Honda',
  'Hyundai', 'Kia', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Opel',
  'Peugeot', 'Renault', 'Seat', 'Škoda', 'Toyota', 'Volkswagen',
  'Volvo', 'Alta marca',
]

type AppointmentSummary = {
  id: string
  date: string
  time: string
  status: string
  result: string | null
  rejection_reason: string | null
  itp_duration_years: number | null
  vehicle_id: string
  vehicle: { plate_number: string } | null
}

type Props = {
  open: boolean
  onClose: () => void
  client: Client | null
  onClientUpdated: () => void
}

export function ClientDetailModal({ open, onClose, client, onClientUpdated }: Props) {
  const { staff } = useAuth()
  const supabase = createClient()

  // Client edit state
  const [editingClient, setEditingClient] = useState(false)
  const [clientPhone, setClientPhone] = useState('')

  const formatPhone = (digits: string) => {
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }
  const [clientName, setClientName] = useState('')
  const [clientInfo, setClientInfo] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [addingVehicle, setAddingVehicle] = useState(false)

  // Vehicle form state
  const [vPlate, setVPlate] = useState('')
  const [vVin, setVVin] = useState('')
  const [vCiv, setVCiv] = useState('')
  const [vCategory, setVCategory] = useState('')
  const [vBrand, setVBrand] = useState('')
  const [vYear, setVYear] = useState('')
  const [vFuel, setVFuel] = useState('')
  const [savingVehicle, setSavingVehicle] = useState(false)

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([])

  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 40 }, (_, i) => currentYear - i)

  // Load data when modal opens
  const loadData = useCallback(async () => {
    if (!client || !staff) return

    setLoadingVehicles(true)
    setError(null)

    // Load vehicles
    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*')
      .eq('client_id', client.id)
      .eq('station_id', staff.station_id)
      .order('created_at', { ascending: false })

    setVehicles((vehiclesData as Vehicle[]) || [])

    // Load recent appointments
    const { data: aptData } = await supabase
      .from('appointments')
      .select('id, date, time, status, result, rejection_reason, itp_duration_years, vehicle_id, vehicle:vehicles(plate_number)')
      .eq('client_id', client.id)
      .eq('station_id', staff.station_id)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(20)

    setAppointments((aptData as unknown as AppointmentSummary[]) || [])
    setLoadingVehicles(false)
  }, [client, staff])

  useEffect(() => {
    if (open && client) {
      setClientPhone(client.phone)
      setClientName(client.name || '')
      setClientInfo(client.info || '')
      setEditingClient(false)
      setEditingVehicleId(null)
      setAddingVehicle(false)
      loadData()
    }
  }, [open, client, loadData])

  // ── Client CRUD ────────────────────────────────────────────────
  const saveClient = async () => {
    if (!client) return
    setSavingClient(true)
    setError(null)

    try {
      const { error: err } = await supabase
        .from('clients')
        .update({
          phone: clientPhone,
          name: clientName || null,
          info: clientInfo || null,
        })
        .eq('id', client.id)

      if (err) {
        if (err.code === '23505') {
          setError('Acest numar de telefon exista deja pentru un alt client')
          setSavingClient(false)
          return
        }
        throw err
      }
      setEditingClient(false)
      onClientUpdated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingClient(false)
    }
  }

  const deleteClient = async () => {
    if (!client) return
    if (!confirm(`Sigur doriti sa stergeti clientul ${client.phone}? Se vor sterge si vehiculele si programarile asociate.`)) return

    try {
      const { error: err } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      if (err) throw err
      onClientUpdated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // ── Vehicle CRUD ───────────────────────────────────────────────
  const startEditVehicle = (v: Vehicle) => {
    setEditingVehicleId(v.id)
    setAddingVehicle(false)
    setVPlate(v.plate_number)
    setVVin(v.vin || '')
    setVCiv((v as any).civ || '')
    setVCategory(v.category || '')
    setVBrand(v.brand || '')
    setVYear(v.manufacture_year?.toString() || '')
    setVFuel(v.fuel_type || '')
  }

  const startAddVehicle = () => {
    setAddingVehicle(true)
    setEditingVehicleId(null)
    setVPlate('')
    setVVin('')
    setVCiv('')
    setVCategory('')
    setVBrand('')
    setVYear('')
    setVFuel('')
  }

  const cancelVehicleEdit = () => {
    setEditingVehicleId(null)
    setAddingVehicle(false)
  }

  const saveVehicle = async () => {
    if (!client || !staff) return
    if (!vPlate) {
      setError('Numarul de inmatriculare e obligatoriu')
      return
    }

    setSavingVehicle(true)
    setError(null)

    try {
      const vehicleData = {
        plate_number: vPlate.toUpperCase(),
        vin: vVin || null,
        civ: vCiv || null,
        category: vCategory || null,
        brand: vBrand || null,
        manufacture_year: vYear ? parseInt(vYear) : null,
        fuel_type: vFuel || null,
      }

      if (addingVehicle) {
        const { error: err } = await supabase
          .from('vehicles')
          .insert({
            ...vehicleData,
            client_id: client.id,
            station_id: staff.station_id,
          })

        if (err) {
          if (err.code === '23505' && err.message?.includes('vin')) {
            setError('Aceasta serie de sasiu (VIN) exista deja pentru un alt vehicul')
            setSavingVehicle(false)
            return
          }
          throw err
        }
      } else if (editingVehicleId) {
        const { error: err } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicleId)

        if (err) {
          if (err.code === '23505' && err.message?.includes('vin')) {
            setError('Aceasta serie de sasiu (VIN) exista deja pentru un alt vehicul')
            setSavingVehicle(false)
            return
          }
          throw err
        }
      }

      setEditingVehicleId(null)
      setAddingVehicle(false)
      await loadData()
      onClientUpdated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingVehicle(false)
    }
  }

  const deleteVehicle = async (vehicleId: string, plateNumber: string) => {
    if (!confirm(`Sigur doriti sa stergeti vehiculul ${plateNumber}?`)) return

    try {
      const { error: err } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)

      if (err) throw err
      await loadData()
      onClientUpdated()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Programat', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Finalizat', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Anulat', color: 'bg-red-100 text-red-700' },
    no_show: { label: 'Neprezent', color: 'bg-yellow-100 text-yellow-700' },
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[800px] p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b bg-primary/5">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <User size={18} />
            Detalii client
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* ── Client Info ──────────────────────────────────────── */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                Informatii client
              </h3>
              <div className="flex items-center gap-2">
                {editingClient ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingClient(false)
                        setClientPhone(client.phone)
                        setClientName(client.name || '')
                        setClientInfo(client.info || '')
                      }}
                      className="h-7 text-xs gap-1"
                    >
                      <X size={12} />
                      Anuleaza
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveClient}
                      disabled={savingClient}
                      className="h-7 text-xs gap-1"
                    >
                      <Save size={12} />
                      {savingClient ? 'Se salveaza...' : 'Salveaza'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingClient(true)}
                      className="h-7 text-xs gap-1"
                    >
                      <Pencil size={12} />
                      Editeaza
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deleteClient}
                      className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                    >
                      <Trash2 size={12} />
                      Sterge
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editingClient ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Telefon</Label>
                  <Input
                    value={formatPhone(clientPhone)}
                    onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-9 text-sm"
                    maxLength={12}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nume</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Introduceti numele"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Info</Label>
                  <Input
                    value={clientInfo}
                    onChange={(e) => setClientInfo(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Informatii aditionale"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Telefon</p>
                  <p className="text-sm font-medium">{formatPhone(clientPhone)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Nume</p>
                  <p className="text-sm font-medium">{clientName || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Info</p>
                  <p className="text-sm text-muted-foreground">{clientInfo || '—'}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Vehicles ─────────────────────────────────────────── */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Car size={14} className="text-primary" />
                Vehicule ({vehicles.length})
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={startAddVehicle}
                disabled={addingVehicle}
                className="h-7 text-xs gap-1"
              >
                <Plus size={12} />
                Adauga vehicul
              </Button>
            </div>

            {loadingVehicles ? (
              <p className="text-sm text-muted-foreground text-center py-4">Se incarca...</p>
            ) : (
              <div className="space-y-3">
                {/* Add vehicle form */}
                {addingVehicle && (
                  <VehicleForm
                    plate={vPlate} setPlate={setVPlate}
                    vin={vVin} setVin={setVVin}
                    civ={vCiv} setCiv={setVCiv}
                    category={vCategory} setCategory={setVCategory}
                    brand={vBrand} setBrand={setVBrand}
                    year={vYear} setYear={setVYear}
                    fuel={vFuel} setFuel={setVFuel}
                    years={years}
                    onSave={saveVehicle}
                    onCancel={cancelVehicleEdit}
                    saving={savingVehicle}
                    isNew
                  />
                )}

                {vehicles.length === 0 && !addingVehicle && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Niciun vehicul inregistrat
                  </p>
                )}

                {vehicles.map((v) => (
                  <div key={v.id}>
                    {editingVehicleId === v.id ? (
                      <VehicleForm
                        plate={vPlate} setPlate={setVPlate}
                        vin={vVin} setVin={setVVin}
                        civ={vCiv} setCiv={setVCiv}
                        category={vCategory} setCategory={setVCategory}
                        brand={vBrand} setBrand={setVBrand}
                        year={vYear} setYear={setVYear}
                        fuel={vFuel} setFuel={setVFuel}
                        years={years}
                        onSave={saveVehicle}
                        onCancel={cancelVehicleEdit}
                        saving={savingVehicle}
                      />
                    ) : (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 group hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-sm font-bold text-foreground tracking-wide">
                              {v.plate_number}
                            </p>
                            <p className="text-[11px] text-muted-foreground">Nr. inmatriculare</p>
                          </div>
                          {v.brand && (
                            <div>
                              <p className="text-sm text-foreground">{v.brand}</p>
                              <p className="text-[11px] text-muted-foreground">Marca</p>
                            </div>
                          )}
                          {v.manufacture_year && (
                            <div>
                              <p className="text-sm text-foreground">{v.manufacture_year}</p>
                              <p className="text-[11px] text-muted-foreground">An</p>
                            </div>
                          )}
                          {v.category && (
                            <div>
                              <p className="text-sm text-foreground">{v.category}</p>
                              <p className="text-[11px] text-muted-foreground">Cat.</p>
                            </div>
                          )}
                          {v.fuel_type && (
                            <div>
                              <p className="text-sm text-foreground">{v.fuel_type}</p>
                              <p className="text-[11px] text-muted-foreground">Combustibil</p>
                            </div>
                          )}
                          {v.vin && (
                            <div>
                              <p className="text-xs text-foreground font-mono">{v.vin}</p>
                              <p className="text-[11px] text-muted-foreground">VIN</p>
                            </div>
                          )}
                          {(v as any).civ && (
                            <div>
                              <p className="text-xs text-foreground font-mono">{(v as any).civ}</p>
                              <p className="text-[11px] text-muted-foreground">C.I.V.</p>
                            </div>
                          )}
                          {(v as any).itp_expiry_date && (
                            <div>
                              <p className={`text-xs font-medium ${
                                new Date((v as any).itp_expiry_date) < new Date() 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {new Date((v as any).itp_expiry_date).toLocaleDateString('ro-RO', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date((v as any).itp_expiry_date) < new Date() ? 'ITP expirat' : 'ITP valabil'}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditVehicle(v)}
                            className="h-7 w-7 p-0"
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteVehicle(v.id, v.plate_number)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Istoric inspectii per vehicul ────────────────────── */}
          {vehicles.length > 0 && appointments.some((a) => a.result) && (
            <div className="px-6 py-5 border-b">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Hash size={14} className="text-primary" />
                Istoric inspectii ITP
              </h3>

              <div className="space-y-4">
                {vehicles.map((v) => {
                  const vehicleInspections = appointments.filter(
                    (a) => a.vehicle_id === v.id && a.result
                  )
                  if (vehicleInspections.length === 0) return null

                  return (
                    <div key={v.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground tracking-wide bg-gray-100 px-2 py-0.5 rounded">
                          {v.plate_number}
                        </span>
                        {v.brand && <span className="text-xs text-muted-foreground">{v.brand}</span>}
                      </div>

                      <div className="space-y-1 ml-2">
                        {vehicleInspections.map((apt) => {
                          const resultLabels: Record<string, { label: string; color: string; icon: string }> = {
                            admis: { label: 'Admis', color: 'bg-green-100 text-green-700', icon: '✓' },
                            respins: { label: 'Respins', color: 'bg-red-100 text-red-700', icon: '✗' },
                            neprezentare: { label: 'Neprezentare', color: 'bg-yellow-100 text-yellow-700', icon: '—' },
                          }
                          const r = resultLabels[apt.result || ''] || { label: '—', color: 'bg-gray-100 text-gray-500', icon: '' }

                          return (
                            <div
                              key={apt.id}
                              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-xs">
                                  {new Date(apt.date).toLocaleDateString('ro-RO', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.color}`}>
                                  {r.icon} {r.label}
                                </span>
                                {apt.result === 'admis' && apt.itp_duration_years && (
                                  <span className="text-[11px] text-muted-foreground">
                                    ({apt.itp_duration_years} {apt.itp_duration_years === 1 ? 'an' : 'ani'})
                                  </span>
                                )}
                              </div>
                              {apt.result === 'respins' && apt.rejection_reason && (
                                <span className="text-[11px] text-red-500 max-w-[200px] truncate" title={apt.rejection_reason}>
                                  {apt.rejection_reason}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Appointments History ─────────────────────────────── */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-primary" />
              Istoric programari ({appointments.length})
            </h3>

            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nicio programare
              </p>
            ) : (
              <div className="space-y-1.5">
                {appointments.map((apt) => {
                  const s = statusLabels[apt.status] || statusLabels.scheduled
                  const resultLabels: Record<string, { label: string; color: string }> = {
                    admis: { label: 'Admis', color: 'bg-emerald-100 text-emerald-700' },
                    respins: { label: 'Respins', color: 'bg-orange-100 text-orange-700' },
                    neprezentare: { label: 'Neprezentare', color: 'bg-yellow-100 text-yellow-700' },
                  }
                  const r = apt.result ? resultLabels[apt.result] : null

                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium">
                          {new Date(apt.date).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          {(apt.time as string).substring(0, 5)}
                        </span>
                        {apt.vehicle && (
                          <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border">
                            {apt.vehicle.plate_number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {r && (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${r.color}`}>
                            {r.label}
                          </span>
                        )}
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 pb-4">
              <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Vehicle Edit/Add Form ──────────────────────────────────────────
function VehicleForm({
  plate, setPlate,
  vin, setVin,
  civ, setCiv,
  category, setCategory,
  brand, setBrand,
  year, setYear,
  fuel, setFuel,
  years,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  plate: string; setPlate: (v: string) => void
  vin: string; setVin: (v: string) => void
  civ: string; setCiv: (v: string) => void
  category: string; setCategory: (v: string) => void
  brand: string; setBrand: (v: string) => void
  year: string; setYear: (v: string) => void
  fuel: string; setFuel: (v: string) => void
  years: number[]
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew?: boolean
}) {
  return (
    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">
          {isNew ? 'Vehicul nou' : 'Editare vehicul'}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs gap-1">
            <X size={12} />
            Anuleaza
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs gap-1">
            <Save size={12} />
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Nr. inmatriculare *</Label>
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            className="h-8 text-sm uppercase"
            placeholder="TM01TIM"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Serie sasiu (VIN)</Label>
          <Input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            className="h-8 text-sm uppercase font-mono"
            placeholder="WVWZZZ..."
            maxLength={17}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Seria C.I.V.</Label>
          <Input
            value={civ}
            onChange={(e) => setCiv(e.target.value.toUpperCase())}
            className="h-8 text-sm uppercase font-mono"
            placeholder="C-123456"
            maxLength={10}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Categorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecteaza" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Marca</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecteaza" />
            </SelectTrigger>
            <SelectContent>
              {BRANDS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">An fabricatie</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecteaza" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Combustibil</Label>
          <Select value={fuel} onValueChange={setFuel}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecteaza" />
            </SelectTrigger>
            <SelectContent>
              {FUEL_TYPES.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
