'use client'

import React from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { name: 'Features', href: '/#features' },
  { name: 'Pricing', href: '/pricing' },
]

export default function Navbar() {
  const [open, setOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <nav
        aria-label="Main navigation"
        className="w-full px-4 pt-3"
      >
        <div
          className={cn(
            'mx-auto flex max-w-5xl items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300',
            scrolled
              ? 'border border-border/50 bg-background/80 shadow-sm backdrop-blur-md'
              : '',
          )}
        >
          {/* Logo */}
          <Link href="/" aria-label="Jobigram home" className="flex items-center">
            <span className="text-lg font-bold tracking-tight text-foreground">Jobigram</span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-8 lg:flex" role="list">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 lg:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="cta" size="sm">
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="relative -m-2 p-2 text-muted-foreground hover:text-foreground lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div
            id="mobile-menu"
            className="mx-auto mt-2 max-w-5xl rounded-2xl border border-border bg-background px-5 py-6 shadow-lg lg:hidden"
          >
            <ul className="mb-6 space-y-4" role="list">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              <Button asChild variant="outline" className="w-full">
                <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
              </Button>
              <Button asChild variant="cta" className="w-full">
                <Link href="/signup" onClick={() => setOpen(false)}>Start free trial</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
