import { NextRequest } from 'next/server'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'PilotWork <onboarding@resend.dev>'

// ─── Templates ─────────────────────────────────────────────────────────────

function wrap(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #18181b; }
  .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header { background: #18181b; padding: 28px 40px; }
  .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .body { padding: 36px 40px; }
  .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #3f3f46; }
  .body p:last-child { margin-bottom: 0; }
  .card { background: #f4f4f5; border-radius: 6px; padding: 20px 24px; margin: 24px 0; }
  .card-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #e4e4e7; }
  .card-row:last-child { border-bottom: none; }
  .card-row .label { color: #71717a; }
  .card-row .value { font-weight: 600; color: #18181b; }
  .total-row { display: flex; justify-content: space-between; padding: 10px 0 0; font-size: 16px; font-weight: 700; }
  .footer { background: #f4f4f5; padding: 20px 40px; text-align: center; font-size: 12px; color: #a1a1aa; }
  .footer a { color: #a1a1aa; text-decoration: none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header"><h1>PilotWork</h1></div>
  <div class="body">${body}</div>
  <div class="footer">Powered by <strong>PilotWork</strong> · Field Service Management</div>
</div>
</body>
</html>`
}

function estimateSentHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const total = d.total != null ? `$${Number(d.total).toFixed(2)}` : '—'
  return wrap('Your Estimate is Ready', `
    <p>Hi ${name},</p>
    <p>Your service provider has sent you an estimate for your review.</p>
    <div class="card">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;">Estimate Summary</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:15px;color:#3f3f46;padding:4px 0;">Total</td>
          <td style="font-size:15px;text-align:right;padding:4px 0;"><strong>${total}</strong></td>
        </tr>
      </table>
    </div>
    <p>Please review the estimate and let us know if you have any questions.</p>
    <p>Thank you for your business.</p>
  `)
}

function tr(label: string, value: string) {
  return `<tr>
    <td style="font-size:14px;color:#71717a;padding:5px 0;white-space:nowrap;padding-right:16px;">${label}:</td>
    <td style="font-size:14px;color:#18181b;padding:5px 0;font-weight:600;">${value}</td>
  </tr>`
}

function jobConfirmationHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const num = d.jobNumber ? `#${d.jobNumber}` : ''
  const title = d.title ?? 'Scheduled Job'
  const date = d.scheduledDate ?? 'TBD'
  const company = d.companyName ?? 'Your service provider'
  return wrap('Job Confirmed', `
    <p>Hi ${name},</p>
    <p>Your job has been confirmed with <strong>${company}</strong>.</p>
    <div class="card">
      <table cellpadding="0" cellspacing="0" border="0">
        ${num ? tr('Job', num) : ''}
        ${tr('Service', title)}
        ${tr('Scheduled Date', date)}
      </table>
    </div>
    <p>We'll be in touch if anything changes. Feel free to reach out with any questions.</p>
  `)
}

function jobReminderHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const num = d.jobNumber ? `#${d.jobNumber}` : ''
  const title = d.title ?? 'Upcoming Job'
  const date = d.scheduledDate ?? 'soon'
  const company = d.companyName ?? 'Your service provider'
  return wrap('Reminder: Upcoming Job', `
    <p>Hi ${name},</p>
    <p>This is a friendly reminder that <strong>${company}</strong> has a job scheduled with you.</p>
    <div class="card">
      <table cellpadding="0" cellspacing="0" border="0">
        ${num ? tr('Job', num) : ''}
        ${tr('Service', title)}
        ${tr('Scheduled Date', date)}
      </table>
    </div>
    <p>Please ensure someone is available at the scheduled time. Contact us if you need to reschedule.</p>
  `)
}

function paymentReceivedHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const amount = d.amount != null ? `$${Number(d.amount).toFixed(2)}` : '—'
  const num = d.jobNumber ? `#${d.jobNumber}` : ''
  const company = d.companyName ?? 'Your service provider'
  return wrap('Payment Received', `
    <p>Hi ${name},</p>
    <p>We've received your payment. Thank you!</p>
    <div class="card">
      <table cellpadding="0" cellspacing="0" border="0">
        ${num ? tr('Job', num) : ''}
        ${tr('Amount Paid', amount)}
      </table>
    </div>
    <p>Your account with <strong>${company}</strong> is now up to date. We appreciate your prompt payment.</p>
  `)
}

function agreementSentHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const title = d.agreementTitle ?? 'Service Agreement'
  const start = d.startDate ?? '—'
  const end = d.endDate ?? '—'
  const value = d.value != null ? `$${Number(d.value).toFixed(2)}` : null
  const company = d.companyName ?? 'Your service provider'
  return wrap('Service Agreement Active', `
    <p>Hi ${name},</p>
    <p>Your service agreement with <strong>${company}</strong> is now active.</p>
    <div class="card">
      <table cellpadding="0" cellspacing="0" border="0">
        ${tr('Agreement', title)}
        ${tr('Start Date', start)}
        ${tr('End Date', end)}
        ${value ? tr('Value', value) : ''}
      </table>
    </div>
    <p>We look forward to serving you. Contact us anytime with questions or service requests.</p>
  `)
}

function estimateApprovedHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const total = d.total != null ? `$${Number(d.total).toFixed(2)}` : null
  return wrap('Estimate Approved', `
    <p>Hi ${name},</p>
    <p>Great news — your estimate has been <strong>approved</strong>. We'll be in touch shortly to schedule the work.</p>
    ${total ? `<div class="card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:15px;color:#3f3f46;padding:4px 0;">Total</td>
          <td style="font-size:15px;text-align:right;padding:4px 0;"><strong>${total}</strong></td>
        </tr>
      </table>
    </div>` : ''}
    <p>Thank you for choosing us. We look forward to working with you.</p>
  `)
}

function estimateDeclinedHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  return wrap('Estimate Update', `
    <p>Hi ${name},</p>
    <p>We've noted that your estimate has been <strong>declined</strong>.</p>
    <p>If you'd like to discuss the scope, pricing, or any concerns, we're happy to work with you on a revised proposal. Please don't hesitate to reach out.</p>
    <p>Thank you for considering us.</p>
  `)
}

function jobCompletionHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const title = d.title ?? 'your service'
  const num = d.jobNumber ? `#${d.jobNumber}` : ''
  return wrap('Service Complete', `
    <p>Hi ${name},</p>
    <p>We're pleased to let you know that <strong>${title}</strong>${num ? ` (Job ${num})` : ''} has been completed.</p>
    <p>Thank you for your business. If you have any questions or feedback about the work performed, please reach out — we'd love to hear from you.</p>
  `)
}

function paymentLinkSentHtml(d: Record<string, unknown>) {
  const name = d.customerName ?? 'there'
  const url = d.payUrl as string ?? '#'
  const total = d.total != null ? `$${Number(d.total).toFixed(2)}` : null
  return wrap('Your Payment Link is Ready', `
    <p>Hi ${name},</p>
    <p>Your payment link is ready. Click the button below to securely complete your payment online.</p>
    ${total ? `<div class="card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:15px;color:#3f3f46;padding:4px 0;">Amount Due</td>
          <td style="font-size:15px;text-align:right;padding:4px 0;"><strong>${total}</strong></td>
        </tr>
      </table>
    </div>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
      <tr>
        <td align="center">
          <a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:6px;">Pay Now</a>
        </td>
      </tr>
    </table>
  `)
}

const TEMPLATES: Record<string, (d: Record<string, unknown>) => string> = {
  estimate_sent:     estimateSentHtml,
  estimate_approved: estimateApprovedHtml,
  estimate_declined: estimateDeclinedHtml,
  job_confirmation:  jobConfirmationHtml,
  job_reminder:      jobReminderHtml,
  job_completion:    jobCompletionHtml,
  payment_received:  paymentReceivedHtml,
  payment_link_sent: paymentLinkSentHtml,
  agreement_sent:    agreementSentHtml,
}

const SUBJECTS: Record<string, string> = {
  estimate_sent:     'Your estimate is ready to review',
  estimate_approved: 'Your estimate has been approved',
  estimate_declined: 'Update on your estimate',
  job_confirmation:  'Your job has been confirmed',
  job_reminder:      'Reminder: upcoming job scheduled',
  job_completion:    'Your service is complete',
  payment_received:  'Payment received — thank you!',
  payment_link_sent: 'Your payment link is ready',
  agreement_sent:    'Your service agreement is now active',
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log('[send-email] POST hit')
  console.log('[send-email] RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'present, length: ' + process.env.RESEND_API_KEY.length : 'MISSING')
  console.log('[send-email] FROM address:', FROM)

  if (!process.env.RESEND_API_KEY) {
    console.error('[send-email] FATAL: RESEND_API_KEY is not set. Restart the dev server after adding it to .env.local.')
    return Response.json({ error: 'Email not configured — missing RESEND_API_KEY.' }, { status: 500 })
  }

  try {
    const { to, type, data } = await req.json()
    console.log('[send-email] to:', to, '| type:', type)

    if (!to || !type || !TEMPLATES[type]) {
      console.error('[send-email] Missing/invalid fields — to:', to, 'type:', type)
      return Response.json({ error: 'Missing or invalid fields.' }, { status: 400 })
    }

    const html = TEMPLATES[type](data ?? {})
    const subject = SUBJECTS[type] ?? 'A message from PilotWork'
    console.log('[send-email] calling Resend. subject:', subject)

    // Re-instantiate with the live key (avoids module-level caching of undefined)
    const { Resend } = await import('resend')
    const client = new Resend(process.env.RESEND_API_KEY)

    const { data: sendData, error } = await client.emails.send({ from: FROM, to, subject, html })

    if (error) {
      console.error('[send-email] Resend returned error:', JSON.stringify(error))
      return Response.json({ error: JSON.stringify(error) }, { status: 500 })
    }

    console.log('[send-email] Resend success. id:', (sendData as any)?.id)
    return Response.json({ ok: true })
  } catch (err) {
    const e = err as Error
    console.error('[send-email] Unexpected error:', e.name, e.message, e.stack)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
