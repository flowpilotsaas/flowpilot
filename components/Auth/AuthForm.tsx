'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TRIAL_DAYS } from '@/lib/plans'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

const fieldClass =
  'block w-full rounded-[12px] border border-border bg-white px-4 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-1'

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Surface error sent back from /auth/callback when OAuth exchange fails
  React.useEffect(() => {
    if (searchParams.get('error') === 'oauth') {
      setError('Google sign-in failed. Please try again.')
    }
  }, [searchParams])

  const isLogin = mode === 'login'

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); return }
      router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); return }
      // Fire org provisioning; the DB trigger handles it automatically for new users,
      // this is a client-side fallback in case the trigger isn't installed yet.
      fetch('/api/auth/provision-org', { method: 'POST' }).catch(() => {})
      router.push('/dashboard')
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success the browser navigates to Google — no need to reset loading state
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#F6F4EE' }}
    >
      {/* Logo above card */}
      <Link
        href="/"
        className="mb-6 text-xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
      >
        Jobigram
      </Link>

      {/* Card */}
      <div className="w-full max-w-[420px] rounded-[16px] border border-border bg-white px-8 py-10 shadow-sm shadow-black/[0.06]">

        {/* Heading */}
        <h1 className="text-xl font-semibold text-foreground text-center">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-center mb-8">
          {isLogin
            ? 'Sign in to your Jobigram account'
            : `Start your ${TRIAL_DAYS}-day free trial`}
        </p>

        <div className="flex flex-col gap-4">

          {/* Email */}
          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={fieldClass}
              style={{ height: 48 }}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              {isLogin && (
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldClass}
              style={{ height: 48 }}
            />
          </div>

          {/* Confirm password (signup only) */}
          {!isLogin && (
            <div>
              <label htmlFor="auth-confirm" className="mb-1.5 block text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={fieldClass}
                style={{ height: 48 }}
              />
            </div>
          )}

          {/* Inline error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isLogin ? 'Sign in' : 'Create account'}
          </button>

          {/* Trial badge (signup only) — no credit card is required; signUp uses only email+password */}
          {!isLogin && (
            <p className="text-xs text-muted-foreground text-center -mt-1">
              {TRIAL_DAYS}-day free trial · No credit card required
            </p>
          )}

          {/* Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt=""
              className="w-4 h-4 shrink-0"
            />
            {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          {/* ToS (signup only) */}
          {!isLogin && (
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          )}

          {/* Switch mode */}
          <p className="text-sm text-muted-foreground text-center">
            {isLogin ? (
              <>
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  )
}
