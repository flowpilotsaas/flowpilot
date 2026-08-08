type SmsType =
  | 'estimate_sent'
  | 'job_confirmation'
  | 'job_completion'
  | 'payment_received'
  | 'payment_link_sent'

export function sendSms(to: string, type: SmsType, data: Record<string, unknown>) {
  console.log('[sendSms] firing', type, 'to', to)
  fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, type, data }),
  })
    .then(async (res) => {
      const body = await res.json().catch(() => ({}))
      if (!res.ok) console.error('[sendSms] API error', res.status, body)
      else console.log('[sendSms] success', body)
    })
    .catch((err) => console.error('[sendSms] fetch failed', err))
}
