'use client'

import * as React from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState('')

  const isLogin = mode === 'login'

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = () => {
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
    alert(isLogin ? 'Sign in successful! (Demo)' : 'Account created! (Demo)')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl shadow-black/5 p-10 flex flex-col items-center">

        {/* Wordmark */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-foreground">
            Flow Pilot
          </Link>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-semibold text-foreground mb-1 text-center">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          {isLogin
            ? 'Sign in to your Flow Pilot account'
            : 'Start your 14-day free trial'}
        </p>

        {/* Fields */}
        <div className="flex flex-col w-full gap-3">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!isLogin && (
            <Input
              placeholder="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Divider */}
        <hr className="w-full my-6 border-border" />

        {/* Actions */}
        <div className="flex flex-col w-full gap-3">
          {/* Primary action */}
          <Button
            onClick={handleSubmit}
            variant="default"
            size="default"
            className="w-full"
          >
            {isLogin ? 'Sign in' : 'Create account'}
          </Button>

          {/* Google */}
          <Button variant="outline" size="default" className="w-full gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt=""
              className="w-4 h-4 shrink-0"
            />
            Continue with Google
          </Button>

          {/* Terms — signup only */}
          {!isLogin && (
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          )}

          {/* Switch link */}
          <p className="text-sm text-muted-foreground text-center mt-1">
            {isLogin ? (
              <>
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="underline text-foreground hover:text-foreground/80">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/login" className="underline text-foreground hover:text-foreground/80">
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
