'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, PhoneCall, MessageSquare, Search, Loader2, X, Send } from 'lucide-react'
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtDuration(seconds: string) {
  const s = parseInt(seconds, 10)
  if (!s) return '0s'
  const m = Math.floor(s / 60)
  const r = s % 60
  return m ? `${m}m ${r}s` : `${r}s`
}

const CALL_STATUS_STYLE: Record<string, string> = {
  completed:  'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'no-answer': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  busy:       'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  failed:     'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  canceled:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function CommunicationsPage() {
  const [tab, setTab] = React.useState<Tab>('calls')
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

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

  // ── Quick Call ───────────────────────────────────────────────────────────
  const [quickCallOpen, setQuickCallOpen]     = React.useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────

  const fetchPurchasedNumbers = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setPurchasedNumbers(data)
  }, [])

  const fetchTextMessages = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('text_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setTextMessages(data)
  }, [])

  const fetchCustomers = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .order('name')
    if (data) setCustomers(data)
  }, [])

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
    } catch (err) {
      alert((err as Error).message)
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
    } catch (err) {
      setTextError((err as Error).message)
    } finally {
      setSendingText(false)
    }
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calls',         label: 'Calls' },
    { id: 'phone-numbers', label: 'Phone Numbers' },
    { id: 'texting',       label: 'Texting' },
  ]

  // ── Modals ────────────────────────────────────────────────────────────────

  const textModal = textModalOpen && mounted && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setTextModalOpen(false)} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Send a Text</h2>
          <button onClick={() => setTextModalOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Customer (optional)</label>
            <select
              value={textCustomer}
              onChange={handleCustomerChange}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">To</label>
            <Input
              placeholder="+1 (555) 000-0000"
              value={textTo}
              onChange={(e) => setTextTo(e.target.value)}
            />
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

  const quickCallModal = quickCallOpen && mounted && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setQuickCallOpen(false)} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Quick Call</h2>
          <button onClick={() => setQuickCallOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium">To make calls, dial from your Twilio number:</p>
            <p className="text-base font-semibold mt-0.5">
              {purchasedNumbers[0]?.friendly_name ?? purchasedNumbers[0]?.phone_number ?? 'No number purchased yet'}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Browser-based calling with the Twilio Voice SDK will be available in a future update. For now, use your Twilio number from any phone or SIP client.
        </p>

        <Button variant="outline" className="w-full" onClick={() => setQuickCallOpen(false)}>Close</Button>
      </div>
    </div>,
    document.body,
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {textModal}
      {quickCallModal}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Messaging and calling for your team</p>
        </div>
        <Button className="gap-2" onClick={() => setQuickCallOpen(true)}>
          <PhoneCall className="w-4 h-4" />
          Quick Call
        </Button>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Messaging &amp; calling</p>
              <p className="text-sm text-muted-foreground">Make calls, send texts, and manage your phone numbers all in one place.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs card */}
      <Card className="overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Calls tab ─────────────────────────────────────────────────── */}
        {tab === 'calls' && (
          <div>
            {loadingCalls ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : callsError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-sm text-red-500">{callsError}</p>
                <Button variant="outline" size="sm" onClick={fetchCalls}>Retry</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Status', 'From', 'To', 'Time', 'Duration'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calls.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Phone className="w-10 h-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No calls yet.</p>
                          </div>
                        </td>
                      </tr>
                    ) : calls.map((call) => (
                      <tr key={call.sid} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                            CALL_STATUS_STYLE[call.status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          )}>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{call.from}</td>
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{call.to}</td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {call.startTime ? fmtDate(call.startTime) : '—'}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{fmtDuration(call.duration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Phone Numbers tab ──────────────────────────────────────────── */}
        {tab === 'phone-numbers' && (
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

            {/* Search results */}
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

            {/* Purchased numbers */}
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
        )}

        {/* ── Texting tab ────────────────────────────────────────────────── */}
        {tab === 'texting' && (
          <div>
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
          </div>
        )}
      </Card>
    </div>
  )
}
