type EmailType =
  | 'estimate_sent'
  | 'estimate_approved'
  | 'estimate_declined'
  | 'job_confirmation'
  | 'job_reminder'
  | 'job_completion'
  | 'payment_received'
  | 'payment_link_sent'
  | 'agreement_sent'

export function sendEmail(to: string, type: EmailType, data: Record<string, unknown>) {
  console.log('[sendEmail] firing', type, 'to', to, 'data:', data)
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, type, data }),
  })
    .then(async (res) => {
      const body = await res.json().catch(() => ({}))
      if (!res.ok) console.error('[sendEmail] API error', res.status, body)
      else console.log('[sendEmail] success', body)
    })
    .catch((err) => console.error('[sendEmail] fetch failed', err))
}
