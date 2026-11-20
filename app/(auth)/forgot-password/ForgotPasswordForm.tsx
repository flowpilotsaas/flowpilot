'use client'

import * as React from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const fieldClass =
  'block w-full rounded-[12px] border border-border bg-white px-4 text-sm text-[#14161B] ' +
  'placeholder:text-[#767676] focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-1'

export default function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState('')
  const [sent, setSent] = React.useState(false)

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      return
    }
    // Always show the same message — do not reveal whether the email exists
    setSent(true)
  }

  return (
    <div
      className="light min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background text-foreground"
      style={{ backgroundColor: '#F6F4EE', colorScheme: 'light' }}
    >
      <Link
        href="/"
        className="mb-6 text-xl font-bold tracking-tight text-[#14161B] hover:opacity-80 transition-opacity"
      >
        Jobigram
      </Link>

      <div className="w-full max-w-[420px] rounded-[16px] border border-border bg-white px-8 py-10 shadow-sm shadow-black/[0.06]">
        <h1 className="text-xl font-semibold text-[#14161B] text-center">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-center mb-8">
          Enter your email and we&apos;ll send a reset link.
        </p>

        {sent ? (
          <p className="text-sm text-[#14161B] text-center leading-relaxed">
            If an account exists for that email, we sent a reset link.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-[#14161B]">
                Email
              </label>
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={fieldClass}
                style={{ height: 48 }}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: '#2457F5', outlineColor: '#2457F5' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a46d4' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2457F5' }}
            >
              Send reset link
            </button>
          </div>
        )}

        <p className="mt-6 text-sm text-muted-foreground text-center">
          <Link
            href="/login"
            className="text-[#14161B] underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
