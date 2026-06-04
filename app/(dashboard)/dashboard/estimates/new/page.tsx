'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
}

type PricebookItem = {
  id: string
  name: string
  description: string | null
  price: number
  unit: string | null
}

type LineItem = {
  _id: string
  pricebook_item_id: string | null
  name: string
  description: string
  quantity: number
  unit_price: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2)
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function NewEstimatePage() {
  const router = useRouter()

  // Customer
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('')
  const [customerName, setCustomerName] = React.useState('')
  const [customerEmail, setCustomerEmail] = React.useState('')
  const [customerPhone, setCustomerPhone] = React.useState('')
  const [customerAddress, setCustomerAddress] = React.useState('')

  // Pricebook
  const [pricebook, setPricebook] = React.useState<PricebookItem[]>([])
  const [pbSearch, setPbSearch] = React.useState('')
  const [pbOpen, setPbOpen] = React.useState(false)
  const pbDropdownRef = React.useRef<HTMLDivElement>(null)

  // Line items
  const [lineItems, setLineItems] = React.useState<LineItem[]>([])

  // Pricing modifiers
  const [markupPct, setMarkupPct] = React.useState('')
  const [taxPct, setTaxPct] = React.useState('')
  const [discount, setDiscount] = React.useState('')

  // Notes
  const [notes, setNotes] = React.useState('')
  const [internalNotes, setInternalNotes] = React.useState('')

  // Payment options
  const [requirePayment, setRequirePayment] = React.useState(false)
  const [paymentType, setPaymentType] = React.useState<'full' | 'deposit'>('full')
  const [depositPct, setDepositPct] = React.useState('50')

  // Save state
  const [saving, setSaving] = React.useState<'draft' | 'sent' | null>(null)
  const [error, setError] = React.useState('')

  // ─── Load data ────────────────────────────────────────────────────────────

  React.useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [custRes, pbRes] = await Promise.all([
        supabase.from('customers').select('id, name, email, phone, address').eq('user_id', user.id).order('name'),
        supabase.from('pricebook').select('id, name, description, price, unit').eq('user_id', user.id).order('name'),
      ])
      if (custRes.data) setCustomers(custRes.data)
      if (pbRes.data) setPricebook(pbRes.data)
    }
    load()
  }, [])

  // Close pricebook dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!pbDropdownRef.current?.contains(e.target as Node)) setPbOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Customer ─────────────────────────────────────────────────────────────

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id)
    const c = customers.find((c) => c.id === id)
    if (c) {
      setCustomerName(c.name)
      setCustomerEmail(c.email ?? '')
      setCustomerPhone(c.phone ?? '')
      setCustomerAddress(c.address ?? '')
    }
  }

  // ─── Pricebook search ─────────────────────────────────────────────────────

  const pbFiltered = React.useMemo(() => {
    const q = pbSearch.toLowerCase().trim()
    if (!q) return pricebook
    return pricebook.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
    )
  }, [pricebook, pbSearch])

  const addFromPricebook = (item: PricebookItem) => {
    setLineItems((prev) => [
      ...prev,
      { _id: genId(), pricebook_item_id: item.id, name: item.name, description: item.description ?? '', quantity: 1, unit_price: item.price },
    ])
    setPbSearch('')
    setPbOpen(false)
  }

  const addManualItem = () => {
    setLineItems((prev) => [
      ...prev,
      { _id: genId(), pricebook_item_id: null, name: '', description: '', quantity: 1, unit_price: 0 },
    ])
  }

  const updateLineItem = (id: string, field: keyof Omit<LineItem, '_id' | 'pricebook_item_id'>, value: string | number) => {
    setLineItems((prev) => prev.map((item) => item._id === id ? { ...item, [field]: value } : item))
  }

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item._id !== id))
  }

  // ─── Calculations ─────────────────────────────────────────────────────────

  const rawSubtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const markup = parseFloat(markupPct) || 0
  const tax = parseFloat(taxPct) || 0
  const disc = parseFloat(discount) || 0
  const afterMarkup = rawSubtotal * (1 + markup / 100)
  const afterTax = afterMarkup * (1 + tax / 100)
  const total = Math.max(0, afterTax - disc)
  const depositAmount = total * ((parseFloat(depositPct) || 0) / 100)
  const paymentAmount = requirePayment ? (paymentType === 'full' ? total : depositAmount) : 0

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async (status: 'Draft' | 'Sent') => {
    setSaving(status === 'Draft' ? 'draft' : 'sent')
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(null); setError('Not authenticated.'); return }

    const { data: maxRes } = await supabase
      .from('estimates')
      .select('estimate_number')
      .eq('user_id', user.id)
      .order('estimate_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextNum = (maxRes?.estimate_number ?? 0) + 1

    const { data: est, error: estErr } = await supabase
      .from('estimates')
      .insert({
        user_id: user.id,
        estimate_number: nextNum,
        customer_id: selectedCustomerId || null,
        customer_name: customerName.trim() || null,
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        status,
        subtotal: rawSubtotal,
        markup_percent: markup,
        tax_percent: tax,
        discount: disc,
        total,
        notes: notes.trim() || null,
        internal_notes: internalNotes.trim() || null,
        require_payment: requirePayment,
        payment_type: paymentType,
        deposit_percent: requirePayment && paymentType === 'deposit' ? parseFloat(depositPct) || 0 : null,
      })
      .select('id')
      .single()

    if (estErr || !est) {
      setError(estErr?.message ?? 'Failed to save estimate.')
      setSaving(null)
      return
    }

    if (lineItems.length > 0) {
      const { error: liErr } = await supabase.from('estimate_line_items').insert(
        lineItems.map((item) => ({
          estimate_id: est.id,
          pricebook_item_id: item.pricebook_item_id,
          name: item.name,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }))
      )
      if (liErr) {
        await supabase.from('estimates').delete().eq('id', est.id)
        setError(liErr.message)
        setSaving(null)
        return
      }
    }

    setSaving(null)
    router.push('/dashboard/estimates')
  }

  const isSaving = saving !== null

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl mx-auto pb-28">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">New Estimate</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Build and send a new estimate to a customer</p>
      </div>

      {/* ── Customer Information ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5 flex flex-col gap-4">
          <Field label="Select Existing Customer">
            <NativeSelect value={selectedCustomerId} onChange={(e) => handleCustomerSelect(e.target.value)}>
              <option value="">— Type manually or select a customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">
              <Input placeholder="Jane Smith" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" placeholder="jane@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input type="tel" placeholder="+1 (555) 000-0000" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </Field>
            <Field label="Address">
              <Input placeholder="123 Main St, Springfield" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Line Items ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5">
          {/* Pricebook search */}
          <div className="relative mb-4" ref={pbDropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Search pricebook to add an item…"
                value={pbSearch}
                onChange={(e) => { setPbSearch(e.target.value); setPbOpen(true) }}
                onFocus={() => setPbOpen(true)}
              />
            </div>
            {pbOpen && pbSearch && pbFiltered.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg py-1 text-sm max-h-48 overflow-y-auto">
                {pbFiltered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={() => addFromPricebook(item)}
                    className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{item.name}</span>
                      {item.description && (
                        <span className="ml-2 text-muted-foreground text-xs truncate">{item.description}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground tabular-nums ml-4 shrink-0">{fmtCurrency(item.price)}</span>
                  </button>
                ))}
              </div>
            )}
            {pbOpen && pbSearch && pbFiltered.length === 0 && (
              <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg py-3 px-3 text-sm text-muted-foreground">
                No pricebook items match "{pbSearch}"
              </div>
            )}
          </div>

          {/* Line items table */}
          {lineItems.length > 0 && (
            <div className="overflow-x-auto mb-4 -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-medium text-muted-foreground px-1">Item</th>
                    <th className="text-left pb-2 font-medium text-muted-foreground px-1">Description</th>
                    <th className="text-center pb-2 font-medium text-muted-foreground px-1 w-20">Qty</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground px-1 w-28">Unit Price</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground px-1 w-24">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item._id} className="border-b border-border last:border-0">
                      <td className="py-2 px-1">
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateLineItem(item._id, 'name', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item._id, 'description', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item._id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm text-center w-20"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(item._id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm text-right w-28"
                        />
                      </td>
                      <td className="py-2 pl-2 text-right font-medium tabular-nums whitespace-nowrap text-foreground">
                        {fmtCurrency(item.quantity * item.unit_price)}
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item._id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button type="button" variant="outline" size="sm" onClick={addManualItem} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Manual Item
          </Button>
        </CardContent>
      </Card>

      {/* ── Pricing ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <Field label="Markup (%)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={markupPct}
                  onChange={(e) => setMarkupPct(e.target.value)}
                />
              </Field>
              <Field label="Tax (%)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={taxPct}
                  onChange={(e) => setTaxPct(e.target.value)}
                />
              </Field>
              <Field label="Discount ($)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-col justify-center gap-3 bg-muted/30 rounded-lg p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">{fmtCurrency(rawSubtotal)}</span>
              </div>
              {markup > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Markup ({markup}%)</span>
                  <span className="tabular-nums">{fmtCurrency(rawSubtotal * markup / 100)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({tax}%)</span>
                  <span className="tabular-nums">{fmtCurrency(afterMarkup * tax / 100)}</span>
                </div>
              )}
              {disc > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums text-green-600">−{fmtCurrency(disc)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="font-semibold text-foreground">Total</span>
                <span className="tabular-nums font-bold text-lg">{fmtCurrency(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5 flex flex-col gap-4">
          <Field label="Customer-Facing Notes">
            <textarea
              rows={3}
              placeholder="Visible to the customer on the estimate…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
          <Field label="Internal Notes">
            <textarea
              rows={3}
              placeholder="Internal use only — not shown to the customer…"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Payment Options ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Payment Options</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5 flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requirePayment}
              onChange={(e) => setRequirePayment(e.target.checked)}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <span className="text-sm font-medium text-foreground">Require payment</span>
          </label>

          {requirePayment && (
            <>
              <div className="flex gap-3">
                {(['full', 'deposit'] as const).map((type) => (
                  <label
                    key={type}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium cursor-pointer transition-colors select-none',
                      paymentType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={type}
                      checked={paymentType === type}
                      onChange={() => setPaymentType(type)}
                      className="sr-only"
                    />
                    {type === 'full' ? 'Full Payment' : 'Deposit'}
                  </label>
                ))}
              </div>

              {paymentType === 'deposit' && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Deposit %</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    {[25, 50, 75].map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant={depositPct === String(pct) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDepositPct(String(pct))}
                        className="w-14"
                      >
                        {pct}%
                      </Button>
                    ))}
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={depositPct}
                      onChange={(e) => setDepositPct(e.target.value)}
                      className="w-20 h-8 text-sm"
                    />
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground bg-muted/40 rounded-md px-4 py-3">
                Customer will pay{' '}
                <span className="font-semibold text-foreground">{fmtCurrency(paymentAmount)}</span>
                {paymentType === 'deposit' && (
                  <> of <span className="font-semibold text-foreground">{fmtCurrency(total)}</span> total</>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {/* ── Sticky action bar ── */}
      <div className="fixed bottom-0 left-60 right-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm px-8 py-4 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/dashboard/estimates')}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave('Draft')}
          disabled={isSaving}
        >
          {saving === 'draft'
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
            : 'Save Draft'}
        </Button>
        <Button
          type="button"
          onClick={() => handleSave('Sent')}
          disabled={isSaving}
        >
          {saving === 'sent'
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
            : 'Save & Send'}
        </Button>
      </div>
    </div>
  )
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
