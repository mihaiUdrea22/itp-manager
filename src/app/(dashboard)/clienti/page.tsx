'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Search, Phone, User, Car, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { ClientDetailModal } from '@/components/clienti/client-detail-modal'
import type { Client } from '@/types/database'

type ClientWithVehicleCount = Client & {
  vehicle_count: number
  appointment_count: number
}

const PAGE_SIZE = 25

const formatPhone = (digits: string) => {
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
}

export default function ClientiPage() {
  const { staff } = useAuth()
  const supabase = createClient()

  const [clients, setClients] = useState<ClientWithVehicleCount[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  // Detail modal
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchClients = useCallback(async () => {
    if (!staff) return

    setLoading(true)

    // Get count
    let countQuery = supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('station_id', staff.station_id)

    if (search.trim()) {
      countQuery = countQuery.or(`phone.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { count } = await countQuery
    setTotalCount(count || 0)

    // Get paginated clients
    let query = supabase
      .from('clients')
      .select('*')
      .eq('station_id', staff.station_id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search.trim()) {
      query = query.or(`phone.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data } = await query
    const clientList = (data as Client[]) || []

    // Get vehicle counts for each client
    if (clientList.length > 0) {
      const clientIds = clientList.map((c) => c.id)

      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('client_id')
        .eq('station_id', staff.station_id)
        .in('client_id', clientIds)

      const { data: appointments } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('station_id', staff.station_id)
        .in('client_id', clientIds)

      const vehicleCountMap: Record<string, number> = {}
      const appointmentCountMap: Record<string, number> = {}

      for (const v of vehicles || []) {
        vehicleCountMap[v.client_id] = (vehicleCountMap[v.client_id] || 0) + 1
      }
      for (const a of appointments || []) {
        appointmentCountMap[a.client_id] = (appointmentCountMap[a.client_id] || 0) + 1
      }

      const enrichedClients: ClientWithVehicleCount[] = clientList.map((c) => ({
        ...c,
        vehicle_count: vehicleCountMap[c.id] || 0,
        appointment_count: appointmentCountMap[c.id] || 0,
      }))

      setClients(enrichedClients)
    } else {
      setClients([])
    }

    setLoading(false)
  }, [staff, search, page])

  useEffect(() => {
    const timeout = setTimeout(fetchClients, 300)
    return () => clearTimeout(timeout)
  }, [fetchClients])

  // Reset page when search changes
  useEffect(() => {
    setPage(0)
  }, [search])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const openDetail = (client: Client) => {
    setSelectedClient(client)
    setDetailOpen(true)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-primary">Clienti</h1>
          <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
            {totalCount}
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cauta dupa telefon sau nume..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-[320px]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-12">#</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Telefon</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Nume</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Info</th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Vehicule</th>
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Programari</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Creat</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  Se incarca...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  {search ? 'Nu s-au gasit clienti pentru cautarea ta' : 'Niciun client inregistrat'}
                </td>
              </tr>
            ) : (
              clients.map((client, idx) => (
                <tr
                  key={client.id}
                  className="border-b last:border-b-0 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => openDetail(client)}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {page * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-primary/60" />
                      <span className="text-sm font-medium">{formatPhone(client.phone)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {client.name ? (
                        <>
                          <User size={13} className="text-muted-foreground" />
                          <span className="text-sm">{client.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                    {client.info || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      <Car size={11} />
                      {client.vehicle_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-muted-foreground">
                      {client.appointment_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(client.created_at).toLocaleDateString('ro-RO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetail(client)
                      }}
                    >
                      <Eye size={13} />
                      Detalii
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} din {totalCount} clienti
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft size={14} />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = page < 3 ? i : page - 2 + i
                if (pageNum >= totalPages) return null
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    variant={pageNum === page ? 'default' : 'outline'}
                    onClick={() => setPage(pageNum)}
                    className="h-7 w-7 p-0 text-xs"
                  >
                    {pageNum + 1}
                  </Button>
                )
              })}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-7 w-7 p-0"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Client Detail Modal */}
      <ClientDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
        onClientUpdated={() => {
          fetchClients()
        }}
      />
    </div>
  )
}
