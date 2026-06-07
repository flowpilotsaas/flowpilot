'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Briefcase, BookOpen, FileText, CalendarDays, LogOut, Zap,
  LayoutGrid, ClipboardList, Phone, GitBranch, CheckSquare, Package, Wrench,
  DollarSign, Globe, BarChart2, MapPin, MessageSquare, CreditCard, Settings,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard',         href: '/dashboard',                 icon: LayoutDashboard },
  { label: 'Schedule',          href: '/dashboard/schedule',        icon: CalendarDays },
  { label: 'Dispatch',          href: '/dashboard/dispatch',        icon: LayoutGrid },
  { label: 'Jobs',              href: '/dashboard/jobs',            icon: Briefcase },
  { label: 'Estimates',         href: '/dashboard/estimates',       icon: FileText },
  { label: 'Pricebook',         href: '/dashboard/pricebook',       icon: BookOpen },
  { label: 'Customers',         href: '/dashboard/customers',       icon: Users },
  { label: 'Team',              href: '/dashboard/team',            icon: Users },
  { label: 'Agreements',        href: '/dashboard/agreements',      icon: ClipboardList },
  { label: 'Communications',    href: '/dashboard/communications',  icon: Phone },
  { label: 'Pipeline',          href: '/dashboard/pipeline',        icon: GitBranch },
  { label: 'Tasks',             href: '/dashboard/tasks',           icon: CheckSquare },
  { label: 'Inventory',         href: '/dashboard/inventory',       icon: Package },
  { label: 'Company Equipment', href: '/dashboard/equipment',       icon: Wrench },
  { label: 'Transactions',      href: '/dashboard/transactions',    icon: DollarSign },
  { label: 'Google',            href: '/dashboard/google',          icon: Globe },
  { label: 'Reports',           href: '/dashboard/reports',         icon: BarChart2 },
  { label: 'Tech Live Map',     href: '/dashboard/tech-live-map',   icon: MapPin },
  { label: 'Appeals',           href: '/dashboard/appeals',         icon: MessageSquare },
  { label: 'Leads Hub',         href: '/dashboard/leads-hub',       icon: Zap },
  { label: 'Billing',           href: '/dashboard/billing',         icon: CreditCard },
  { label: 'Settings',          href: '/dashboard/settings',        icon: Settings },
]

export default function DashboardSidebar() {
  const pathname = usePathname()
  const router   = useRouter()

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
          Flow Pilot
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
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
      </nav>

      {/* Sign out — plain button, no avatar, destructive hover */}
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
