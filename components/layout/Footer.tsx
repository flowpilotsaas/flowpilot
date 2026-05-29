'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const usefulLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
]

// Inline SVGs keep brand icons decoupled from lucide-react version churn
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const socialLinks = [
  { label: 'Twitter / X', href: '#', icon: <XIcon /> },
  { label: 'LinkedIn',    href: '#', icon: <LinkedInIcon /> },
  { label: 'Facebook',   href: '#', icon: <FacebookIcon /> },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || isSubmitting) return
    setIsSubmitting(true)
    // TODO: wire up to your email provider
    await new Promise((r) => setTimeout(r, 800))
    setStatus('success')
    setEmail('')
    setIsSubmitting(false)
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <footer className="bg-muted/50 text-foreground border-t border-border/40">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">

        {/* Brand */}
        <div className="flex flex-col items-start gap-4">
          <span className="text-xl font-bold">Flow Pilot</span>
          <p className="text-sm text-muted-foreground">
            Field service management built for modern teams. Schedule smarter,
            dispatch faster, and get paid without the paperwork.
          </p>
        </div>

        {/* Useful Links */}
        <div className="md:justify-self-center">
          <h3 className="mb-4 text-base font-semibold">Quick Links</h3>
          <ul className="space-y-2">
            {usefulLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social */}
        <div className="md:justify-self-center">
          <h3 className="mb-4 text-base font-semibold">Follow Us</h3>
          <ul className="space-y-2">
            {socialLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  aria-label={link.label}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="mb-4 text-base font-semibold">Stay in the loop</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Product updates and field service tips — no spam, ever.
          </p>
          <form onSubmit={handleSubscribe} className="relative w-full max-w-sm">
            <div className="relative">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || status !== 'idle'}
                required
                aria-label="Email for newsletter"
                className="pr-28"
              />
              <Button
                type="submit"
                disabled={isSubmitting || status !== 'idle'}
                className="absolute right-0 top-0 h-full rounded-l-none px-4 text-xs"
              >
                {isSubmitting ? 'Sending…' : 'Subscribe'}
              </Button>
            </div>

            {status !== 'idle' && (
              <div
                key={status}
                className="animate-in fade-in absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 text-center backdrop-blur-sm"
              >
                {status === 'success' ? (
                  <span className="font-semibold text-green-500">You're subscribed! 🎉</span>
                ) : (
                  <span className="font-semibold text-destructive">Something went wrong. Try again.</span>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Flow Pilot. All rights reserved.
      </div>
    </footer>
  )
}
