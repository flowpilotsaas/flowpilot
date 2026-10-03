'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, Search, Settings, CreditCard, LogOut,
  Zap, ChevronRight, Loader2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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

// ─── Global search ────────────────────────────────────────────────────────────

type SearchResult = {
  id: string
  title: string
  subtitle?: string
  href: string
}

type SearchGroups = {
  jobs: SearchResult[]
  customers: SearchResult[]
  estimates: SearchResult[]
}

function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery]   = useState('')
  const [groups, setGroups] = useState<SearchGroups>({ jobs: [], customers: [], estimates: [] })
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = groups.jobs.length + groups.customers.length + groups.estimates.length
  const showDropdown = open && query.trim().length >= 2

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const runSearch = async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setGroups({ jobs: [], customers: [], estimates: [] })
      return
    }
    setLoading(true)
    try {
      const [{ data: jobs }, { data: customers }] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, status, customers(name)')
          .ilike('title', `%${trimmed}%`)
          .limit(5),
        supabase
          .from('customers')
          .select('id, name, email')
          .ilike('name', `%${trimmed}%`)
          .limit(5),
      ])

      const custIds = (customers ?? []).map((c: { id: string }) => c.id)
      const { data: estimates } = custIds.length > 0
        ? await supabase
            .from('estimates')
            .select('id, estimate_number, status, customers(name)')
            .in('customer_id', custIds)
            .limit(5)
        : { data: [] as { id: string; estimate_number: number; status: string; customers: { name: string }[] | null }[] }

      setGroups({
        jobs: (jobs ?? []).map((j: { id: string; title: string; customers: { name: string }[] | null }) => ({
          id:       j.id,
          title:    j.title,
          subtitle: Array.isArray(j.customers) ? j.customers[0]?.name : (j.customers as { name: string } | null)?.name,
          href:     `/dashboard/jobs/${j.id}`,
        })),
        customers: (customers ?? []).map((c: { id: string; name: string; email: string | null }) => ({
          id:       c.id,
          title:    c.name,
          subtitle: c.email ?? undefined,
          href:     `/dashboard/customers`,
        })),
        estimates: (estimates ?? []).map((e: { id: string; estimate_number: number; customers: { name: string }[] | null }) => ({
          id:       e.id,
          title:    `Estimate #${e.estimate_number}`,
          subtitle: Array.isArray(e.customers) ? e.customers[0]?.name : (e.customers as { name: string } | null)?.name,
          href:     `/dashboard/estimates/${e.id}`,
        })),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => runSearch(q), 300)
  }

  const navigate = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur() }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search jobs, customers, estimates…"
          className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring focus:bg-background transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-card border border-border rounded-xl shadow-lg shadow-black/5 z-50 overflow-hidden">
          {!loading && total === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-muted-foreground">
              No results for &ldquo;<span className="text-foreground">{query.trim()}</span>&rdquo;
            </p>
          ) : (
            <div className="py-1 max-h-[22rem] overflow-y-auto">
              {groups.jobs.length > 0 && (
                <ResultGroup label="Jobs" items={groups.jobs} onSelect={navigate} />
              )}
              {groups.customers.length > 0 && (
                <ResultGroup label="Customers" items={groups.customers} onSelect={navigate} />
              )}
              {groups.estimates.length > 0 && (
                <ResultGroup label="Estimates" items={groups.estimates} onSelect={navigate} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({
  label,
  items,
  onSelect,
}: {
  label: string
  items: SearchResult[]
  onSelect: (href: string) => void
}) {
  return (
    <div className="mb-0.5">
      <p className="px-3.5 pt-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </p>
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.href)}
          className="flex w-full items-center gap-3 px-3.5 py-2 hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

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

  const { theme, setTheme } = useTheme()

  const title    = resolveTitle(pathname)
  const crumbs   = buildBreadcrumbs(pathname)
  const initials = email ? getInitials(email) : '…'

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

      {/* Title / breadcrumb — narrow, left-aligned */}
      <div className="pl-5 pr-2 w-44 flex-shrink-0 min-w-0">
        {crumbs.length > 0 ? (
          <nav className="flex items-center gap-1 text-sm overflow-hidden">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
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
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground truncate">{title}</h1>
        )}
      </div>

      {/* Center: global search */}
      <div className="flex-1 flex items-center justify-center px-4">
        <GlobalSearch />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 pr-5 flex-shrink-0 justify-end w-44">

        <button
          type="button"
          aria-label="Notifications"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
        </button>


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
              <div className="border-t border-border mx-2 my-1.5" />
              <div className="px-3 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                  Theme
                </p>
                <div className="flex gap-1">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={cn(
                        'flex-1 rounded-md px-1.5 py-1 text-[11px] font-medium capitalize transition-colors cursor-pointer',
                        theme === t
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-border mt-0.5 pt-1">
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
