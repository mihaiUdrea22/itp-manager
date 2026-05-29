'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Code2,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

export function ApiTab() {
  const { staff } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [accessToken, setAccessToken] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [businessAccountId, setBusinessAccountId] = useState('')
  const [showToken, setShowToken] = useState(false)

  // ── Load settings ──────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (!staff) return

    setLoading(true)
    const { data } = await supabase
      .from('station_settings')
      .select('key, value')
      .eq('station_id', staff.station_id)
      .in('key', [
        'whatsapp_access_token',
        'whatsapp_phone_number_id',
        'whatsapp_business_account_id',
      ])

    if (data) {
      const settings: Record<string, string> = {}
      data.forEach((s: { key: string; value: string }) => {
        settings[s.key] = s.value
      })
      setAccessToken(settings.whatsapp_access_token || '')
      setPhoneNumberId(settings.whatsapp_phone_number_id || '')
      setBusinessAccountId(settings.whatsapp_business_account_id || '')
    }
    setLoading(false)
  }, [staff])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // ── Save setting ───────────────────────────────────────────────
  const saveSetting = async (key: string, value: string) => {
    if (!staff) return

    const { data: existing } = await supabase
      .from('station_settings')
      .select('id')
      .eq('station_id', staff.station_id)
      .eq('key', key)
      .maybeSingle()

    if (existing) {
      await supabase.from('station_settings').update({ value }).eq('id', existing.id)
    } else {
      await supabase.from('station_settings').insert({ station_id: staff.station_id, key, value })
    }
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      await Promise.all([
        saveSetting('whatsapp_access_token', accessToken.trim()),
        saveSetting('whatsapp_phone_number_id', phoneNumberId.trim()),
        saveSetting('whatsapp_business_account_id', businessAccountId.trim()),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving API settings:', err)
    }
    setSaving(false)
  }

  // ── Test connection ─────────────────────────────────────────────
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const testConnection = async () => {
    if (!accessToken || !phoneNumberId) {
      setTestResult({ ok: false, message: 'Access Token si Phone Number ID sunt obligatorii.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId.trim()}`,
        {
          headers: { Authorization: `Bearer ${accessToken.trim()}` },
        }
      )
      const data = await res.json()
      if (res.ok && data?.id) {
        setTestResult({
          ok: true,
          message: `Conexiune reusita! Numar: ${data.display_phone_number || data.id}`,
        })
      } else {
        setTestResult({
          ok: false,
          message: data?.error?.message || 'Eroare la verificare. Verificati datele.',
        })
      }
    } catch {
      setTestResult({ ok: false, message: 'Eroare de retea. Incercati din nou.' })
    }
    setTesting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
        <RefreshCw size={16} className="animate-spin" />
        Se incarca...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-primary">Configurare API</h2>
        </div>
        <Button onClick={saveAll} disabled={saving} className="gap-2">
          {saved ? (
            <>
              <CheckCircle2 size={16} />
              Salvat!
            </>
          ) : (
            <>
              <Save size={16} />
              {saving ? 'Se salveaza...' : 'Salveaza'}
            </>
          )}
        </Button>
      </div>

      {/* WhatsApp Cloud API */}
      <div className="bg-white border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-600 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp Cloud API
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Configurati conexiunea cu Meta WhatsApp Business API pentru trimiterea automata de mesaje.
            </p>
          </div>
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Meta Developers
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="space-y-4">
          {/* Access Token */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Access Token *</Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAxxxxxxx..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Generat din Meta Developers &gt; API Setup &gt; Generate access token
            </p>
          </div>

          {/* Phone Number ID */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Phone Number ID *</Label>
            <Input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="950391024832113"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Afisat in API Setup sub &quot;Phone number ID&quot;
            </p>
          </div>

          {/* Business Account ID */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">WhatsApp Business Account ID</Label>
            <Input
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              placeholder="25969247549381119"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Afisat in API Setup sub &quot;WhatsApp Business Account ID&quot;
            </p>
          </div>
        </div>

        {/* Test Connection */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={testing || !accessToken || !phoneNumberId}
            className="gap-2"
          >
            {testing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Code2 size={14} />
            )}
            Testeaza conexiunea
          </Button>
          {testResult && (
            <div
              className={`flex items-center gap-1.5 text-xs ${
                testResult.ok ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {testResult.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Important</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Token-ul generat din API Setup este <strong>temporar</strong> (expira in ~24h).</li>
              <li>
                Pentru productie, creati un <strong>System User Token</strong> din Business Settings
                &gt; System Users (permanent).
              </li>
              <li>
                In modul de test, adaugati numerele destinatarilor in{' '}
                <strong>API Setup &gt; To &gt; Manage phone number list</strong>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
