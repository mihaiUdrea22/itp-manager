'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  MessageSquare,
  Check,
  Send,
  AlertTriangle,
  CheckCircle2,
  CalendarPlus,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from 'lucide-react'

// ── Message types ────────────────────────────────────────────────
type MessageType = 'programare' | 'reprogramare' | 'reamintire'

interface MessageConfig {
  key: MessageType
  icon: React.ReactNode
  title: string
  color: string
  borderColor: string
  bgColor: string
  defaultTemplate: string
  defaultMetaTemplate: string
  description: string
  metaParams: string
}

const MESSAGE_CONFIGS: MessageConfig[] = [
  {
    key: 'programare',
    icon: <CalendarPlus size={18} />,
    title: 'Programare',
    color: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    defaultTemplate:
      'Programare ITP Manager pentru {numar} pe data de {data} la ora {ora}. Va asteptam la {statie} pe {adresa}.',
    defaultMetaTemplate: 'programare_itp_manager',
    description: 'Se trimite automat cand se creeaza o programare noua',
    metaParams: '{{1}}=Statie, {{2}}=Data, {{3}}=Ora, {{4}}=Nr. inmatriculare',
  },
  {
    key: 'reprogramare',
    icon: <RefreshCw size={18} />,
    title: 'Reprogramare',
    color: 'text-orange-600',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50',
    defaultTemplate:
      'Reprogramare ITP Manager pentru {numar} pe data de {data} la ora {ora}. Va asteptam la {statie} pe {adresa}.',
    defaultMetaTemplate: 'reprogramare_itp_manager',
    description: 'Se trimite automat cand se modifica data/ora unei programari',
    metaParams: '{{1}}=Statie, {{2}}=Data, {{3}}=Ora, {{4}}=Nr. inmatriculare',
  },
  {
    key: 'reamintire',
    icon: <Clock size={18} />,
    title: 'Reamintire',
    color: 'text-purple-600',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50',
    defaultTemplate:
      'Va reamintim ca astazi la ora {ora} aveti programare ITP Manager pentru {numar}. Va asteptam la {statie}, {adresa}.',
    defaultMetaTemplate: 'reamintire_itp_manager',
    description: 'Se trimite automat cu X ore inainte de programare',
    metaParams: '{{1}}=Statie, {{2}}=Ora, {{3}}=Nr. inmatriculare',
  },
]

const PLACEHOLDERS = [
  { tag: '{data}', desc: 'Data programarii' },
  { tag: '{ora}', desc: 'Ora programarii' },
  { tag: '{numar}', desc: 'Nr. inmatriculare' },
  { tag: '{statie}', desc: 'Numele statiei' },
  { tag: '{adresa}', desc: 'Adresa statiei' },
  { tag: '{client}', desc: 'Numele clientului' },
  { tag: '{telefon}', desc: 'Telefonul' },
  { tag: '{marca}', desc: 'Marca vehiculului' },
]

const MAX_CHARS = 160

export function SmsTab() {
  const { staff, station } = useAuth()
  const supabase = createClient()

  // Settings state per message type
  const [templates, setTemplates] = useState<Record<MessageType, string>>({
    programare: MESSAGE_CONFIGS[0].defaultTemplate,
    reprogramare: MESSAGE_CONFIGS[1].defaultTemplate,
    reamintire: MESSAGE_CONFIGS[2].defaultTemplate,
  })
  const [metaTemplates, setMetaTemplates] = useState<Record<MessageType, string>>({
    programare: '',
    reprogramare: '',
    reamintire: '',
  })
  const [enabledMap, setEnabledMap] = useState<Record<MessageType, boolean>>({
    programare: true,
    reprogramare: true,
    reamintire: true,
  })
  const [reminderHours, setReminderHours] = useState(1)
  const [templateLang, setTemplateLang] = useState('ro')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Expanded card for editing
  const [expandedCard, setExpandedCard] = useState<MessageType | null>(null)

  // Test
  const [testPhone, setTestPhone] = useState('')
  const [testType, setTestType] = useState<MessageType>('programare')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testSending, setTestSending] = useState(false)

  const textareaRefs = useRef<Record<MessageType, HTMLTextAreaElement | null>>({
    programare: null,
    reprogramare: null,
    reamintire: null,
  })

  // ── Load settings ──────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (!staff) return

    const keys = [
      'whatsapp_template_lang',
      'reminder_hours',
      ...MESSAGE_CONFIGS.flatMap((c) => [
        `sms_${c.key}_enabled`,
        `sms_${c.key}_template`,
        `sms_${c.key}_meta_template`,
      ]),
    ]

    const { data } = await supabase
      .from('station_settings')
      .select('*')
      .eq('station_id', staff.station_id)
      .in('key', keys)

    if (data) {
      const settings = Object.fromEntries(
        (data as Array<{ key: string; value: string }>).map((s) => [s.key, s.value])
      )

      const newEnabled = { ...enabledMap }
      const newTemplates = { ...templates }
      const newMetaTemplates = { ...metaTemplates }

      for (const c of MESSAGE_CONFIGS) {
        if (settings[`sms_${c.key}_enabled`] !== undefined) {
          newEnabled[c.key] = settings[`sms_${c.key}_enabled`] === 'true'
        }
        if (settings[`sms_${c.key}_template`]) {
          newTemplates[c.key] = settings[`sms_${c.key}_template`]
        }
        if (settings[`sms_${c.key}_meta_template`] !== undefined) {
          newMetaTemplates[c.key] = settings[`sms_${c.key}_meta_template`]
        }
      }

      setEnabledMap(newEnabled)
      setTemplates(newTemplates)
      setMetaTemplates(newMetaTemplates)

      if (settings.whatsapp_template_lang) setTemplateLang(settings.whatsapp_template_lang)
      if (settings.reminder_hours) setReminderHours(parseInt(settings.reminder_hours) || 1)
    }

    setLoading(false)
  }, [staff])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // ── Save helpers ───────────────────────────────────────────────
  const saveSetting = async (key: string, value: string) => {
    if (!staff) return

    const { data: existing } = await supabase
      .from('station_settings')
      .select('id')
      .eq('station_id', staff.station_id)
      .eq('key', key)
      .single()

    if (existing) {
      await supabase.from('station_settings').update({ value }).eq('id', existing.id)
    } else {
      await supabase.from('station_settings').insert({ station_id: staff.station_id, key, value })
    }
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const promises: Promise<void>[] = [
        saveSetting('whatsapp_template_lang', templateLang),
        saveSetting('reminder_hours', reminderHours.toString()),
      ]

      for (const c of MESSAGE_CONFIGS) {
        promises.push(saveSetting(`sms_${c.key}_enabled`, enabledMap[c.key].toString()))
        promises.push(saveSetting(`sms_${c.key}_template`, templates[c.key]))
        promises.push(saveSetting(`sms_${c.key}_meta_template`, metaTemplates[c.key]))
      }

      await Promise.all(promises)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle enabled ─────────────────────────────────────────────
  const toggleEnabled = async (type: MessageType, value: boolean) => {
    setEnabledMap((prev) => ({ ...prev, [type]: value }))
    await saveSetting(`sms_${type}_enabled`, value.toString())
  }

  // ── Reminder hours ─────────────────────────────────────────────
  const changeReminderHours = (delta: number) => {
    setReminderHours((prev) => Math.max(1, Math.min(48, prev + delta)))
  }

  // ── Insert placeholder into textarea ───────────────────────────
  const insertPlaceholder = (type: MessageType, tag: string) => {
    setTemplates((prev) => ({ ...prev, [type]: prev[type] + tag }))
  }

  // ── Preview ────────────────────────────────────────────────────
  const getPreview = (text: string) => {
    return text
      .replace('{data}', '25 feb 2026')
      .replace('{ora}', '12:00')
      .replace('{numar}', 'TM51MTZ')
      .replace('{statie}', station?.name || 'ITP Manager')
      .replace('{adresa}', station?.address || 'Str. Exemplu nr. 1')
      .replace('{client}', 'Ion Popescu')
      .replace('{telefon}', '0712345678')
      .replace('{marca}', 'Volkswagen')
  }

  // ── Test send ──────────────────────────────────────────────────
  const sendTestMessage = async (type: MessageType) => {
    if (!testPhone) {
      setTestResult({ ok: false, message: 'Introduceti un numar de telefon' })
      return
    }

    setTestSending(true)
    setTestType(type)
    setTestResult(null)

    try {
      const payload: Record<string, unknown> = { phone: testPhone }
      const metaName = metaTemplates[type]

      if (metaName) {
        payload.templateName = metaName
        payload.language = templateLang

        if (type === 'reamintire') {
          payload.templateParams = [station?.name || 'ITP Manager', '12:00', 'TM51MTZ']
        } else {
          payload.templateParams = [station?.name || 'ITP Manager', '25 feb 2026', '12:00', 'TM51MTZ']
        }
      } else {
        payload.message = getPreview(templates[type])
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (res.ok) {
        setTestResult({ ok: true, message: 'Mesaj trimis cu succes!' })
      } else {
        setTestResult({ ok: false, message: result.error || 'Eroare la trimitere' })
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Eroare de retea' })
    } finally {
      setTestSending(false)
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
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-primary">SMS</h2>
        </div>
        <Button onClick={saveAll} disabled={saving || saved} className="gap-2">
          {saved ? (
            <>
              <Check size={14} />
              Salvat
            </>
          ) : saving ? (
            'Se salveaza...'
          ) : (
            <>
              <Settings2 size={14} />
              Salveaza tot
            </>
          )}
        </Button>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MESSAGE_CONFIGS.map((config) => {
          const isExpanded = expandedCard === config.key
          const charCount = templates[config.key].length

          return (
            <div
              key={config.key}
              className={`bg-white border rounded-xl overflow-hidden transition-all ${
                isExpanded ? 'md:col-span-3' : ''
              }`}
            >
              {/* Card Header */}
              <div className={`px-5 py-4 ${config.bgColor} border-b ${config.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={config.color}>{config.icon}</span>
                    <h3 className="text-sm font-bold text-foreground">{config.title}</h3>
                  </div>

                  {config.key === 'reamintire' ? (
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={enabledMap[config.key]}
                        onCheckedChange={(v) => toggleEnabled(config.key, v)}
                        className="data-[state=checked]:bg-primary scale-90"
                      />
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => changeReminderHours(-1)}
                          className="w-6 h-6 flex items-center justify-center rounded border hover:bg-white/80 transition-colors"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-sm font-bold min-w-[24px] text-center">
                          {reminderHours}
                        </span>
                        <button
                          onClick={() => changeReminderHours(1)}
                          className="w-6 h-6 flex items-center justify-center rounded border hover:bg-white/80 transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <span className="text-xs text-muted-foreground ml-1">ore</span>
                      </div>
                    </div>
                  ) : (
                    <Switch
                      checked={enabledMap[config.key]}
                      onCheckedChange={(v) => toggleEnabled(config.key, v)}
                      className="data-[state=checked]:bg-primary scale-90"
                    />
                  )}
                </div>
              </div>

              {/* Card Body — Template Text */}
              <div className="p-5 space-y-3">
                <Textarea
                  ref={(el) => {
                    textareaRefs.current[config.key] = el
                  }}
                  value={templates[config.key]}
                  onChange={(e) =>
                    setTemplates((prev) => ({ ...prev, [config.key]: e.target.value }))
                  }
                  rows={isExpanded ? 4 : 3}
                  className="resize-none text-xs leading-relaxed"
                  placeholder="Introduceti mesajul..."
                />
                <div className="flex items-center justify-between">
                  <p
                    className={`text-[11px] ${
                      charCount > MAX_CHARS ? 'text-red-500 font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {charCount}/{MAX_CHARS} caractere
                  </p>
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : config.key)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {isExpanded ? 'Restrange' : 'Editeaza'}
                  </button>
                </div>

                {/* Expanded: placeholders, meta template, preview */}
                {isExpanded && (
                  <div className="space-y-4 pt-2 border-t">
                    {/* Placeholders */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Insereaza tag-uri:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {PLACEHOLDERS.map((p) => (
                          <button
                            key={p.tag}
                            onClick={() => insertPlaceholder(config.key, p.tag)}
                            className="px-2 py-0.5 text-[11px] bg-primary/5 text-primary border border-primary/20 rounded hover:bg-primary/10 transition-colors font-mono"
                            title={p.desc}
                          >
                            {p.tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Meta Template Config */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Nume template Meta
                        </Label>
                        <Input
                          placeholder={config.defaultMetaTemplate}
                          value={metaTemplates[config.key]}
                          onChange={(e) =>
                            setMetaTemplates((prev) => ({
                              ...prev,
                              [config.key]: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                            }))
                          }
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Parametri: {config.metaParams}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Limba template</Label>
                        <Input
                          value={templateLang}
                          onChange={(e) => setTemplateLang(e.target.value.toLowerCase())}
                          className="h-9 text-xs font-mono"
                          placeholder="ro"
                        />
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Previzualizare</Label>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-1">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg
                              viewBox="0 0 24 24"
                              className="w-3.5 h-3.5 text-white"
                              fill="currentColor"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </div>
                          <p className="text-xs text-green-900 whitespace-pre-wrap leading-relaxed">
                            {getPreview(templates[config.key])}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Test send for this type */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Nr. telefon test"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                        className="h-9 text-xs max-w-[200px]"
                        maxLength={13}
                      />
                      <Button
                        onClick={() => sendTestMessage(config.key)}
                        disabled={testSending || !testPhone}
                        size="sm"
                        className="h-9 gap-1.5 text-xs"
                      >
                        <Send size={12} />
                        {testSending && testType === config.key
                          ? 'Se trimite...'
                          : 'Test'}
                      </Button>
                      {testResult && testType === config.key && (
                        <div
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                            testResult.ok
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {testResult.ok ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <AlertTriangle size={12} />
                          )}
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-2">
        <p className="font-medium">Cum functioneaza:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Programare</strong> — mesaj automat cand se creeaza o programare noua
          </li>
          <li>
            <strong>Reprogramare</strong> — mesaj automat cand se modifica data sau ora unei
            programari existente
          </li>
          <li>
            <strong>Reamintire</strong> — mesaj automat cu {reminderHours}{' '}
            {reminderHours === 1 ? 'ora' : 'ore'} inainte de programare
          </li>
        </ul>
        <p className="mt-2">
          Pentru trimitere automata, creeaza{' '}
          <a
            href="https://business.facebook.com/wa/manage/message-templates"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Message Templates
          </a>{' '}
          in Meta WhatsApp Manager si introdu numele lor in campurile respective (click pe
          &quot;Editeaza&quot;).
        </p>
      </div>
    </div>
  )
}
