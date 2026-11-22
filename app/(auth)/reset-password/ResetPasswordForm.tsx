'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const fieldClass =
  'block w-full rounded-[12px] border border-border bg-white px-4 text-sm text-[#14161B] ' +
  'placeholder:text-[#767676] focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-1'

export default function ResetPasswordForm() {
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState('')
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'success' | 'expired'>('loading')
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('[reset-password] exchangeCodeForSession failed:', error.message)
          setError(error.message)
          setStatus('expired')
        } else {
          setStatus('ready')
        }
      })
    } else if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          console.error('[reset-password] verifyOtp failed:', error.message)
          setError(error.message)
          setStatus('expired')
        } else {
          setStatus('ready')
        }
      })
    } else {
      // No token in URL — check for an existing recovery session (page refresh, or
      // the callback route already exchanged the code and redirected here).
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStatus('ready')
        } else {
          // Last resort: listen for the PASSWORD_RECOVERY event from the hash fragment
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') setStatus('ready')
          })
          // If no event fires within a short window, show expired
          const timer = setTimeout(() => {
            setStatus((s) => s === 'loading' ? 'expired' : s)
          }, 3000)
          return () => { subscription.unsubscribe(); clearTimeout(timer) }
        }
      })
    }
  }, [searchParams])

  const handleUpdate = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      return
    }
    await supabase.auth.signOut()
    setStatus('success')
    setTimeout(() => router.push('/login?reset=success'), 2000)
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
        {status === 'loading' && (
          <p className="text-sm text-muted-foreground text-center">Verifying link…</p>
        )}

        {status === 'expired' && (
          <>
            <h1 className="text-xl font-semibold text-[#14161B] text-center">Link expired</h1>
            <p className="mt-3 text-sm text-muted-foreground text-center leading-relaxed">
              This link has expired.{' '}
              <Link
                href="/forgot-password"
                className="text-[#14161B] underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                Request a new one.
              </Link>
            </p>
            {error && (
              <p className="mt-2 text-xs text-destructive text-center break-words">{error}</p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-xl font-semibold text-[#14161B] text-center">Password updated</h1>
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Please sign in with your new password.
            </p>
          </>
        )}

        {status === 'ready' && (
          <>
            <h1 className="text-xl font-semibold text-[#14161B] text-center">
              Choose a new password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground text-center mb-8">
              Must be at least 8 characters.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="rp-password" className="mb-1.5 block text-sm font-medium text-[#14161B]">
                  New password
                </label>
                <input
                  id="rp-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldClass}
                  style={{ height: 48 }}
                />
              </div>

              <div>
                <label htmlFor="rp-confirm" className="mb-1.5 block text-sm font-medium text-[#14161B]">
                  Confirm new password
                </label>
                <input
                  id="rp-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={fieldClass}
                  style={{ height: 48 }}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="button"
                onClick={handleUpdate}
                className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: '#2457F5', outlineColor: '#2457F5' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a46d4' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2457F5' }}
              >
                Update password
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
