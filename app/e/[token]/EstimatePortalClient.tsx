'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react'

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
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`tabular-nums ${valueClass ?? 'text-zinc-700 dark:text-zinc-300'}`}>{value}</span>
    </div>
  )
}

export default function EstimatePortalClient({
  estimate: initialEstimate,
  lineItems,
  businessName,
  token,
  existingPaymentUrl,
}: {
  estimate: PortalEstimate
  lineItems: LineItem[]
  businessName: string | null
  token: string
  existingPaymentUrl: string | null
}) {
  const [status, setStatus] = React.useState<EstimateStatus>(initialEstimate.status)
  const [submitting, setSubmitting] = React.useState<'approve' | 'decline' | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = React.useState<string | null>(existingPaymentUrl)
  // null  = Stripe hasn't been tried yet (pre-acceptance)
  // ''    = Stripe was tried but failed
  // 'url' = ready to show Pay Now
  const [paymentAttempted, setPaymentAttempted] = React.useState(false)

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
        // 409 means already decided (race condition or double-tab) — treat as success
        if (res.status === 409 && data.status) {
          setStatus(data.status as EstimateStatus)
          return
        }
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setStatus(action === 'approve' ? 'Approved' : 'Declined')
      if (action === 'approve') {
        setPaymentAttempted(true)
        setPaymentUrl(data.paymentUrl ?? null)
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(null)
    }
  }

  const markupAmount = initialEstimate.subtotal * (initialEstimate.markup_percent / 100)
  const taxBase = initialEstimate.subtotal + markupAmount
  const taxAmount = taxBase * (initialEstimate.tax_percent / 100)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Business header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 dark:bg-white mb-3">
            <FileText className="w-6 h-6 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {businessName ?? 'Your Service Provider'}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Estimate for Review</p>
        </div>

        {/* Confirmation banner */}
        {hasDecided && (
          <div className={`mb-6 rounded-xl border px-5 py-4 flex items-start gap-3 ${
            status === 'Approved'
              ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
          }`}>
            {status === 'Approved'
              ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${status === 'Approved' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                {status === 'Approved' ? "You've accepted this estimate" : "You've declined this estimate"}
              </p>
              <p className={`text-sm mt-0.5 ${status === 'Approved' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {status === 'Approved'
                  ? "Thank you! Your service provider will be in touch shortly to schedule the work."
                  : "Your service provider has been notified. Feel free to reach out if you'd like to discuss further."}
              </p>

              {/* Pay Now — shown for Approved when a payment link is available */}
              {status === 'Approved' && paymentUrl && (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center mt-3 h-9 px-5 rounded-lg bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                >
                  Pay Now →
                </a>
              )}

              {/* Fallback — Stripe failed but acceptance went through */}
              {status === 'Approved' && !paymentUrl && paymentAttempted && (
                <p className="text-sm text-green-700 dark:text-green-400 mt-1.5">
                  Your service provider will send you a payment link shortly.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">

          {/* Estimate header */}
          <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-0.5">Estimate</p>
                <p className="text-lg font-mono font-semibold text-zinc-900 dark:text-white">
                  EST-{String(initialEstimate.estimate_number).padStart(4, '0')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-0.5">Issued</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{fmtDate(initialEstimate.created_at)}</p>
              </div>
            </div>
            {initialEstimate.customer_name && (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Prepared for{' '}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {initialEstimate.customer_name}
                </span>
              </p>
            )}
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left px-6 py-3 font-medium text-zinc-500">Item</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-500 w-16">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-zinc-500 w-28">Unit Price</th>
                    <th className="text-right px-6 py-3 font-medium text-zinc-500 w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr
                      key={item.id}
                      className={i < lineItems.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}
                    >
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-zinc-600 dark:text-zinc-400 tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right text-zinc-600 dark:text-zinc-400 tabular-nums">
                        {fmtCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                        {fmtCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pricing summary */}
          <div className="px-6 py-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
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
                  valueClass="text-green-600 dark:text-green-400"
                />
              )}
              <div className="pt-2.5 mt-0.5 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-white">Total</span>
                <span className="font-bold text-lg tabular-nums text-zinc-900 dark:text-white">
                  {fmtCurrency(initialEstimate.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer-facing notes only */}
          {initialEstimate.notes && (
            <div className="px-6 py-5 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {initialEstimate.notes}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!hasDecided && (
            <div className="px-6 py-5 border-t border-zinc-100 dark:border-zinc-800">
              {errorMsg && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">{errorMsg}</p>
              )}
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Please review the estimate above and let your service provider know how you'd like to proceed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAction('approve')}
                  disabled={submitting !== null}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
                  className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

        <p className="text-center text-xs text-zinc-400 mt-8">
          Powered by <strong>Jobigram</strong>
        </p>
      </div>
    </div>
  )
}
