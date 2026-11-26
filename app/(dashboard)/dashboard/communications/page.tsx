'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Phone, MessageSquare, Search, Loader2, X, Send,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall,
  Download, ChevronLeft, ChevronRight, Mail,
  Mic, MicOff, PhoneOff, Play, Pause, Maximize2,
  CheckCircle2, Briefcase, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDialer, fmtElapsed, type DialerContact } from '@/components/communications/useDialer'

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'calls' | 'phone-numbers' | 'texting'
type AvailableNumber  = { phoneNumber: string; friendlyName: string }
type PurchasedNumber  = { id: string; phone_number: string; friendly_name: string | null; twilio_sid: string; created_at: string }
type TextMessage      = { id: string; to_number: string; from_number: string; body: string; status: string | null; customer_name: string | null; created_at: string }
type TwilioCall       = { sid: string; status: string; from: string; to: string; startTime: string; duration: string }
type Customer         = { id: string; name: string; phone: string | null; email: string | null }
type CallFilter       = 'all' | 'missed' | 'answered' | 'outbound' | 'new-callers'
type CallRecording    = { call_sid: string; recording_sid: string; duration_seconds: number | null }

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtCallTime(iso: string) {
  const d = new Date(iso), now = new Date()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today ${time}`
  if (new Date(now.getTime() - 86400000).toDateString() === d.toDateString()) return `Yesterday ${time}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + time
}

function fmtDuration(seconds: string) {
  const s = parseInt(seconds, 10)
  if (!s) return '< 1s'
  const m = Math.floor(s / 60), r = s % 60
  if (m === 0) return `${r}s`; if (r === 0) return `${m} min`; return `${m} min ${r}s`
}

function normalizePhone(p: string) { return p.replace(/\D/g, '').slice(-10) }
function isMissed(status: string)  { return ['no-answer', 'busy', 'failed', 'canceled'].includes(status) }

function getDirection(call: TwilioCall, orgNums: Set<string>): 'inbound' | 'outbound' {
  return orgNums.has(normalizePhone(call.to)) ? 'inbound' : 'outbound'
}
function getCallerNumber(call: TwilioCall, dir: 'inbound' | 'outbound') { return dir === 'inbound' ? call.from : call.to }
function getBusinessLine(call: TwilioCall, dir: 'inbound' | 'outbound') { return dir === 'inbound' ? call.to : call.from }

function exportCsv(calls: TwilioCall[], customers: Customer[], orgNums: Set<string>) {
  const rows = [['Status','Direction','Contact','Number','Business Line','Time','Duration']]
  for (const c of calls) {
    const dir = getDirection(c, orgNums), callerNum = getCallerNumber(c, dir)
    const matched = customers.find((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum))
    rows.push([c.status, dir, matched?.name ?? '', callerNum, getBusinessLine(c, dir), c.startTime ? fmtDate(c.startTime) : '', fmtDuration(c.duration)])
  }
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `calls-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click()
}

// ─── Recipient picker ──────────────────────────────────────────────────────

type RecipientMode = 'phone' | 'email'

function RecipientPicker({ customers, value, onChange, mode, placeholder }: {
  customers: Customer[]; value: string; onChange: (v: string, c?: Customer) => void; mode: RecipientMode; placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const q = value.toLowerCase()
  const matches = customers.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q)).slice(0, 8)
  const hasVal = (c: Customer) => mode === 'phone' ? !!c.phone : !!c.email
  return (
    <div ref={ref} className="relative">
      <Input placeholder={placeholder ?? (mode === 'phone' ? '+1 (555) 000-0000' : 'email@example.com')} value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} autoComplete="off" />
      {open && (
        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-52">
          {matches.length === 0
            ? <p className="px-3 py-2 text-xs text-muted-foreground">No customers match</p>
            : matches.map((c) => {
              const capable = hasVal(c), detail = mode === 'phone' ? c.phone : c.email
              return (
                <button key={c.id} type="button" disabled={!capable}
                  onClick={() => { if (capable) { onChange(detail!, c); setOpen(false) } }}
                  className={cn('w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-muted/50',
                    !capable && 'opacity-40 cursor-not-allowed hover:bg-transparent')}
                >
                  <span className="font-medium truncate">{c.name}</span>
                  {detail
                    ? <span className="text-xs text-muted-foreground font-mono shrink-0">{detail}</span>
                    : <span className="text-xs text-muted-foreground shrink-0">No {mode === 'phone' ? 'phone' : 'email'}</span>}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ─── Recording audio player ────────────────────────────────────────────────

function RecordingPlayer({ sid }: { sid: string }) {
  const [playing, setPlaying] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play().catch(() => toast.error('Could not play recording')); setPlaying(true) }
  }
  return (
    <div className="flex items-center gap-1.5">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={`/api/twilio/recording/${sid}`} onEnded={() => setPlaying(false)} preload="none" />
      <button type="button" onClick={toggle}
        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export default function CommunicationsPage() {
  const [tab, setTab]       = React.useState<Tab>('calls')
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const [orgId, setOrgId] = React.useState<string | null>(null)
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('organization_members').select('organization_id').eq('user_id', user.id).eq('status', 'active').maybeSingle()
        .then(({ data: mem }) => { if (mem) setOrgId(mem.organization_id) })
    })
  }, [])

  // ── Phone Numbers ────────────────────────────────────────────────────────
  const [areaCode, setAreaCode]                 = React.useState('')
  const [searching, setSearching]               = React.useState(false)
  const [searchResults, setSearchResults]       = React.useState<AvailableNumber[]>([])
  const [searchError, setSearchError]           = React.useState('')
  const [purchasedNumbers, setPurchasedNumbers] = React.useState<PurchasedNumber[]>([])
  const [buying, setBuying]                     = React.useState<string | null>(null)
  const [releasing, setReleasing]               = React.useState<string | null>(null)

  // ── Texting ──────────────────────────────────────────────────────────────
  const [textMessages, setTextMessages]         = React.useState<TextMessage[]>([])
  const [customers, setCustomers]               = React.useState<Customer[]>([])
  const [textModalOpen, setTextModalOpen]       = React.useState(false)
  const [textCustomer, setTextCustomer]         = React.useState('')
  const [textTo, setTextTo]                     = React.useState('')
  const [textBody, setTextBody]                 = React.useState('')
  const [sendingText, setSendingText]           = React.useState(false)
  const [textError, setTextError]               = React.useState('')

  // ── Calls ────────────────────────────────────────────────────────────────
  const [calls, setCalls]                       = React.useState<TwilioCall[]>([])
  const [loadingCalls, setLoadingCalls]         = React.useState(false)
  const [callsError, setCallsError]             = React.useState('')
  const [callSearch, setCallSearch]             = React.useState('')
  const [callFilter, setCallFilter]             = React.useState<CallFilter>('all')
  const [callDateRange, setCallDateRange]       = React.useState('all')
  const [callPage, setCallPage]                 = React.useState(1)

  // ── Call recordings ───────────────────────────────────────────────────────
  const [recordings, setRecordings]             = React.useState<Map<string, CallRecording>>(new Map())

  // ── Add customer dialog ───────────────────────────────────────────────────
  const [addCustOpen, setAddCustOpen]           = React.useState(false)
  const [addCustPhone, setAddCustPhone]         = React.useState('')
  const [addCustName, setAddCustName]           = React.useState('')
  const [addCustEmail, setAddCustEmail]         = React.useState('')
  const [addCustAddress, setAddCustAddress]     = React.useState('')
  const [addCustSaving, setAddCustSaving]       = React.useState(false)
  const [addCustError, setAddCustError]         = React.useState('')
  const [createdCustId, setCreatedCustId]       = React.useState<string | null>(null)
  const [createdCustName, setCreatedCustName]   = React.useState<string | null>(null)

  // ── Quick dialogs ─────────────────────────────────────────────────────────
  const [msgOpen, setMsgOpen]                   = React.useState(false)
  const [msgTo, setMsgTo]                       = React.useState('')
  const [msgFrom, setMsgFrom]                   = React.useState('')
  const [msgBody, setMsgBody]                   = React.useState('')
  const [msgSending, setMsgSending]             = React.useState(false)
  const [msgError, setMsgError]                 = React.useState('')

  const [emailOpen, setEmailOpen]               = React.useState(false)
  const [emailTo, setEmailTo]                   = React.useState('')
  const [emailSubject, setEmailSubject]         = React.useState('')
  const [emailBody, setEmailBody]               = React.useState('')
  const [emailSending, setEmailSending]         = React.useState(false)
  const [emailError, setEmailError]             = React.useState('')

  const [callDialogOpen, setCallDialogOpen]     = React.useState(false)
  const [callDialogTo, setCallDialogTo]         = React.useState('')
  const [callDialogToName, setCallDialogToName] = React.useState<string | undefined>()
  const [callDialogFrom, setCallDialogFrom]     = React.useState('')

  // ── Dialer ────────────────────────────────────────────────────────────────
  const dialer = useDialer()

  // ── Derived ───────────────────────────────────────────────────────────────
  const orgNumberSet = React.useMemo(
    () => new Set(purchasedNumbers.map((n) => normalizePhone(n.phone_number))),
    [purchasedNumbers],
  )

  React.useEffect(() => {
    if (purchasedNumbers.length > 0 && !msgFrom) setMsgFrom(purchasedNumbers[0].phone_number)
    if (purchasedNumbers.length > 0 && !callDialogFrom) setCallDialogFrom(purchasedNumbers[0].phone_number)
  }, [purchasedNumbers]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh calls after a call ends ──────────────────────────────────────
  const prevDialerState = React.useRef(dialer.state)
  React.useEffect(() => {
    if (prevDialerState.current !== 'idle' && dialer.state === 'ended') fetchCalls()
    prevDialerState.current = dialer.state
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loading ──────────────────────────────────────────────────────────

  const fetchPurchasedNumbers = React.useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase.from('phone_numbers').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
    if (data) setPurchasedNumbers(data)
  }, [orgId])

  const fetchTextMessages = React.useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase.from('text_messages').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100)
    if (data) setTextMessages(data)
  }, [orgId])

  const fetchCustomers = React.useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase.from('customers').select('id, name, phone, email').eq('organization_id', orgId).order('name')
    if (data) setCustomers(data)
  }, [orgId])

  const fetchCalls = React.useCallback(async () => {
    setLoadingCalls(true); setCallsError('')
    try {
      const res = await fetch('/api/twilio/list-calls')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load calls.')
      setCalls(data.calls)
    } catch (err) { setCallsError((err as Error).message) }
    finally { setLoadingCalls(false) }
  }, [])

  const fetchRecordings = React.useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase.from('call_recordings').select('call_sid, recording_sid, duration_seconds').eq('org_id', orgId).not('recording_sid', 'is', null)
    if (data) setRecordings(new Map(data.map((r) => [r.call_sid, r as CallRecording])))
  }, [orgId])

  React.useEffect(() => { fetchPurchasedNumbers(); fetchTextMessages(); fetchCustomers() }, [fetchPurchasedNumbers, fetchTextMessages, fetchCustomers])
  React.useEffect(() => { if (tab === 'calls') { fetchCalls(); fetchRecordings() } }, [tab, fetchCalls, fetchRecordings])

  // ── Phone number handlers ─────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!/^\d{3}$/.test(areaCode)) { setSearchError('Enter a 3-digit area code.'); return }
    setSearching(true); setSearchError(''); setSearchResults([])
    try {
      const res = await fetch(`/api/twilio/search-numbers?areaCode=${areaCode}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed.')
      setSearchResults(data.numbers)
      if (!data.numbers.length) setSearchError('No numbers available for that area code.')
    } catch (err) { setSearchError((err as Error).message) }
    finally { setSearching(false) }
  }

  const handleBuy = async (phoneNumber: string) => {
    setBuying(phoneNumber)
    try {
      const res = await fetch('/api/twilio/buy-number', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Purchase failed.')
      setSearchResults([]); setAreaCode(''); await fetchPurchasedNumbers(); toast.success('Phone number purchased')
    } catch (err) { setSearchError((err as Error).message) }
    finally { setBuying(null) }
  }

  const handleRelease = async (num: PurchasedNumber) => {
    if (!window.confirm(`Release ${num.friendly_name ?? num.phone_number}? This cannot be undone.`)) return
    setReleasing(num.id)
    try {
      const res = await fetch('/api/twilio/release-number', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ twilioSid: num.twilio_sid, phoneNumberId: num.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Release failed.')
      await fetchPurchasedNumbers(); toast.success('Number released')
    } catch (err) { toast.error((err as Error).message) }
    finally { setReleasing(null) }
  }

  // ── Text handlers ─────────────────────────────────────────────────────────

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value; setTextCustomer(id)
    setTextTo(customers.find((c) => c.id === id)?.phone ?? '')
  }

  const handleSendText = async () => {
    if (!textTo.trim()) { setTextError('Phone number is required.'); return }
    if (!textBody.trim()) { setTextError('Message is required.'); return }
    setSendingText(true); setTextError('')
    try {
      const customer = customers.find((c) => c.id === textCustomer)
      const res = await fetch('/api/twilio/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: textTo, body: textBody, customerId: textCustomer || null, customerName: customer?.name ?? null }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send.')
      setTextModalOpen(false); setTextCustomer(''); setTextTo(''); setTextBody('')
      await fetchTextMessages(); toast.success('Message sent')
    } catch (err) { setTextError((err as Error).message) }
    finally { setSendingText(false) }
  }

  // ── Add customer handler ───────────────────────────────────────────────────

  const openAddCust = (phone: string) => {
    setAddCustPhone(phone); setAddCustName(''); setAddCustEmail(''); setAddCustAddress('')
    setAddCustError(''); setCreatedCustId(null); setCreatedCustName(null)
    setAddCustOpen(true)
  }

  const handleAddCustomer = async () => {
    if (!addCustName.trim()) { setAddCustError('Name is required.'); return }
    setAddCustSaving(true); setAddCustError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !orgId) throw new Error('Not authenticated.')
      const { data: newCust, error } = await supabase
        .from('customers')
        .insert({ name: addCustName.trim(), email: addCustEmail.trim() || null, phone: addCustPhone, address: addCustAddress.trim() || null, user_id: user.id, organization_id: orgId })
        .select('id, name')
        .single()
      if (error || !newCust) throw new Error(error?.message ?? 'Failed to save.')
      await fetchCustomers()
      setCreatedCustId(newCust.id)
      setCreatedCustName(newCust.name)
    } catch (err) { setAddCustError((err as Error).message) }
    finally { setAddCustSaving(false) }
  }

  // ── Quick message/email handlers ───────────────────────────────────────────

  const openMsgDialog = () => {
    setMsgTo(''); setMsgBody(''); setMsgError('')
    if (purchasedNumbers.length > 0) setMsgFrom(purchasedNumbers[0].phone_number)
    setMsgOpen(true)
  }

  const handleSendMsg = async () => {
    if (!msgTo.trim()) { setMsgError('Recipient is required.'); return }
    if (!msgBody.trim()) { setMsgError('Message is required.'); return }
    if (!msgFrom) { setMsgError('Select a number to send from.'); return }
    setMsgSending(true); setMsgError('')
    try {
      const customer = customers.find((c) => c.phone && normalizePhone(c.phone) === normalizePhone(msgTo))
      const res = await fetch('/api/twilio/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: msgTo, body: msgBody, from: msgFrom, customerId: customer?.id ?? null, customerName: customer?.name ?? null }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send.')
      setMsgOpen(false); await fetchTextMessages(); toast.success('Message sent')
    } catch (err) { setMsgError((err as Error).message) }
    finally { setMsgSending(false) }
  }

  const openEmailDialog = () => { setEmailTo(''); setEmailSubject(''); setEmailBody(''); setEmailError(''); setEmailOpen(true) }

  const handleSendEmail = async () => {
    if (!emailTo.trim()) { setEmailError('Recipient is required.'); return }
    if (!emailSubject.trim()) { setEmailError('Subject is required.'); return }
    if (!emailBody.trim()) { setEmailError('Message is required.'); return }
    setEmailSending(true); setEmailError('')
    try {
      const res = await fetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send.')
      setEmailOpen(false); toast.success('Email sent')
    } catch (err) { setEmailError((err as Error).message) }
    finally { setEmailSending(false) }
  }

  // ── Call dialog handlers ──────────────────────────────────────────────────

  const openCallDialog = (prefillNumber?: string, prefillName?: string) => {
    setCallDialogTo(prefillNumber ?? '')
    setCallDialogToName(prefillName)
    if (purchasedNumbers.length > 0) setCallDialogFrom(purchasedNumbers[0].phone_number)
    // Reset dialer if it's idle/ended/error
    if (['idle', 'ended', 'error'].includes(dialer.state)) dialer.dismiss()
    setCallDialogOpen(true)
  }

  const handleCall = async () => {
    if (!callDialogTo.trim()) return
    const contact: DialerContact = { number: callDialogTo, name: callDialogToName ?? customers.find((c) => c.phone && normalizePhone(c.phone) === normalizePhone(callDialogTo))?.name }
    await dialer.call(contact, callDialogFrom)
  }

  // ── Calls filtering ───────────────────────────────────────────────────────

  const filteredCalls = React.useMemo(() => {
    let list = calls
    if (callDateRange !== 'all') {
      const now = Date.now()
      const ms = callDateRange === 'today' ? 86400000 : callDateRange === '7d' ? 7 * 86400000 : 30 * 86400000
      list = list.filter((c) => c.startTime && now - new Date(c.startTime).getTime() < ms)
    }
    if (callFilter !== 'all') {
      list = list.filter((c) => {
        const dir = getDirection(c, orgNumberSet)
        if (callFilter === 'missed')      return isMissed(c.status) && dir === 'inbound'
        if (callFilter === 'answered')    return c.status === 'completed'
        if (callFilter === 'outbound')    return dir === 'outbound'
        if (callFilter === 'new-callers') {
          const n = getCallerNumber(c, dir)
          return !customers.some((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(n))
        }
        return true
      })
    }
    if (callSearch.trim()) {
      const q = callSearch.toLowerCase()
      list = list.filter((c) => {
        const dir = getDirection(c, orgNumberSet), n = getCallerNumber(c, dir)
        const matched = customers.find((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(n))
        return n.toLowerCase().includes(q) || (matched?.name.toLowerCase().includes(q) ?? false)
      })
    }
    return list
  }, [calls, callFilter, callDateRange, callSearch, customers, orgNumberSet])

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE))
  const pagedCalls = filteredCalls.slice((callPage - 1) * PAGE_SIZE, callPage * PAGE_SIZE)
  React.useEffect(() => { setCallPage(1) }, [callFilter, callDateRange, callSearch])

  // Show Recording column only when this org has at least one recording that matches a visible call
  const hasRecordings = pagedCalls.some((c) => recordings.has(c.sid))

  // ── Tab / filter config ───────────────────────────────────────────────────

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calls', label: 'Calls' }, { id: 'phone-numbers', label: 'Phone Numbers' }, { id: 'texting', label: 'Texting' },
  ]
  const filterPills: { id: CallFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'missed', label: 'Missed' }, { id: 'answered', label: 'Answered' },
    { id: 'outbound', label: 'Outbound' }, { id: 'new-callers', label: 'New callers' },
  ]

  // ── Shared dialog shell ───────────────────────────────────────────────────

  const dialogShell = (title: string, onClose: () => void, children: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )

  // ── In-call panel (used inside the call dialog) ───────────────────────────

  const inCallPanel = (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-foreground text-lg">{dialer.contact?.name ?? dialer.contact?.number ?? '—'}</p>
        {dialer.contact?.name && <p className="text-sm text-muted-foreground font-mono">{dialer.contact.number}</p>}
        <p className={cn('text-sm font-mono font-medium',
          dialer.state === 'in-call' ? 'text-green-600 dark:text-green-400'
          : dialer.state === 'connecting' ? 'text-muted-foreground'
          : 'text-muted-foreground'
        )}>
          {dialer.state === 'connecting' && 'Connecting…'}
          {dialer.state === 'ringing' && 'Ringing…'}
          {dialer.state === 'in-call' && fmtElapsed(dialer.elapsed)}
          {dialer.state === 'loading' && 'Setting up…'}
          {dialer.state === 'ended' && 'Call ended'}
          {dialer.state === 'error' && <span className="text-red-500">{dialer.errorMsg || 'Call failed'}</span>}
        </p>
      </div>

      {(['loading', 'connecting', 'ringing', 'in-call'] as const).some((s) => s === dialer.state) && (
        <div className="flex justify-center gap-4">
          <button type="button" onClick={dialer.toggleMute}
            disabled={dialer.state !== 'in-call'}
            className={cn('w-12 h-12 rounded-full border flex items-center justify-center transition-colors',
              dialer.isMuted ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground',
              dialer.state !== 'in-call' && 'opacity-40 cursor-not-allowed'
            )}>
            {dialer.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button type="button" onClick={dialer.hangUp}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}

      {(dialer.state === 'ended' || dialer.state === 'error') && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => { dialer.dismiss(); setCallDialogOpen(false) }}>Close</Button>
        </div>
      )}
    </div>
  )

  // ── Modals ────────────────────────────────────────────────────────────────

  const textModal = textModalOpen && mounted && createPortal(
    dialogShell('Send a Text', () => setTextModalOpen(false), (
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Customer (optional)</label>
          <select value={textCustomer} onChange={handleCustomerChange}
            className="w-full border border-border rounded-[12px] px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/50">
            <option value="">— Select a customer —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
          </select>
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">To</label>
          <Input placeholder="+1 (555) 000-0000" value={textTo} onChange={(e) => setTextTo(e.target.value)} /></div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Message</label>
          <textarea value={textBody} onChange={(e) => setTextBody(e.target.value)} placeholder="Type your message…" rows={4}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{textBody.length} chars</p>
        </div>
        {textError && <p className="text-sm text-red-500">{textError}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={() => setTextModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSendText} disabled={sendingText} className="gap-2">
            {sendingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingText ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    )), document.body,
  )

  const addCustModal = addCustOpen && mounted && createPortal(
    dialogShell(
      createdCustId ? 'Customer Added' : 'Add Customer',
      () => { setAddCustOpen(false); setCreatedCustId(null); setCreatedCustName(null) },
      createdCustId ? (
        /* ── Success step ── */
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Customer added!</p>
            <p className="text-sm text-muted-foreground mt-1">What would you like to do next?</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <a
              href={`/dashboard/jobs/new?customerId=${createdCustId}`}
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              Create job for {createdCustName}
            </a>
            <a
              href={`/dashboard/estimates/new?customerId=${createdCustId}`}
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <FileText className="w-4 h-4" />
              Create estimate for {createdCustName}
            </a>
          </div>
          <button
            type="button"
            onClick={() => { setAddCustOpen(false); setCreatedCustId(null); setCreatedCustName(null) }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Done, back to customers
          </button>
        </div>
      ) : (
        /* ── Form ── */
        <div className="space-y-3">
          <div><label className="text-sm font-medium mb-1.5 block">Phone</label>
            <Input value={addCustPhone} readOnly className="bg-muted/40 text-muted-foreground" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Name <span className="text-red-500">*</span></label>
            <Input placeholder="Full name" value={addCustName} onChange={(e) => setAddCustName(e.target.value)} autoFocus /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input placeholder="email@example.com" value={addCustEmail} onChange={(e) => setAddCustEmail(e.target.value)} /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Address</label>
            <Input placeholder="123 Main St" value={addCustAddress} onChange={(e) => setAddCustAddress(e.target.value)} /></div>
          {addCustError && <p className="text-sm text-red-500">{addCustError}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => setAddCustOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCustomer} disabled={addCustSaving} className="gap-2">
              {addCustSaving && <Loader2 className="w-4 h-4 animate-spin" />}Save Customer
            </Button>
          </div>
        </div>
      )
    ), document.body,
  )

  const msgModal = msgOpen && mounted && createPortal(
    dialogShell('Send a Text', () => setMsgOpen(false), (
      purchasedNumbers.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">You need a phone number to send texts.</p>
          <Button variant="outline" className="w-full" onClick={() => { setMsgOpen(false); setTab('phone-numbers') }}>Buy a number in Phone Numbers tab</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div><label className="text-sm font-medium mb-1.5 block">To</label>
            <RecipientPicker customers={customers} value={msgTo} onChange={(v) => setMsgTo(v)} mode="phone" /></div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Send from</label>
            <select value={msgFrom} onChange={(e) => setMsgFrom(e.target.value)}
              className="w-full border border-border rounded-[12px] px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/50">
              {purchasedNumbers.map((n) => <option key={n.id} value={n.phone_number}>{n.friendly_name ?? n.phone_number}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Message</label>
            <textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Type your message…" rows={4}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <p className="text-xs text-muted-foreground mt-1 text-right">{msgBody.length} chars</p>
          </div>
          {msgError && <p className="text-sm text-red-500">{msgError}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => setMsgOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMsg} disabled={msgSending} className="gap-2">
              {msgSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {msgSending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
      )
    )), document.body,
  )

  const emailModal = emailOpen && mounted && createPortal(
    dialogShell('Send an Email', () => setEmailOpen(false), (
      <div className="space-y-3">
        <div><label className="text-sm font-medium mb-1.5 block">To</label>
          <RecipientPicker customers={customers} value={emailTo} onChange={(v) => setEmailTo(v)} mode="email" /></div>
        <div><label className="text-sm font-medium mb-1.5 block">Subject</label>
          <Input placeholder="Subject line" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /></div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Message</label>
          <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Type your message…" rows={5}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>
        {emailError && <p className="text-sm text-red-500">{emailError}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
          <Button onClick={handleSendEmail} disabled={emailSending} className="gap-2">
            {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {emailSending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    )), document.body,
  )

  // ── Call dialog ───────────────────────────────────────────────────────────

  const isActiveCall = ['loading', 'connecting', 'ringing', 'in-call'].includes(dialer.state)
  const callDialogTitle =
    dialer.state === 'in-call'  ? 'In Call' :
    isActiveCall                ? 'Calling…' :
    dialer.state === 'ended'    ? 'Call Ended' :
    dialer.state === 'error'    ? 'Call Failed' : 'Make a Call'

  const callModal = callDialogOpen && mounted && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={() => setCallDialogOpen(false)} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{callDialogTitle}</h2>
          <button onClick={() => setCallDialogOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Not-configured state */}
        {dialer.state === 'error' && dialer.errorMsg.toLowerCase().includes('not configured') ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Calling isn&apos;t set up yet. Add the required Twilio Voice env vars to enable browser calling.</p>
            <Button variant="outline" className="w-full" onClick={() => { dialer.dismiss(); setCallDialogOpen(false) }}>Close</Button>
          </div>
        ) : isActiveCall || dialer.state === 'ended' || dialer.state === 'error' ? (
          inCallPanel
        ) : (
          /* Idle form */
          purchasedNumbers.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">You need a phone number to make calls.</p>
              <Button variant="outline" className="w-full" onClick={() => { setCallDialogOpen(false); setTab('phone-numbers') }}>Buy a number in Phone Numbers tab</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Call</label>
                <RecipientPicker customers={customers} value={callDialogTo}
                  onChange={(v, c) => { setCallDialogTo(v); setCallDialogToName(c?.name) }} mode="phone" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Call from</label>
                <select value={callDialogFrom} onChange={(e) => setCallDialogFrom(e.target.value)}
                  className="w-full border border-border rounded-[12px] px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/50">
                  {purchasedNumbers.map((n) => <option key={n.id} value={n.phone_number}>{n.friendly_name ?? n.phone_number}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => setCallDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCall} disabled={!callDialogTo.trim()} className="gap-2">
                  <Phone className="w-4 h-4" />Call
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>,
    document.body,
  )

  // ── Floating dialer bar ───────────────────────────────────────────────────

  const floatingBar = isActiveCall && !callDialogOpen && mounted && createPortal(
    <div className="fixed bottom-4 right-4 z-40 bg-background border border-border rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 min-w-[260px]">
      <div className={cn('w-2 h-2 rounded-full shrink-0',
        dialer.state === 'in-call' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{dialer.contact?.name ?? dialer.contact?.number ?? '…'}</p>
        <p className="text-xs text-muted-foreground">
          {dialer.state === 'in-call' ? fmtElapsed(dialer.elapsed) : dialer.state === 'connecting' ? 'Connecting…' : 'Ringing…'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={dialer.toggleMute} disabled={dialer.state !== 'in-call'}
          className={cn('w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
            dialer.isMuted ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground',
            dialer.state !== 'in-call' && 'opacity-40 cursor-not-allowed'
          )}>
          {dialer.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={dialer.hangUp}
          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => setCallDialogOpen(true)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>,
    document.body,
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {textModal}{addCustModal}{msgModal}{emailModal}{callModal}{floatingBar}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Calls, texts and phone numbers in one place</p>
        </div>
        <div className="flex gap-2 shrink-0 mt-0.5">
          {[
            { icon: MessageSquare, label: 'Text',  onClick: openMsgDialog },
            { icon: Mail,         label: 'Email', onClick: openEmailDialog },
            { icon: Phone,        label: 'Call',  onClick: () => openCallDialog() },
          ].map(({ icon: Icon, label, onClick }) => (
            <div key={label} className="relative group">
              <button type="button" onClick={onClick}
                className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground">
                <Icon className="w-4 h-4" />
              </button>
              <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-foreground text-background rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pill tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background text-foreground border border-border hover:bg-muted/60'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Calls tab ──────────────────────────────────────────────────────── */}
      {tab === 'calls' && (
        <Card>
          {/* Toolbar */}
          <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search calls…" value={callSearch} onChange={(e) => setCallSearch(e.target.value)} className="pl-8" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {filterPills.map((f) => (
                <button key={f.id} type="button" onClick={() => setCallFilter(f.id)}
                  className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    callFilter === f.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
            <select value={callDateRange} onChange={(e) => setCallDateRange(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground">
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            {filteredCalls.length > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5 ml-auto" onClick={() => exportCsv(filteredCalls, customers, orgNumberSet)}>
                <Download className="w-3.5 h-3.5" />Export CSV
              </Button>
            )}
          </div>

          {loadingCalls ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />)}</div>
          ) : callsError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-red-500">{callsError}</p>
              <Button variant="outline" size="sm" onClick={fetchCalls}>Retry</Button>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Phone className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {calls.length === 0 ? 'No calls yet. Calls to your business numbers will show up here.' : 'No calls match the current filters.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-10" />
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Time &amp; Duration</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Business Line</th>
                      {hasRecordings && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Recording</th>}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCalls.map((call) => {
                      const dir = getDirection(call, orgNumberSet)
                      const missed = isMissed(call.status) && dir === 'inbound'
                      const callerNum = getCallerNumber(call, dir)
                      const bizLine = getBusinessLine(call, dir)
                      const bizLabel = purchasedNumbers.find((n) => normalizePhone(n.phone_number) === normalizePhone(bizLine))
                      const matched = customers.find((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum))
                      const rec = recordings.get(call.sid)
                      return (
                        <tr key={call.sid} className={cn('border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                          missed && 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                        )}>
                          <td className="px-4 py-3">
                            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center',
                              missed ? 'bg-red-100 dark:bg-red-900/40' : dir === 'inbound' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-blue-100 dark:bg-blue-900/40'
                            )}>
                              {missed ? <PhoneMissed className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                : dir === 'inbound' ? <PhoneIncoming className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                : <PhoneOutgoing className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {matched ? (
                              <div>
                                <p className="font-medium text-foreground">{matched.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{callerNum}</p>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <div>
                                  <p className="font-mono text-sm text-foreground">{callerNum}</p>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">New caller</span>
                                </div>
                                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => openAddCust(callerNum)}>Add customer</Button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-foreground">{call.startTime ? fmtCallTime(call.startTime) : '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {missed
                                ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">Missed</span>
                                : fmtDuration(call.duration)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-foreground">{bizLabel?.friendly_name ?? bizLabel?.phone_number ?? bizLine}</p>
                          </td>
                          {hasRecordings && (
                            <td className="px-4 py-3">
                              {rec?.recording_sid ? <RecordingPlayer sid={rec.recording_sid} /> : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 justify-end">
                              {matched && (
                                <>
                                  <a href={`/dashboard/jobs/new?customerId=${matched.id}`}
                                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap">
                                    <Briefcase className="w-3 h-3" />Add job
                                  </a>
                                  <a href={`/dashboard/estimates/new?customerId=${matched.id}`}
                                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap">
                                    <FileText className="w-3 h-3" />Estimate
                                  </a>
                                </>
                              )}
                              <button type="button" title="Call back"
                                onClick={() => openCallDialog(callerNum, matched?.name)}
                                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">
                                <PhoneCall className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {pagedCalls.map((call) => {
                  const dir = getDirection(call, orgNumberSet)
                  const missed = isMissed(call.status) && dir === 'inbound'
                  const callerNum = getCallerNumber(call, dir)
                  const bizLine = getBusinessLine(call, dir)
                  const bizLabel = purchasedNumbers.find((n) => normalizePhone(n.phone_number) === normalizePhone(bizLine))
                  const matched = customers.find((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum))
                  const rec = recordings.get(call.sid)
                  return (
                    <div key={call.sid} className={cn('p-4', missed && 'bg-red-50/60 dark:bg-red-950/20')}>
                      <div className="flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          missed ? 'bg-red-100 dark:bg-red-900/40' : dir === 'inbound' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-blue-100 dark:bg-blue-900/40'
                        )}>
                          {missed ? <PhoneMissed className="w-4 h-4 text-red-600 dark:text-red-400" />
                            : dir === 'inbound' ? <PhoneIncoming className="w-4 h-4 text-green-600 dark:text-green-400" />
                            : <PhoneOutgoing className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {matched ? <div><p className="font-medium">{matched.name}</p><p className="text-xs text-muted-foreground font-mono">{callerNum}</p></div>
                            : <div><p className="font-mono text-sm">{callerNum}</p>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">New caller</span></div>}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span>{call.startTime ? fmtCallTime(call.startTime) : '—'}</span>
                            {missed ? <span className="text-red-600 dark:text-red-400 font-medium">Missed</span> : <span>{fmtDuration(call.duration)}</span>}
                            <span>{bizLabel?.friendly_name ?? bizLabel?.phone_number ?? bizLine}</span>
                          </div>
                          {rec?.recording_sid && <div className="mt-2"><RecordingPlayer sid={rec.recording_sid} /></div>}
                        </div>
                        <div className="flex flex-col gap-1.5 items-end shrink-0">
                          {matched ? (
                            <>
                              <a href={`/dashboard/jobs/new?customerId=${matched.id}`}
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                                <Briefcase className="w-3 h-3" />Add job
                              </a>
                              <a href={`/dashboard/estimates/new?customerId=${matched.id}`}
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                                <FileText className="w-3 h-3" />Estimate
                              </a>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => openAddCust(callerNum)}>Add</Button>
                          )}
                          <button type="button" onClick={() => openCallDialog(callerNum, matched?.name)}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {((callPage - 1) * PAGE_SIZE) + 1}–{Math.min(callPage * PAGE_SIZE, filteredCalls.length)} of {filteredCalls.length}
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={callPage === 1} onClick={() => setCallPage((p) => p - 1)} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" disabled={callPage === totalPages} onClick={() => setCallPage((p) => p + 1)} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Phone Numbers tab ──────────────────────────────────────────────── */}
      {tab === 'phone-numbers' && (
        <Card>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Search available numbers</h3>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="Area code (e.g. 415)" value={areaCode}
                  onChange={(e) => { setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3)); setSearchError(''); setSearchResults([]) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()} maxLength={3} />
                <Button onClick={handleSearch} disabled={searching} className="gap-2 shrink-0">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Search
                </Button>
              </div>
              {searchError && <p className="text-sm text-red-500 mt-2">{searchError}</p>}
            </div>
            {searchResults.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Available numbers</h3>
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                  {searchResults.map((n) => (
                    <div key={n.phoneNumber} className="flex items-center justify-between px-4 py-3">
                      <div><p className="text-sm font-medium">{n.friendlyName}</p><p className="text-xs text-muted-foreground font-mono">{n.phoneNumber}</p></div>
                      <Button size="sm" disabled={buying === n.phoneNumber} onClick={() => handleBuy(n.phoneNumber)} className="gap-1.5">
                        {buying === n.phoneNumber && <Loader2 className="w-3 h-3 animate-spin" />}Buy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold mb-3">Your numbers</h3>
              {purchasedNumbers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-lg gap-2">
                  <Phone className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No numbers purchased yet. Search above to get started.</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                  {purchasedNumbers.map((num) => (
                    <div key={num.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{num.friendly_name ?? num.phone_number}</p>
                        <p className="text-xs text-muted-foreground font-mono">{num.phone_number}</p>
                        <p className="text-xs text-muted-foreground">Added {fmtDate(num.created_at)}</p>
                      </div>
                      <Button size="sm" variant="ghost" disabled={releasing === num.id} onClick={() => handleRelease(num)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        {releasing === num.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Release'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Texting tab ────────────────────────────────────────────────────── */}
      {tab === 'texting' && (
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <p className="text-sm text-muted-foreground">{textMessages.length} message{textMessages.length !== 1 ? 's' : ''}</p>
            <Button size="sm" className="gap-2" onClick={() => { setTextModalOpen(true); setTextError('') }}>
              <MessageSquare className="w-4 h-4" />Send a Text
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Time','Customer','To','Message','Status'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {textMessages.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No text messages yet.</p>
                    </div>
                  </td></tr>
                ) : textMessages.map((msg) => (
                  <tr key={msg.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(msg.created_at)}</td>
                    <td className="px-6 py-3">{msg.customer_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{msg.to_number}</td>
                    <td className="px-6 py-3 max-w-xs"><p className="truncate text-foreground">{msg.body}</p></td>
                    <td className="px-6 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                        msg.status === 'delivered' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        msg.status === 'failed'    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      )}>{msg.status ?? 'sent'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
