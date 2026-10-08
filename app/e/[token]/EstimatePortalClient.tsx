'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type EstimateStatus = 'Draft' | 'Sent' | 'Approved' | 'Declined'

type PortalEstimate = {
  id: string
  estimate_number: number
  customer_name: string | null
  status: EstimateStatus
  subtotal: number
  markup_percent: number
  tax_percent: number
  discount: number
  total: number
  notes: string | null
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

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${valueClass ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}

export default function EstimatePortalClient({
  estimate: initialEstimate,
  lineItems,
  businessName,
  token,
  isPaid,
}: {
  estimate: PortalEstimate
  lineItems: LineItem[]
  businessName: string | null
  token: string
  isPaid: boolean
}) {
  const [status, setStatus]     = React.useState<EstimateStatus>(initialEstimate.status)
  const [submitting, setSubmitting] = React.useState<'approve' | 'decline' | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [payingNow, setPayingNow]   = React.useState(false)
  const [payError, setPayError]     = React.useState<string | null>(null)

  const hasDecided = status === 'Approved' || status === 'Declined'

  const handleAction = async (action: 'approve' | 'decline') => {
    if (hasDecided || submitting) return
    setSubmitting(action)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/estimates/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.status) {
          setStatus(data.status as EstimateStatus)
          return
        }
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setStatus(action === 'approve' ? 'Approved' : 'Declined')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(null)
    }
  }

  const handlePayNow = async () => {
    setPayingNow(true)
    setPayError(null)
    try {
      const res  = await fetch(`/api/stripe/pay/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setPayError(data.error ?? 'Could not create a payment session. Please try again.')
        return
      }
      window.location.href = data.url
    } catch {
      setPayError('Network error. Please check your connection and try again.')
    } finally {
      setPayingNow(false)
    }
  }

  const markupAmount = initialEstimate.subtotal * (initialEstimate.markup_percent / 100)
  const taxBase      = initialEstimate.subtotal + markupAmount
  const taxAmount    = taxBase * (initialEstimate.tax_percent / 100)

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* ── Business name ── */}
        <div className="text-center mb-8">
          <p className="text-xl font-bold tracking-tight text-foreground mb-1">
            {businessName ?? 'Jobigram'}
          </p>
          <p className="text-sm text-muted-foreground">Estimate for your review</p>
        </div>

        {/* ── Confirmation banner ── */}
        {hasDecided && (
          <div className={[
            'mb-6 rounded-xl border px-5 py-4 flex items-start gap-3',
            status === 'Approved'
              ? 'bg-success/10 border-success/25'
              : 'bg-destructive/10 border-destructive/25',
          ].join(' ')}>
            {status === 'Approved'
              ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${status === 'Approved' ? 'text-success' : 'text-destructive'}`}>
                {status === 'Approved' ? "You've accepted this estimate" : "You've declined this estimate"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {status === 'Approved'
                  ? "Thank you! Your service provider will be in touch shortly to schedule the work."
                  : "Your service provider has been notified. Feel free to reach out if you'd like to discuss further."}
              </p>

              {status === 'Approved' && (
                isPaid ? (
                  /* Payment confirmed */
                  <div className="mt-3 flex items-center gap-2 text-sm text-success font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Payment received. Thank you!
                  </div>
                ) : (
                  /* Pay now button */
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      Ready to pay? Complete your payment securely below.
                    </p>
                    {payError && (
                      <p className="text-sm text-destructive mb-2">{payError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handlePayNow}
                      disabled={payingNow}
                      className="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-lg bg-success hover:bg-success/90 text-success-foreground text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {payingNow
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : null}
                      Pay {fmtCurrency(initialEstimate.total)} Now →
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ── Main card ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-[0_1px_3px_oklch(0_0_0/0.06),0_4px_12px_oklch(0_0_0/0.05),0_16px_32px_oklch(0_0_0/0.04)]">

          {/* Estimate header */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-start justify-between flex-wrap gap-3">
              {initialEstimate.customer_name ? (
                <p className="text-sm text-muted-foreground">
                  Prepared for{' '}
                  <span className="font-semibold text-foreground">
                    {initialEstimate.customer_name}
                  </span>
                </p>
              ) : <div />}
              <div className="text-right shrink-0">
                <p className="text-sm text-foreground">{fmtDate(initialEstimate.created_at)}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono tabular-nums">
                  EST-{String(initialEstimate.estimate_number).padStart(4, '0')}
                </p>
              </div>
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Item</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground w-16">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Unit Price</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr
                      key={item.id}
                      className={i < lineItems.length - 1 ? 'border-b border-border' : ''}
                    >
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                        {fmtCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-foreground tabular-nums">
                        {fmtCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pricing summary */}
          <div className="px-6 py-5 border-t border-border bg-muted/30">
            <div className="max-w-[240px] ml-auto flex flex-col gap-2">
              <SummaryRow label="Subtotal" value={fmtCurrency(initialEstimate.subtotal)} />
              {initialEstimate.markup_percent > 0 && (
                <SummaryRow
                  label={`Markup (${initialEstimate.markup_percent}%)`}
                  value={fmtCurrency(markupAmount)}
                />
              )}
              {initialEstimate.tax_percent > 0 && (
                <SummaryRow
                  label={`Tax (${initialEstimate.tax_percent}%)`}
                  value={fmtCurrency(taxAmount)}
                />
              )}
              {initialEstimate.discount > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`−${fmtCurrency(initialEstimate.discount)}`}
                  valueClass="text-success"
                />
              )}
              <div className="pt-2.5 mt-0.5 border-t border-border flex items-center justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-lg tabular-nums text-foreground">
                  {fmtCurrency(initialEstimate.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer-facing notes */}
          {initialEstimate.notes && (
            <div className="px-6 py-5 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground/70 mb-2">
                Notes
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {initialEstimate.notes}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!hasDecided && (
            <div className="px-6 py-5 border-t border-border">
              {errorMsg && (
                <p className="text-sm text-destructive mb-3">{errorMsg}</p>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                Please review the estimate above and let your service provider know how you'd like to proceed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAction('approve')}
                  disabled={submitting !== null}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting === 'approve'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />}
                  Accept Estimate
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('decline')}
                  disabled={submitting !== null}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting === 'decline'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />}
                  Decline
                </button>
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          Powered by <strong className="text-muted-foreground/70">Jobigram</strong>
        </p>
      </div>
    </div>
  )
}
