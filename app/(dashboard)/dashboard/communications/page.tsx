'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Phone, MessageSquare, Search, Loader2, X, Send,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall,
  Download, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'calls' | 'phone-numbers' | 'texting'

type AvailableNumber = { phoneNumber: string; friendlyName: string }

type PurchasedNumber = {
  id: string
  phone_number: string
  friendly_name: string | null
  twilio_sid: string
  created_at: string
}

type TextMessage = {
  id: string
  to_number: string
  from_number: string
  body: string
  status: string | null
  customer_name: string | null
  created_at: string
}

type TwilioCall = {
  sid: string
  status: string
  from: string
  to: string
  startTime: string
  duration: string
}

type Customer = { id: string; name: string; phone: string | null }

type CallFilter = 'all' | 'missed' | 'answered' | 'outbound' | 'new-callers'

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtCallTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + time
}

function fmtDuration(seconds: string) {
  const s = parseInt(seconds, 10)
  if (!s) return '< 1s'
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r}s`
  if (r === 0) return `${m} min`
  return `${m} min ${r}s`
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-10)
}

function isMissed(status: string): boolean {
  return ['no-answer', 'busy', 'failed', 'canceled'].includes(status)
}

function getDirection(call: TwilioCall, orgNumbers: Set<string>): 'inbound' | 'outbound' {
  const toNorm = normalizePhone(call.to)
  return orgNumbers.has(toNorm) ? 'inbound' : 'outbound'
}

function getCallerNumber(call: TwilioCall, direction: 'inbound' | 'outbound'): string {
  return direction === 'inbound' ? call.from : call.to
}

function getBusinessLine(call: TwilioCall, direction: 'inbound' | 'outbound'): string {
  return direction === 'inbound' ? call.to : call.from
}

function exportCsv(calls: TwilioCall[], customers: Customer[], orgNumbers: Set<string>) {
  const rows = [['Status', 'Direction', 'Contact', 'Number', 'Business Line', 'Time', 'Duration']]
  for (const c of calls) {
    const dir = getDirection(c, orgNumbers)
    const callerNum = getCallerNumber(c, dir)
    const matched = customers.find((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum))
    rows.push([
      c.status,
      dir,
      matched?.name ?? '',
      callerNum,
      getBusinessLine(c, dir),
      c.startTime ? fmtDate(c.startTime) : '',
      fmtDuration(c.duration),
    ])
  }
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calls-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export default function CommunicationsPage() {
  const [tab, setTab] = React.useState<Tab>('calls')
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const [orgId, setOrgId] = React.useState<string | null>(null)
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
        .then(({ data: mem }) => { if (mem) setOrgId(mem.organization_id) })
    })
  }, [])

  // ── Phone Numbers ───────────────────────────────────────────────────────
  const [areaCode, setAreaCode]               = React.useState('')
  const [searching, setSearching]             = React.useState(false)
  const [searchResults, setSearchResults]     = React.useState<AvailableNumber[]>([])
  const [searchError, setSearchError]         = React.useState('')
  const [purchasedNumbers, setPurchasedNumbers] = React.useState<PurchasedNumber[]>([])
  const [buying, setBuying]                   = React.useState<string | null>(null)
  const [releasing, setReleasing]             = React.useState<string | null>(null)

  // ── Texting ─────────────────────────────────────────────────────────────
  const [textMessages, setTextMessages]       = React.useState<TextMessage[]>([])
  const [customers, setCustomers]             = React.useState<Customer[]>([])
  const [textModalOpen, setTextModalOpen]     = React.useState(false)
  const [textCustomer, setTextCustomer]       = React.useState('')
  const [textTo, setTextTo]                   = React.useState('')
  const [textBody, setTextBody]               = React.useState('')
  const [sendingText, setSendingText]         = React.useState(false)
  const [textError, setTextError]             = React.useState('')

  // ── Calls ────────────────────────────────────────────────────────────────
  const [calls, setCalls]                     = React.useState<TwilioCall[]>([])
  const [loadingCalls, setLoadingCalls]       = React.useState(false)
  const [callsError, setCallsError]           = React.useState('')
  const [callSearch, setCallSearch]           = React.useState('')
  const [callFilter, setCallFilter]           = React.useState<CallFilter>('all')
  const [callDateRange, setCallDateRange]     = React.useState('all')
  const [callPage, setCallPage]               = React.useState(1)

  // ── Add customer dialog ──────────────────────────────────────────────────
  const [addCustOpen, setAddCustOpen]         = React.useState(false)
  const [addCustPhone, setAddCustPhone]       = React.useState('')
  const [addCustName, setAddCustName]         = React.useState('')
  const [addCustEmail, setAddCustEmail]       = React.useState('')
  const [addCustAddress, setAddCustAddress]   = React.useState('')
  const [addCustSaving, setAddCustSaving]     = React.useState(false)
  const [addCustError, setAddCustError]       = React.useState('')

  // ── Derived: org phone number set ────────────────────────────────────────
  const orgNumberSet = React.useMemo(
    () => new Set(purchasedNumbers.map((n) => normalizePhone(n.phone_number))),
    [purchasedNumbers],
  )

  // ── Data loading ─────────────────────────────────────────────────────────

  const fetchPurchasedNumbers = React.useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (data) setPurchasedNumbers(data)
  }, [orgId])

  const fetchTextMessages = React.useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from('text_messages')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setTextMessages(data)
  }, [orgId])

  const fetchCustomers = React.useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('organization_id', orgId)
      .order('name')
    if (data) setCustomers(data)
  }, [orgId])

  const fetchCalls = React.useCallback(async () => {
    setLoadingCalls(true)
    setCallsError('')
    try {
      const res = await fetch('/api/twilio/list-calls')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load calls.')
      setCalls(data.calls)
    } catch (err) {
      setCallsError((err as Error).message)
    } finally {
      setLoadingCalls(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPurchasedNumbers()
    fetchTextMessages()
    fetchCustomers()
  }, [fetchPurchasedNumbers, fetchTextMessages, fetchCustomers])

  React.useEffect(() => {
    if (tab === 'calls') fetchCalls()
  }, [tab, fetchCalls])

  // ── Phone number handlers ────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!/^\d{3}$/.test(areaCode)) { setSearchError('Enter a 3-digit area code.'); return }
    setSearching(true)
    setSearchError('')
    setSearchResults([])
    try {
      const res = await fetch(`/api/twilio/search-numbers?areaCode=${areaCode}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed.')
      setSearchResults(data.numbers)
      if (!data.numbers.length) setSearchError('No numbers available for that area code.')
    } catch (err) {
      setSearchError((err as Error).message)
    } finally {
      setSearching(false)
    }
  }

  const handleBuy = async (phoneNumber: string) => {
    setBuying(phoneNumber)
    try {
      const res = await fetch('/api/twilio/buy-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Purchase failed.')
      setSearchResults([])
      setAreaCode('')
      await fetchPurchasedNumbers()
      toast.success('Phone number purchased')
    } catch (err) {
      setSearchError((err as Error).message)
    } finally {
      setBuying(null)
    }
  }

  const handleRelease = async (num: PurchasedNumber) => {
    if (!window.confirm(`Release ${num.friendly_name ?? num.phone_number}? This cannot be undone.`)) return
    setReleasing(num.id)
    try {
      const res = await fetch('/api/twilio/release-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twilioSid: num.twilio_sid, phoneNumberId: num.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Release failed.')
      await fetchPurchasedNumbers()
      toast.success('Number released')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setReleasing(null)
    }
  }

  // ── Text handlers ─────────────────────────────────────────────────────────

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setTextCustomer(id)
    const c = customers.find((c) => c.id === id)
    setTextTo(c?.phone ?? '')
  }

  const handleSendText = async () => {
    if (!textTo.trim()) { setTextError('Phone number is required.'); return }
    if (!textBody.trim()) { setTextError('Message is required.'); return }
    setSendingText(true)
    setTextError('')
    try {
      const customer = customers.find((c) => c.id === textCustomer)
      const res = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:           textTo,
          body:         textBody,
          customerId:   textCustomer || null,
          customerName: customer?.name ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send.')
      setTextModalOpen(false)
      setTextCustomer('')
      setTextTo('')
      setTextBody('')
      await fetchTextMessages()
      toast.success('Message sent')
    } catch (err) {
      setTextError((err as Error).message)
    } finally {
      setSendingText(false)
    }
  }

  // ── Add customer handler ──────────────────────────────────────────────────

  const openAddCust = (phone: string) => {
    setAddCustPhone(phone)
    setAddCustName('')
    setAddCustEmail('')
    setAddCustAddress('')
    setAddCustError('')
    setAddCustOpen(true)
  }

  const handleAddCustomer = async () => {
    if (!addCustName.trim()) { setAddCustError('Name is required.'); return }
    setAddCustSaving(true)
    setAddCustError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !orgId) throw new Error('Not authenticated.')
      const { error } = await supabase.from('customers').insert({
        name: addCustName.trim(),
        email: addCustEmail.trim() || null,
        phone: addCustPhone,
        address: addCustAddress.trim() || null,
        user_id: user.id,
        organization_id: orgId,
      })
      if (error) throw new Error(error.message)
      await fetchCustomers()
      setAddCustOpen(false)
      toast.success('Customer created')
    } catch (err) {
      setAddCustError((err as Error).message)
    } finally {
      setAddCustSaving(false)
    }
  }

  // ── Calls filtering ───────────────────────────────────────────────────────

  const filteredCalls = React.useMemo(() => {
    let list = calls

    // date range
    if (callDateRange !== 'all') {
      const now = Date.now()
      const ms = callDateRange === 'today'
        ? 86400000
        : callDateRange === '7d'
        ? 7 * 86400000
        : 30 * 86400000
      list = list.filter((c) => c.startTime && now - new Date(c.startTime).getTime() < ms)
    }

    // status filter
    if (callFilter !== 'all') {
      list = list.filter((c) => {
        const dir = getDirection(c, orgNumberSet)
        if (callFilter === 'missed')    return isMissed(c.status) && dir === 'inbound'
        if (callFilter === 'answered')  return c.status === 'completed'
        if (callFilter === 'outbound')  return dir === 'outbound'
        if (callFilter === 'new-callers') {
          const callerNum = getCallerNumber(c, dir)
          return !customers.some((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum))
        }
        return true
      })
    }

    // search
    if (callSearch.trim()) {
      const q = callSearch.toLowerCase()
      list = list.filter((c) => {
        const dir = getDirection(c, orgNumberSet)
        const callerNum = getCallerNumber(c, dir)
        const matched = customers.find((cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum))
        return (
          callerNum.toLowerCase().includes(q) ||
          (matched?.name.toLowerCase().includes(q) ?? false)
        )
      })
    }

    return list
  }, [calls, callFilter, callDateRange, callSearch, customers, orgNumberSet])

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE))
  const pagedCalls = filteredCalls.slice((callPage - 1) * PAGE_SIZE, callPage * PAGE_SIZE)

  React.useEffect(() => { setCallPage(1) }, [callFilter, callDateRange, callSearch])

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calls',         label: 'Calls' },
    { id: 'phone-numbers', label: 'Phone Numbers' },
    { id: 'texting',       label: 'Texting' },
  ]

  const filterPills: { id: CallFilter; label: string }[] = [
    { id: 'all',          label: 'All' },
    { id: 'missed',       label: 'Missed' },
    { id: 'answered',     label: 'Answered' },
    { id: 'outbound',     label: 'Outbound' },
    { id: 'new-callers',  label: 'New callers' },
  ]

  // ── Modals ────────────────────────────────────────────────────────────────

  const textModal = textModalOpen && mounted && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={() => setTextModalOpen(false)} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Send a Text</h2>
          <button onClick={() => setTextModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Customer (optional)</label>
            <select
              value={textCustomer}
              onChange={handleCustomerChange}
              className="w-full border border-border rounded-[12px] px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="">— Select a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">To</label>
            <Input placeholder="+1 (555) 000-0000" value={textTo} onChange={(e) => setTextTo(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
            <textarea
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              placeholder="Type your message…"
              rows={4}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{textBody.length} chars</p>
          </div>
          {textError && <p className="text-sm text-red-500">{textError}</p>}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={() => setTextModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSendText} disabled={sendingText} className="gap-2">
            {sendingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingText ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )

  const addCustModal = addCustOpen && mounted && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={() => setAddCustOpen(false)} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Add Customer</h2>
          <button onClick={() => setAddCustOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
            <Input value={addCustPhone} readOnly className="bg-muted/40 text-muted-foreground" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Name <span className="text-red-500">*</span></label>
            <Input
              placeholder="Full name"
              value={addCustName}
              onChange={(e) => setAddCustName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <Input placeholder="email@example.com" value={addCustEmail} onChange={(e) => setAddCustEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
            <Input placeholder="123 Main St" value={addCustAddress} onChange={(e) => setAddCustAddress(e.target.value)} />
          </div>
          {addCustError && <p className="text-sm text-red-500">{addCustError}</p>}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={() => setAddCustOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCustomer} disabled={addCustSaving} className="gap-2">
            {addCustSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Customer
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {textModal}
      {addCustModal}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Calls, texts and phone numbers in one place</p>
      </div>

      {/* Pill tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-foreground border border-border hover:bg-muted/60'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Calls tab ──────────────────────────────────────────────────────── */}
      {tab === 'calls' && (
        <Card>
          {/* Toolbar */}
          <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search calls…"
                value={callSearch}
                onChange={(e) => setCallSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1 flex-wrap">
              {filterPills.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCallFilter(f.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    callFilter === f.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Date range */}
            <select
              value={callDateRange}
              onChange={(e) => setCallDateRange(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>

            {/* Export */}
            {filteredCalls.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 ml-auto"
                onClick={() => exportCsv(filteredCalls, customers, orgNumberSet)}
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Table */}
          {loadingCalls ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : callsError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-red-500">{callsError}</p>
              <Button variant="outline" size="sm" onClick={fetchCalls}>Retry</Button>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Phone className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {calls.length === 0
                  ? 'No calls yet. Calls to your business numbers will show up here.'
                  : 'No calls match the current filters.'}
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
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCalls.map((call) => {
                      const dir = getDirection(call, orgNumberSet)
                      const missed = isMissed(call.status) && dir === 'inbound'
                      const callerNum = getCallerNumber(call, dir)
                      const bizLine = getBusinessLine(call, dir)
                      const bizLabel = purchasedNumbers.find(
                        (n) => normalizePhone(n.phone_number) === normalizePhone(bizLine)
                      )
                      const matched = customers.find(
                        (cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum)
                      )

                      return (
                        <tr
                          key={call.sid}
                          className={cn(
                            'border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                            missed && 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                          )}
                        >
                          {/* Status icon */}
                          <td className="px-4 py-3">
                            <div className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center',
                              missed        ? 'bg-red-100 dark:bg-red-900/40'
                              : dir === 'inbound'  ? 'bg-green-100 dark:bg-green-900/40'
                              : 'bg-blue-100 dark:bg-blue-900/40'
                            )}>
                              {missed
                                ? <PhoneMissed className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                : dir === 'inbound'
                                ? <PhoneIncoming className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                : <PhoneOutgoing className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              }
                            </div>
                          </td>

                          {/* Contact */}
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
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                    New caller
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  onClick={() => openAddCust(callerNum)}
                                >
                                  Add customer
                                </Button>
                              </div>
                            )}
                          </td>

                          {/* Time & Duration */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-foreground">{call.startTime ? fmtCallTime(call.startTime) : '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {missed ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                  Missed
                                </span>
                              ) : fmtDuration(call.duration)}
                            </p>
                          </td>

                          {/* Business line */}
                          <td className="px-4 py-3">
                            <p className="text-sm text-foreground">
                              {bizLabel?.friendly_name ?? bizLabel?.phone_number ?? bizLine}
                            </p>
                          </td>

                          {/* Quick action */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              title="Call back"
                              onClick={() => toast.info('Browser calling coming soon. Use your Twilio number to call back.')}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>
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
                  const bizLabel = purchasedNumbers.find(
                    (n) => normalizePhone(n.phone_number) === normalizePhone(bizLine)
                  )
                  const matched = customers.find(
                    (cu) => cu.phone && normalizePhone(cu.phone) === normalizePhone(callerNum)
                  )

                  return (
                    <div
                      key={call.sid}
                      className={cn(
                        'p-4 space-y-2',
                        missed && 'bg-red-50/60 dark:bg-red-950/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          missed        ? 'bg-red-100 dark:bg-red-900/40'
                          : dir === 'inbound'  ? 'bg-green-100 dark:bg-green-900/40'
                          : 'bg-blue-100 dark:bg-blue-900/40'
                        )}>
                          {missed
                            ? <PhoneMissed className="w-4 h-4 text-red-600 dark:text-red-400" />
                            : dir === 'inbound'
                            ? <PhoneIncoming className="w-4 h-4 text-green-600 dark:text-green-400" />
                            : <PhoneOutgoing className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          {matched ? (
                            <div>
                              <p className="font-medium text-foreground">{matched.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{callerNum}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-mono text-sm text-foreground">{callerNum}</p>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                New caller
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span>{call.startTime ? fmtCallTime(call.startTime) : '—'}</span>
                            {missed
                              ? <span className="text-red-600 dark:text-red-400 font-medium">Missed</span>
                              : <span>{fmtDuration(call.duration)}</span>
                            }
                            <span>{bizLabel?.friendly_name ?? bizLabel?.phone_number ?? bizLine}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          {!matched && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => openAddCust(callerNum)}>
                              Add
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => toast.info('Browser calling coming soon.')}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          >
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
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={callPage === 1}
                      onClick={() => setCallPage((p) => p - 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={callPage === totalPages}
                      onClick={() => setCallPage((p) => p + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
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
            {/* Search */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Search available numbers</h3>
              <div className="flex gap-2 max-w-sm">
                <Input
                  placeholder="Area code (e.g. 415)"
                  value={areaCode}
                  onChange={(e) => { setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3)); setSearchError(''); setSearchResults([]) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  maxLength={3}
                />
                <Button onClick={handleSearch} disabled={searching} className="gap-2 shrink-0">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </Button>
              </div>
              {searchError && <p className="text-sm text-red-500 mt-2">{searchError}</p>}
            </div>

            {searchResults.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Available numbers</h3>
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                  {searchResults.map((n) => (
                    <div key={n.phoneNumber} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{n.friendlyName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{n.phoneNumber}</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={buying === n.phoneNumber}
                        onClick={() => handleBuy(n.phoneNumber)}
                        className="gap-1.5"
                      >
                        {buying === n.phoneNumber && <Loader2 className="w-3 h-3 animate-spin" />}
                        Buy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Your numbers</h3>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={releasing === num.id}
                        onClick={() => handleRelease(num)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
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
              <MessageSquare className="w-4 h-4" />
              Send a Text
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Time', 'Customer', 'To', 'Message', 'Status'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {textMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No text messages yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : textMessages.map((msg) => (
                  <tr key={msg.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(msg.created_at)}</td>
                    <td className="px-6 py-3">{msg.customer_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{msg.to_number}</td>
                    <td className="px-6 py-3 max-w-xs">
                      <p className="truncate text-foreground">{msg.body}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                        msg.status === 'delivered' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        msg.status === 'failed'    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      )}>
                        {msg.status ?? 'sent'}
                      </span>
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
