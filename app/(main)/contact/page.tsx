import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CONTACT_EMAIL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Contact — Jobigram',
  description: "Questions about Jobigram? Send a message and we'll get back to you.",
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function submitContact(formData: FormData) {
  'use server'
  const name     = (formData.get('name')     as string | null)?.trim() ?? ''
  const email    = (formData.get('email')    as string | null)?.trim() ?? ''
  const message  = (formData.get('message')  as string | null)?.trim() ?? ''
  const honeypot = (formData.get('website')  as string | null) ?? ''

  // Silently discard honeypot submissions
  if (honeypot) {
    redirect('/contact?sent=1')
  }

  if (!name || !email || !message) {
    redirect('/contact?error=missing')
  }

  if (!EMAIL_RE.test(email)) {
    redirect('/contact?error=email')
  }

  if (message.length > 5000) {
    redirect('/contact?error=length')
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY is not set')
    redirect('/contact?error=send')
  }

  try {
    const { Resend } = await import('resend')
    const client = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.RESEND_FROM_EMAIL ?? 'Jobigram <onboarding@resend.dev>'
    await client.emails.send({
      from,
      to:      CONTACT_EMAIL,
      replyTo: email,
      subject: `Jobigram contact: ${name}`,
      text:    `From: ${name} <${email}>\n\n${message}`,
    })
  } catch (err) {
    console.error('[contact] Resend send failed:', err)
    redirect('/contact?error=send')
  }

  redirect('/contact?sent=1')
}

const inputClass =
  'block w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams
  const sent  = params.sent === '1'
  const error = params.error

  const sendError =
    error === 'send' || error === 'email' || error === 'length' || error === 'missing'

  return (
    <div className="px-6 pb-20 pt-36 sm:pt-44">
      <div className="mx-auto max-w-5xl">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">Talk to us</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Questions about Jobigram? Send a message and we&apos;ll get back to you.
          </p>
        </div>

        <div className="grid gap-12 sm:grid-cols-[1fr_280px]">

          {/* ── Form ─────────────────────────────────────────────── */}
          <div>
            {sent && (
              <p className="mb-6 rounded-xl border border-border bg-muted/40 px-5 py-4 text-sm text-foreground">
                Message sent — we&apos;ll reply by email shortly.
              </p>
            )}
            {error === 'missing' && (
              <p className="mb-6 text-sm text-red-600">Please fill in all fields before sending.</p>
            )}
            {error === 'email' && (
              <p className="mb-6 text-sm text-red-600">Please enter a valid email address.</p>
            )}
            {error === 'length' && (
              <p className="mb-6 text-sm text-red-600">Your message must be 5000 characters or fewer.</p>
            )}
            {error === 'send' && (
              <p className="mb-6 text-sm text-red-600">
                Something went wrong. Please try again or email{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            )}

            {!sent && (
              <form action={submitContact} className="space-y-5">
                {/* Honeypot — hidden from real users */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ display: 'none' }}
                />

                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className={inputClass}
                    style={{ height: 48 }}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={inputClass}
                    style={{ height: 48 }}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-foreground">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    maxLength={5000}
                    className={`${inputClass} py-3`}
                    placeholder="What would you like to know?"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Send message
                </button>
              </form>
            )}
          </div>

          {/* ── Right panel ──────────────────────────────────────── */}
          <div className="pt-1">
            <p className="text-sm font-semibold text-foreground">Support</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We reply by email. Use the form and we&apos;ll get back to you.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Or email us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline underline-offset-2 hover:text-primary"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
