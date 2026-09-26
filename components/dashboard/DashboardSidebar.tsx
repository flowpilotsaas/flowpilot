'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Briefcase, BookOpen, FileText, CalendarDays, LogOut, Zap,
  LayoutGrid, ClipboardList, Phone, GitBranch, CheckSquare, Package, Wrench,
  DollarSign, BarChart2, MapPin, MessageSquare, CreditCard, Settings,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Field Ops',
    items: [
      { label: 'Schedule',      href: '/dashboard/schedule',      icon: CalendarDays },
      { label: 'Dispatch',      href: '/dashboard/dispatch',      icon: LayoutGrid },
      { label: 'Jobs',          href: '/dashboard/jobs',          icon: Briefcase },
      { label: 'Tech Live Map', href: '/dashboard/tech-live-map', icon: MapPin },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Estimates', href: '/dashboard/estimates', icon: FileText },
      { label: 'Pricebook', href: '/dashboard/pricebook', icon: BookOpen },
      { label: 'Pipeline',  href: '/dashboard/pipeline',  icon: GitBranch },
      { label: 'Leads Hub', href: '/dashboard/leads-hub', icon: Zap },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customers',      href: '/dashboard/customers',      icon: Users },
      { label: 'Agreements',     href: '/dashboard/agreements',     icon: ClipboardList },
      { label: 'Communications', href: '/dashboard/communications', icon: Phone },
    ],
  },
  {
    label: 'Team',
    items: [
      { label: 'Team',  href: '/dashboard/team',  icon: Users },
      { label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Inventory',         href: '/dashboard/inventory',    icon: Package },
      { label: 'Company Equipment', href: '/dashboard/equipment',    icon: Wrench },
      { label: 'Transactions',      href: '/dashboard/transactions', icon: DollarSign },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', href: '/dashboard/reports', icon: BarChart2 },
      { label: 'Appeals', href: '/dashboard/appeals', icon: MessageSquare },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing',  href: '/dashboard/billing',  icon: CreditCard, adminOnly: true },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings,   adminOnly: true },
    ],
  },
]

export default function DashboardSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { role } = useOrganization()

  const isTechnician = role === 'technician'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed top-0 left-0 w-60 h-screen flex flex-col bg-card border-r border-border">

      {/* Wordmark */}
      <div className="px-5 py-5 border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground hover:text-foreground/80 transition-colors"
        >
          <Zap className="w-4 h-4 text-primary shrink-0" />
          Jobigram
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(
            (item) => !(isTechnician && item.adminOnly)
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label} className={gi > 0 ? 'mt-4' : undefined}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 select-none">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ label, href, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                        active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 shrink-0', active && 'text-primary')} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-border">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>

    </aside>
  )
}
