'use client'

import * as React from 'react'
import Link from 'next/link'
import { use } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil, Loader2, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type EstimateStatus = 'Draft' | 'Sent' | 'Approved' | 'Declined'

type Estimate = {
  id: string
  user_id: string
  estimate_number: number
  customer_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_address: string | null
  status: EstimateStatus
  subtotal: number
  markup_percent: number
  tax_percent: number
  discount: number
  total: number
  notes: string | null
  internal_notes: string | null
  require_payment: boolean
  payment_type: 'full' | 'deposit'
  deposit_percent: number | null
  created_at: string
}

type LineItem = {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total: number
}

// ─── Constants & Helpers ───────────────────────────────────────────────────

const STATUSES: EstimateStatus[] = ['Draft', 'Sent', 'Approved', 'Declined']

const STATUS_STYLES: Record<EstimateStatus, string> = {
  Draft:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  Sent:     'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Approved: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
  Declined: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function StatusBadge({ status }: { status: EstimateStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

function fmtEstNum(n: number) {
  return `EST-${String(n).padStart(4, '0')}`
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Status dropdown (portal-based so it clears any overflow clip) ──────────

function StatusDropdown({
  status,
  onStatusChange,
  updating,
}: {
  status: EstimateStatus
  onStatusChange: (s: EstimateStatus) => void
  updating: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 6, left: rect.left })
    setOpen(true)
  }

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        disabled={updating}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {updating
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <StatusBadge status={status} />}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-40 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              role="option"
              aria-selected={s === status}
              type="button"
              onClick={() => { onStatusChange(s); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors',
                s === status && 'bg-muted/50'
              )}
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [estimate, setEstimate] = React.useState<Estimate | null>(null)
  const [lineItems, setLineItems] = React.useState<LineItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [updatingStatus, setUpdatingStatus] = React.useState(false)

  // ─── Fetch ──────────────────────────────────────────────────────────────

  React.useEffect(() => {
    const load = async () => {
      const [estRes, liRes] = await Promise.all([
        supabase
          .from('estimates')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('estimate_line_items')
          .select('id, name, description, quantity, unit_price, total')
          .eq('estimate_id', id)
          .order('id'),
      ])

      if (!estRes.data) {
        setNotFound(true)
      } else {
        setEstimate(estRes.data)
      }
      if (liRes.data) setLineItems(liRes.data)
      setLoading(false)
    }
    load()
  }, [id])

  // ─── Status update ──────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: EstimateStatus) => {
    if (!estimate || newStatus === estimate.status) return
    setUpdatingStatus(true)
    // Optimistic
    setEstimate((prev) => prev ? { ...prev, status: newStatus } : prev)
    const { error } = await supabase
      .from('estimates')
      .update({ status: newStatus })
      .eq('id', id)
    if (error) {
      // Revert on failure
      setEstimate((prev) => prev ? { ...prev, status: estimate.status } : prev)
    }
    setUpdatingStatus(false)
  }

  // ─── Derived pricing ────────────────────────────────────────────────────

  const markupAmount = estimate
    ? estimate.subtotal * (estimate.markup_percent / 100)
    : 0
  const taxBase = estimate ? estimate.subtotal + markupAmount : 0
  const taxAmount = estimate ? taxBase * (estimate.tax_percent / 100) : 0
  const depositAmount = estimate && estimate.deposit_percent
    ? estimate.total * (estimate.deposit_percent / 100)
    : 0

  // ─── Loading / not found ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading estimate…
      </div>
    )
  }

  if (notFound || !estimate) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <FileText className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Estimate not found.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/estimates">← Back to Estimates</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* Top nav bar */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard/estimates">
            <ArrowLeft className="w-4 h-4" />
            Back to Estimates
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <StatusDropdown
            status={estimate.status}
            onStatusChange={handleStatusChange}
            updating={updatingStatus}
          />
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/dashboard/estimates/${id}/edit`}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Estimate header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold text-foreground font-mono">
            {fmtEstNum(estimate.estimate_number)}
          </h1>
          <StatusBadge status={estimate.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Created {fmtDate(estimate.created_at)}
        </p>
      </div>

      {/* ── Customer Information ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5">
          {estimate.customer_name || estimate.customer_email || estimate.customer_phone || estimate.customer_address ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              {estimate.customer_name && (
                <InfoRow label="Name" value={estimate.customer_name} />
              )}
              {estimate.customer_email && (
                <InfoRow label="Email" value={estimate.customer_email} />
              )}
              {estimate.customer_phone && (
                <InfoRow label="Phone" value={estimate.customer_phone} />
              )}
              {estimate.customer_address && (
                <InfoRow label="Address" value={estimate.customer_address} className="sm:col-span-2" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">No customer information recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Line Items ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lineItems.length === 0 ? (
            <p className="px-6 py-5 text-sm text-muted-foreground/60 italic">No line items on this estimate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Item</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-center px-6 py-3 font-medium text-muted-foreground w-20">Qty</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground w-28">Unit Price</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-6 py-3 font-medium text-foreground">{item.name || <Dash />}</td>
                      <td className="px-6 py-3 text-muted-foreground max-w-[16rem] truncate" title={item.description ?? ''}>
                        {item.description || <Dash />}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-center tabular-nums">{item.quantity}</td>
                      <td className="px-6 py-3 text-muted-foreground text-right tabular-nums whitespace-nowrap">
                        {fmtCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-3 text-foreground font-medium text-right tabular-nums whitespace-nowrap">
                        {fmtCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pricing Summary ── */}
      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Pricing Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="max-w-xs ml-auto flex flex-col gap-2.5">
            <PricingRow label="Subtotal" value={fmtCurrency(estimate.subtotal)} />
            {estimate.markup_percent > 0 && (
              <PricingRow
                label={`Markup (${estimate.markup_percent}%)`}
                value={fmtCurrency(markupAmount)}
              />
            )}
            {estimate.tax_percent > 0 && (
              <PricingRow
                label={`Tax (${estimate.tax_percent}%)`}
                value={fmtCurrency(taxAmount)}
              />
            )}
            {estimate.discount > 0 && (
              <PricingRow
                label="Discount"
                value={`−${fmtCurrency(estimate.discount)}`}
                valueClassName="text-green-600"
              />
            )}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg tabular-nums">{fmtCurrency(estimate.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes ── */}
      {(estimate.notes || estimate.internal_notes) && (
        <Card className="mb-6">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-base font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-5 flex flex-col gap-5">
            {estimate.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Customer-Facing Notes
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{estimate.notes}</p>
              </div>
            )}
            {estimate.internal_notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Internal Notes
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{estimate.internal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Payment Options ── */}
      {estimate.require_payment && (
        <Card className="mb-6">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-base font-semibold">Payment Options</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-5 flex flex-col gap-3">
            <InfoRow
              label="Payment Type"
              value={estimate.payment_type === 'full' ? 'Full Payment' : 'Deposit'}
            />
            {estimate.payment_type === 'deposit' && estimate.deposit_percent != null && (
              <>
                <InfoRow
                  label="Deposit %"
                  value={`${estimate.deposit_percent}%`}
                />
                <InfoRow
                  label="Deposit Amount"
                  value={fmtCurrency(depositAmount)}
                />
              </>
            )}
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-md px-4 py-3 mt-1">
              Customer will pay{' '}
              <span className="font-semibold text-foreground">
                {fmtCurrency(estimate.payment_type === 'full' ? estimate.total : depositAmount)}
              </span>
              {estimate.payment_type === 'deposit' && (
                <> of <span className="font-semibold text-foreground">{fmtCurrency(estimate.total)}</span> total</>
              )}
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  )
}

// ─── Small display helpers ────────────────────────────────────────────────────

function InfoRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function PricingRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums', valueClassName)}>{value}</span>
    </div>
  )
}

function Dash() {
  return <span className="text-muted-foreground/40">—</span>
}
