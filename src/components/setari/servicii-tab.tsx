'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Settings2, Search, Trash2, Plus } from 'lucide-react'
import type { StationCategory, ServicePrice } from '@/types/database'

export function ServiciiTab() {
  const { staff } = useAuth()
  const supabase = createClient()
  const [categories, setCategories] = useState<StationCategory[]>([])
  const [prices, setPrices] = useState<ServicePrice[]>([])
  const [loading, setLoading] = useState(true)

  // New price form
  const [newPriceName, setNewPriceName] = useState('')
  const [newPriceValue, setNewPriceValue] = useState('')

  const loadData = useCallback(async () => {
    if (!staff) return

    const [{ data: catData }, { data: priceData }] = await Promise.all([
      supabase
        .from('station_categories')
        .select('*')
        .eq('station_id', staff.station_id)
        .order('sort_order'),
      supabase
        .from('service_prices')
        .select('*')
        .eq('station_id', staff.station_id)
        .order('created_at'),
    ])

    if (catData) setCategories(catData as StationCategory[])
    if (priceData) setPrices(priceData as ServicePrice[])
    setLoading(false)
  }, [staff])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Category toggle ─────────────────────────────────────────────

  const toggleCategory = async (id: string, isActive: boolean) => {
    await supabase
      .from('station_categories')
      .update({ is_active: isActive })
      .eq('id', id)

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
    )
  }

  // ── Price CRUD ──────────────────────────────────────────────────

  const updatePriceName = async (id: string, name: string) => {
    await supabase
      .from('service_prices')
      .update({ name })
      .eq('id', id)
  }

  const updatePriceValue = async (id: string, price: number) => {
    await supabase
      .from('service_prices')
      .update({ price })
      .eq('id', id)
  }

  const deletePrice = async (id: string) => {
    await supabase.from('service_prices').delete().eq('id', id)
    setPrices((prev) => prev.filter((p) => p.id !== id))
  }

  const addPrice = async () => {
    if (!staff || !newPriceName.trim()) return

    const { data } = await supabase
      .from('service_prices')
      .insert({
        station_id: staff.station_id,
        name: newPriceName.trim(),
        price: parseFloat(newPriceValue) || 0,
        currency: 'RON',
      })
      .select()
      .single()

    if (data) {
      setPrices((prev) => [...prev, data as ServicePrice])
      setNewPriceName('')
      setNewPriceValue('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Se incarca...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 size={20} className="text-primary" />
        <h2 className="text-lg font-semibold text-primary">Servicii</h2>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-8">
        {/* ═══ Left: Categories ═══ */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">Categorii</h3>
          <div className="border rounded-xl overflow-hidden">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  idx < categories.length - 1 ? 'border-b' : ''
                }`}
              >
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                <Switch
                  checked={cat.is_active}
                  onCheckedChange={(v) => toggleCategory(cat.id, v)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Right: Prices ═══ */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">Preturi</h3>
          <div className="border rounded-xl overflow-hidden">
            {prices.map((price, idx) => (
              <PriceRow
                key={price.id}
                price={price}
                isLast={idx === prices.length - 1}
                onUpdateName={updatePriceName}
                onUpdatePrice={updatePriceValue}
                onDelete={deletePrice}
              />
            ))}

            {/* Add price row */}
            <div className="border-t">
              <button
                onClick={addPrice}
                className="flex items-center justify-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus size={16} />
                <span>Adauga pret</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Price Row Component ───────────────────────────────────────────

function PriceRow({
  price,
  isLast,
  onUpdateName,
  onUpdatePrice,
  onDelete,
}: {
  price: ServicePrice
  isLast: boolean
  onUpdateName: (id: string, name: string) => void
  onUpdatePrice: (id: string, price: number) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(price.name)
  const [priceVal, setPriceVal] = useState(price.price.toString())

  const handleNameBlur = () => {
    if (name.trim() !== price.name) {
      onUpdateName(price.id, name.trim())
    }
  }

  const handlePriceBlur = () => {
    const num = parseFloat(priceVal)
    if (!isNaN(num) && num !== price.price) {
      onUpdatePrice(price.id, num)
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 ${!isLast ? 'border-b' : ''}`}
    >
      <Search size={14} className="text-muted-foreground flex-shrink-0" />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleNameBlur}
        className="h-8 border-0 shadow-none focus-visible:ring-0 px-1 text-sm"
      />
      <Input
        value={priceVal}
        onChange={(e) => setPriceVal(e.target.value)}
        onBlur={handlePriceBlur}
        type="number"
        className="h-8 w-[80px] border-0 shadow-none focus-visible:ring-0 text-sm text-right flex-shrink-0"
      />
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
        {price.currency}
      </span>
      <button
        onClick={() => onDelete(price.id)}
        className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
