import * as React from 'react'
import {
  Snowflake, Droplets, Zap, Leaf, Sparkles, Wrench,
  User, Users, Building2, Landmark,
  CalendarDays, FileText, CreditCard, Bell,
  Check,
} from 'lucide-react'

// ─── option data (single source of truth for wizard + settings) ───────────────

export const INDUSTRIES = [
  { id: 'HVAC',        label: 'HVAC',        Icon: Snowflake },
  { id: 'Plumbing',    label: 'Plumbing',    Icon: Droplets  },
  { id: 'Electrical',  label: 'Electrical',  Icon: Zap       },
  { id: 'Landscaping', label: 'Landscaping', Icon: Leaf      },
  { id: 'Cleaning',    label: 'Cleaning',    Icon: Sparkles  },
  { id: 'Other',       label: 'Other',       Icon: Wrench    },
]

export const TEAM_SIZE_OPTS = [
  { id: 'Just me', label: 'Just me', Icon: User      },
  { id: '2–5',     label: '2–5',     Icon: Users     },
  { id: '6–15',    label: '6–15',    Icon: Building2 },
  { id: '16+',     label: '16+',     Icon: Landmark  },
]

export const GOAL_OPTS = [
  { id: 'Schedule jobs',    label: 'Schedule jobs',    Icon: CalendarDays },
  { id: 'Send estimates',   label: 'Send estimates',   Icon: FileText     },
  { id: 'Get paid',         label: 'Get paid',         Icon: CreditCard   },
  { id: 'Remind customers', label: 'Remind customers', Icon: Bell         },
]

export const GOAL_ACTIONS: Record<string, { label: string; desc: string; href: string }> = {
  'Schedule jobs':    { label: 'Add your first job',     desc: 'Create and assign jobs to your team.',     href: '/dashboard/jobs'      },
  'Send estimates':   { label: 'Create an estimate',     desc: 'Send a professional quote to a customer.', href: '/dashboard/estimates' },
  'Get paid':         { label: 'Set up Stripe Payments', desc: 'Accept card payments on estimates.',       href: '/dashboard/settings'  },
  'Remind customers': { label: 'Add a customer',         desc: 'Build your customer list.',                href: '/dashboard/customers' },
}

export const DEFAULT_ACTIONS = [
  { label: 'Add a customer',   desc: 'Build your customer list.',                  href: '/dashboard/customers' },
  { label: 'Create an estimate', desc: 'Send a professional quote to a customer.', href: '/dashboard/estimates' },
  { label: 'Explore Settings', desc: 'Connect Stripe and customize your account.', href: '/dashboard/settings'  },
]

// ─── shared SelectCard component ─────────────────────────────────────────────

export function SelectCard({
  Icon,
  label,
  selected,
  onClick,
}: {
  Icon?: React.ElementType
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col items-center gap-3 rounded-2xl border p-4 text-sm font-medium',
        'transition-all duration-150 cursor-pointer select-none',
        'hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]',
        selected
          ? 'border-primary bg-primary/[0.07] text-foreground shadow-sm ring-1 ring-primary/20'
          : 'border-border bg-transparent text-muted-foreground hover:border-primary/35 hover:bg-muted/40 hover:text-foreground',
      ].join(' ')}
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
        </span>
      )}
      {Icon && (
        <span
          className={[
            'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
            selected ? 'bg-primary/15' : 'bg-muted',
          ].join(' ')}
        >
          <Icon className={`w-5 h-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
        </span>
      )}
      {label}
    </button>
  )
}
