'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, Search, Settings, CreditCard, LogOut,
  Zap, Plus, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':               'Dashboard',
  '/dashboard/schedule':      'Schedule',
  '/dashboard/dispatch':      'Dispatch',
  '/dashboard/jobs':          'Jobs',
  '/dashboard/tech-live-map': 'Tech Live Map',
  '/dashboard/estimates':     'Estimates',
  '/dashboard/pricebook':     'Pricebook',
  '/dashboard/pipeline':      'Pipeline',
  '/dashboard/leads-hub':     'Leads Hub',
  '/dashboard/customers':     'Customers',
  '/dashboard/agreements':    'Agreements',
  '/dashboard/communications':'Communications',
  '/dashboard/team':          'Team',
  '/dashboard/tasks':         'Tasks',
  '/dashboard/inventory':     'Inventory',
  '/dashboard/equipment':     'Company Equipment',
  '/dashboard/transactions':  'Transactions',
  '/dashboard/reports':       'Reports',
  '/dashboard/appeals':       'Appeals',
  '/dashboard/billing':       'Billing',
  '/dashboard/settings':      'Settings',
}

// Shown only on exact list-page matches
const PAGE_NEW_ACTION: Record<string, { label: string; href?: string; adminOnly?: boolean }> = {
  '/dashboard/estimates':  { label: 'New Estimate', href: '/dashboard/estimates/new' },
  '/dashboard/jobs':       { label: 'New Job' },
  '/dashboard/customers':  { label: 'New Customer' },
  '/dashboard/agreements': { label: 'New Agreement' },
  '/dashboard/pricebook':  { label: 'Add Item' },
  '/dashboard/inventory':  { label: 'Add Item' },
  '/dashboard/equipment':  { label: 'Add Unit' },
  '/dashboard/tasks':      { label: 'New Task' },
  '/dashboard/team':       { label: 'Invite Member', adminOnly: true },
}

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const match = Object.keys(PAGE_TITLES)
    .filter(k => k !== '/dashboard' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? PAGE_TITLES[match] : 'Dashboard'
}

type Crumb = { label: string; href?: string }

function buildBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 2) return []

  const crumbs: Crumb[] = []
  const parentHref = '/' + segments.slice(0, 2).join('/')
  const parentLabel = PAGE_TITLES[parentHref]
  if (parentLabel) crumbs.push({ label: parentLabel, href: parentHref })

  const leaf = segments[segments.length - 1]
  if (leaf === 'edit')   crumbs.push({ label: 'Edit' })
  else if (leaf === 'new') crumbs.push({ label: 'New' })
  else                    crumbs.push({ label: 'Details' })

  return crumbs
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
  const { role } = useOrganization()

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

  const title       = resolveTitle(pathname)
  const crumbs      = buildBreadcrumbs(pathname)
  const rawAction   = PAGE_NEW_ACTION[pathname]
  const quickAction = rawAction?.adminOnly && role === 'technician' ? undefined : rawAction
  const initials    = email ? getInitials(email) : '…'

  return (
    <header className="flex-shrink-0 flex items-center bg-card border-b border-border/80 z-20" style={{ height: '3.75rem' }}>

      {/* Logo column — matches sidebar width */}
      <div className="w-60 flex-shrink-0 flex items-center px-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-foreground hover:text-foreground/80 transition-colors"
        >
          <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" />
          </span>
          Jobigram
        </Link>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border flex-shrink-0" />

      {/* Title / breadcrumb */}
      <div className="flex items-center px-6 flex-1 min-w-0">
        {crumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                )}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="text-muted-foreground hover:text-foreground transition-colors truncate"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground truncate">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <div className="relative">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h1>
            <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-primary/50" />
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 pr-5">

        {/* Contextual new-item button */}
        {quickAction && (
          <div className="mr-3">
            {quickAction.href ? (
              <Button size="sm" asChild className="gap-1.5 h-8 text-xs font-medium">
                <Link href={quickAction.href}>
                  <Plus className="w-3.5 h-3.5" />
                  {quickAction.label}
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium"
                onClick={() => window.dispatchEvent(new CustomEvent('dashboard:new'))}
              >
                <Plus className="w-3.5 h-3.5" />
                {quickAction.label}
              </Button>
            )}
          </div>
        )}

        <button
          type="button"
          aria-label="Search"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border mx-2" />

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropOpen(v => !v)}
            aria-label="User menu"
            aria-expanded={dropOpen}
            className="w-8 h-8 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary/25 transition-colors select-none ring-2 ring-primary/20 hover:ring-primary/40 cursor-pointer"
          >
            {initials}
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg shadow-black/5 py-1 z-50">
              {email && (
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <p className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wide mb-0.5">
                    Signed in as
                  </p>
                  <p className="text-xs text-foreground font-medium truncate">{email}</p>
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
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
