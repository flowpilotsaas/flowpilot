'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Search, Settings, CreditCard, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':              'Dashboard',
  '/dashboard/schedule':     'Schedule',
  '/dashboard/dispatch':     'Dispatch',
  '/dashboard/jobs':         'Jobs',
  '/dashboard/tech-live-map':'Tech Live Map',
  '/dashboard/estimates':    'Estimates',
  '/dashboard/pricebook':    'Pricebook',
  '/dashboard/pipeline':     'Pipeline',
  '/dashboard/leads-hub':    'Leads Hub',
  '/dashboard/customers':    'Customers',
  '/dashboard/agreements':   'Agreements',
  '/dashboard/communications':'Communications',
  '/dashboard/team':         'Team',
  '/dashboard/tasks':        'Tasks',
  '/dashboard/inventory':    'Inventory',
  '/dashboard/equipment':    'Company Equipment',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/reports':      'Reports',
  '/dashboard/appeals':      'Appeals',
  '/dashboard/billing':      'Billing',
  '/dashboard/settings':     'Settings',
}

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Longest prefix match for nested routes (e.g. /dashboard/jobs/123)
  const match = Object.keys(PAGE_TITLES)
    .filter(k => k !== '/dashboard' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? PAGE_TITLES[match] : 'Dashboard'
}

function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export default function DashboardHeader() {
  const pathname = usePathname()
  const router   = useRouter()

  const [email,    setEmail]    = useState<string | null>(null)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  useEffect(() => {
    if (!dropOpen) return
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [dropOpen])

  const handleSignOut = async () => {
    setDropOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const title    = resolveTitle(pathname)
  const initials = email ? getInitials(email) : '…'

  return (
    <header className="sticky top-0 z-20 h-14 flex items-center bg-card border-b border-border px-6 gap-4">
      {/* Page title */}
      <h1 className="flex-1 text-sm font-semibold text-foreground">{title}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Search"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative ml-2" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropOpen(v => !v)}
            aria-label="User menu"
            aria-expanded={dropOpen}
            className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary/20 transition-colors select-none"
          >
            {initials}
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              {email && (
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              )}
              <Link
                href="/dashboard/settings"
                onClick={() => setDropOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
                Settings
              </Link>
              <Link
                href="/dashboard/billing"
                onClick={() => setDropOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                Billing
              </Link>
              <div className="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
