'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2,
  Image,
  Wrench,
  Clock,
  UserRound,
  MessageSquare,
  Code2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EngineersTab } from '@/components/setari/engineers-tab'
import { ProgramTab } from '@/components/setari/program-tab'
import { ServiciiTab } from '@/components/setari/servicii-tab'
import { SmsTab } from '@/components/setari/sms-tab'
import { ApiTab } from '@/components/setari/api-tab'

const TABS = [
  { id: 'informatii', label: 'Informatii', icon: Building2 },
  { id: 'imagini', label: 'Imagini', icon: Image },
  { id: 'servicii', label: 'Servicii', icon: Wrench },
  { id: 'program', label: 'Program', icon: Clock },
  { id: 'ingineri', label: 'Ingineri', icon: UserRound },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'api', label: 'API', icon: Code2 },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SetariPage() {
  const { station, staff } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('ingineri')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'informatii' && <InformatiiTab station={station} staff={staff} />}
      {activeTab === 'imagini' && <PlaceholderTab label="Imagini" />}
      {activeTab === 'servicii' && <ServiciiTab />}
      {activeTab === 'program' && <ProgramTab />}
      {activeTab === 'ingineri' && <EngineersTab />}
      {activeTab === 'sms' && <SmsTab />}
      {activeTab === 'api' && <ApiTab />}
    </div>
  )
}

// ── Informatii Tab ─────────────────────────────────────────────────

function InformatiiTab({
  station,
  staff,
}: {
  station: any
  staff: any
}) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-4">
          <Building2 size={16} />
          Informatii statie
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nume statie</Label>
            <Input value={station?.name || ''} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Telefon</Label>
            <Input value={station?.phone || ''} readOnly className="bg-gray-50" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="text-xs text-muted-foreground">Adresa</Label>
            <Input value={station?.address || ''} readOnly className="bg-gray-50" />
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-4">
          <UserRound size={16} />
          Profil
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nume</Label>
            <Input value={staff?.name || ''} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={staff?.email || ''} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Rol</Label>
            <Input value={staff?.role || ''} readOnly className="bg-gray-50 capitalize" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Placeholder Tab ───────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
      <p>Sectiunea <strong>{label}</strong> va fi disponibila in curand.</p>
    </div>
  )
}
