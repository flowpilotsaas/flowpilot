'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Loader2, CheckCircle2, ChevronRight, Check,
  Snowflake, Droplets, Zap, Leaf, Sparkles, Wrench,
  User, Users, Building2, Landmark,
  CalendarDays, FileText, CreditCard, Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── ambient CSS injected inline so the bg / orbs / transitions work ─────────

const AMBIENT_CSS = `
  .ob-bg {
    background: hsl(240 22% 97%);
    position: relative;
    overflow: hidden;
  }
  .dark .ob-bg { background: hsl(230 26% 9%); }

  .ob-card {
    background: rgba(255,255,255,0.76);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(200,200,230,0.55);
    border-radius: 24px;
    box-shadow:
      0 2px 4px rgba(0,0,0,0.04),
      0 12px 40px rgba(80,40,200,0.08),
      0 40px 80px rgba(0,0,0,0.06);
    padding: 40px;
  }
  .dark .ob-card {
    background: rgba(13,12,26,0.76);
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow:
      0 2px 4px rgba(0,0,0,0.18),
      0 12px 40px rgba(0,0,0,0.28),
      0 40px 80px rgba(0,0,0,0.22);
  }

  /* ── ambient orbs ─────────────────────────────────────────────────────── */
  .ob-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
    z-index: 0;
  }
  .ob-orb-1 {
    width: 520px; height: 520px;
    top: -130px; left: -100px;
    background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 68%);
  }
  .dark .ob-orb-1 {
    background: radial-gradient(circle, rgba(109,40,217,0.28) 0%, transparent 68%);
  }
  .ob-orb-2 {
    width: 450px; height: 450px;
    bottom: -110px; right: -90px;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 68%);
  }
  .dark .ob-orb-2 {
    background: radial-gradient(circle, rgba(79,70,229,0.24) 0%, transparent 68%);
  }
  .ob-orb-3 {
    width: 360px; height: 360px;
    bottom: 22%; left: 14%;
    background: radial-gradient(circle, rgba(20,184,166,0.10) 0%, transparent 68%);
  }
  .dark .ob-orb-3 {
    background: radial-gradient(circle, rgba(20,184,166,0.16) 0%, transparent 68%);
  }

  @media (prefers-reduced-motion: no-preference) {
    .ob-orb-1 { animation: obDrift1 28s ease-in-out infinite alternate; }
    .ob-orb-2 { animation: obDrift2 24s ease-in-out infinite alternate; }
    .ob-orb-3 { animation: obDrift3 32s ease-in-out infinite alternate; }
    @keyframes obDrift1 {
      from { transform: translate(0px, 0px); }
      to   { transform: translate(80px, 60px); }
    }
    @keyframes obDrift2 {
      from { transform: translate(0px, 0px); }
      to   { transform: translate(-60px, -80px); }
    }
    @keyframes obDrift3 {
      from { transform: translate(0px, 0px) scale(1); }
      to   { transform: translate(50px, -50px) scale(1.08); }
    }
  }

  /* ── vignette ─────────────────────────────────────────────────────────── */
  .ob-vignette {
    position: fixed; inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse 90% 90% at 50% 50%, transparent 46%, rgba(0,0,0,0.05) 100%);
    z-index: 1;
  }
  .dark .ob-vignette {
    background: radial-gradient(ellipse 90% 90% at 50% 50%, transparent 38%, rgba(0,0,0,0.28) 100%);
  }

  /* ── step transition ──────────────────────────────────────────────────── */
  .ob-step-enter {
    animation: obStepIn 250ms ease-out both;
  }
  @keyframes obStepIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0px); }
  }

  /* ── step-5 success icon ──────────────────────────────────────────────── */
  .ob-success-pop {
    animation: obSuccessPop 380ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
  }
  @keyframes obSuccessPop {
    from { opacity: 0; transform: scale(0.55); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* ── mobile ───────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .ob-card { padding: 28px 20px; }
    .ob-orb-1 { width: 280px; height: 280px; }
    .ob-orb-2 { width: 240px; height: 240px; }
    .ob-orb-3 { width: 180px; height: 180px; }
  }
`

// ─── data ─────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

const INDUSTRIES = [
  { id: 'HVAC',        label: 'HVAC',        Icon: Snowflake },
  { id: 'Plumbing',    label: 'Plumbing',    Icon: Droplets  },
  { id: 'Electrical',  label: 'Electrical',  Icon: Zap       },
  { id: 'Landscaping', label: 'Landscaping', Icon: Leaf      },
  { id: 'Cleaning',    label: 'Cleaning',    Icon: Sparkles  },
  { id: 'Other',       label: 'Other',       Icon: Wrench    },
]

const TEAM_SIZE_OPTS = [
  { id: 'Just me', label: 'Just me', Icon: User      },
  { id: '2–5',     label: '2–5',     Icon: Users     },
  { id: '6–15',    label: '6–15',    Icon: Building2 },
  { id: '16+',     label: '16+',     Icon: Landmark  },
]

const GOAL_OPTS = [
  { id: 'Schedule jobs',    label: 'Schedule jobs',    Icon: CalendarDays },
  { id: 'Send estimates',   label: 'Send estimates',   Icon: FileText     },
  { id: 'Get paid',         label: 'Get paid',         Icon: CreditCard   },
  { id: 'Remind customers', label: 'Remind customers', Icon: Bell         },
]

const GOAL_ACTIONS: Record<string, { label: string; desc: string; href: string }> = {
  'Schedule jobs':    { label: 'Add your first job',     desc: 'Create and assign jobs to your team.',     href: '/dashboard/jobs'      },
  'Send estimates':   { label: 'Create an estimate',     desc: 'Send a professional quote to a customer.', href: '/dashboard/estimates' },
  'Get paid':         { label: 'Set up Stripe Payments', desc: 'Accept card payments on estimates.',       href: '/dashboard/settings'  },
  'Remind customers': { label: 'Add a customer',         desc: 'Build your customer list.',                href: '/dashboard/customers' },
}

const DEFAULT_ACTIONS = [
  { label: 'Add a customer',   desc: 'Build your customer list.',                  href: '/dashboard/customers' },
  { label: 'Create a job',     desc: 'Schedule and manage work orders.',            href: '/dashboard/jobs'      },
  { label: 'Explore Settings', desc: 'Connect Stripe and customize your account.', href: '/dashboard/settings'  },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [orgId,   setOrgId]   = React.useState<string | null>(null)
  const [step,    setStep]    = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [saving,  setSaving]  = React.useState(false)

  // step 1
  const [bizName, setBizName] = React.useState('')
  const [phone,   setPhone]   = React.useState('')
  // step 2
  const [industries, setIndustries] = React.useState<string[]>([])
  // step 3
  const [teamSize, setTeamSize] = React.useState('')
  // step 4
  const [goals, setGoals] = React.useState<string[]>([])

  // ── auth + load org ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!membership?.organization_id) { router.replace('/dashboard'); return }

      const oid = membership.organization_id
      setOrgId(oid)

      const { data: org } = await supabase
        .from('organizations')
        .select('name, phone, industries, team_size, goals, onboarding_step, onboarding_completed_at')
        .eq('id', oid)
        .maybeSingle()

      if (!org) { router.replace('/dashboard'); return }
      if (org.onboarding_completed_at) { router.replace('/dashboard'); return }

      setBizName(org.name    ?? '')
      setPhone(org.phone     ?? '')
      setIndustries(org.industries ?? [])
      setTeamSize(org.team_size ?? '')
      setGoals(org.goals ?? [])

      const saved = typeof org.onboarding_step === 'number' ? org.onboarding_step : 0
      setStep(Math.min(Math.max(saved + 1, 1), TOTAL_STEPS))
      setLoading(false)
    }
    init()
  }, [router])

  // ── helpers (logic unchanged) ────────────────────────────────────────────────

  async function saveStep(patch: Record<string, unknown>, nextStep: number) {
    if (!orgId) return
    const { error } = await supabase
      .from('organizations')
      .update({ ...patch, onboarding_step: nextStep - 1 })
      .eq('id', orgId)
    if (error) toast.error(`Could not save: ${error.message}`)
  }

  async function finish() {
    if (!orgId) return
    const { error } = await supabase
      .from('organizations')
      .update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: TOTAL_STEPS })
      .eq('id', orgId)
    if (error) { toast.error(`Could not complete setup: ${error.message}`); return }
    router.replace('/dashboard')
  }

  async function skip() {
    if (!orgId) return
    const { error } = await supabase
      .from('organizations')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', orgId)
    if (error) { toast.error(`Could not skip: ${error.message}`); return }
    router.replace('/dashboard')
  }

  async function handleNext() {
    setSaving(true)
    try {
      if (step === 1) {
        await saveStep({ name: bizName.trim() || null, phone: phone.trim() || null }, 2)
        setStep(2)
      } else if (step === 2) {
        await saveStep({ industries }, 3)
        setStep(3)
      } else if (step === 3) {
        await saveStep({ team_size: teamSize || null }, 4)
        setStep(4)
      } else if (step === 4) {
        await saveStep({ goals }, 5)
        setStep(5)
      } else {
        await finish()
      }
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    setStep(s => Math.max(s - 1, 1))
  }

  function toggleMulti(arr: string[], id: string, set: (v: string[]) => void) {
    set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])
  }

  const suggestedActions = React.useMemo(() => {
    const matched = goals.map(g => GOAL_ACTIONS[g]).filter(Boolean).slice(0, 3)
    return matched.length > 0 ? matched : DEFAULT_ACTIONS.slice(0, 3)
  }, [goals])

  // ── render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <style>{AMBIENT_CSS}</style>
        <div className="ob-bg min-h-screen flex items-center justify-center">
          <div className="ob-orb ob-orb-1" />
          <div className="ob-orb ob-orb-2" />
          <div className="ob-vignette" />
          <Loader2 className="relative z-10 w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  const step5Title = bizName.trim()
    ? `You're all set, ${bizName.trim()}`
    : "You're all set"

  return (
    <>
      <style>{AMBIENT_CSS}</style>
      <div className="ob-bg min-h-screen flex flex-col">
        <div className="ob-orb ob-orb-1" />
        <div className="ob-orb ob-orb-2" />
        <div className="ob-orb ob-orb-3" />
        <div className="ob-vignette" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-[560px]">

            {/* Wordmark */}
            <p className="text-center text-[15px] font-bold tracking-tight text-foreground/80 mb-5 select-none">
              Jobigram
            </p>

            {/* Frosted-glass card */}
            <div className="ob-card">

              {/* Progress */}
              <div className="mb-8">
                <p className="text-xs font-medium text-muted-foreground mb-2.5">
                  Step {step} of {TOTAL_STEPS}
                </p>
                <div className="flex gap-1.5">
                  {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                    <div
                      key={i}
                      className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                        i + 1 <= step ? 'bg-primary' : 'bg-muted-foreground/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Step content — key re-mounts on change → triggers CSS fade-slide-in */}
              <div key={step} className="ob-step-enter">

                {step === 1 && (
                  <StepWrap
                    title="Welcome to Jobigram"
                    subtitle="Let's set up your workspace. It takes about a minute."
                  >
                    <div className="space-y-4">
                      <Field label="Business name">
                        <Input
                          placeholder="e.g. Smith HVAC Services"
                          value={bizName}
                          onChange={e => setBizName(e.target.value)}
                        />
                      </Field>
                      <Field label="Phone" optional>
                        <Input
                          type="tel"
                          placeholder="e.g. (555) 123-4567"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                        />
                      </Field>
                    </div>
                  </StepWrap>
                )}

                {step === 2 && (
                  <StepWrap
                    title="What kind of work do you do?"
                    subtitle="Pick everything that applies."
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {INDUSTRIES.map(ind => (
                        <SelectCard
                          key={ind.id}
                          Icon={ind.Icon}
                          label={ind.label}
                          selected={industries.includes(ind.id)}
                          onClick={() => toggleMulti(industries, ind.id, setIndustries)}
                        />
                      ))}
                    </div>
                  </StepWrap>
                )}

                {step === 3 && (
                  <StepWrap title="How big is your team?">
                    <div className="grid grid-cols-2 gap-3">
                      {TEAM_SIZE_OPTS.map(opt => (
                        <SelectCard
                          key={opt.id}
                          Icon={opt.Icon}
                          label={opt.label}
                          selected={teamSize === opt.id}
                          onClick={() => setTeamSize(opt.id)}
                        />
                      ))}
                    </div>
                  </StepWrap>
                )}

                {step === 4 && (
                  <StepWrap
                    title="What would you like to do first?"
                    subtitle="We'll point you to the right place to start."
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {GOAL_OPTS.map(g => (
                        <SelectCard
                          key={g.id}
                          Icon={g.Icon}
                          label={g.label}
                          selected={goals.includes(g.id)}
                          onClick={() => toggleMulti(goals, g.id, setGoals)}
                        />
                      ))}
                    </div>
                  </StepWrap>
                )}

                {step === 5 && (
                  <StepWrap
                    title={step5Title}
                    subtitle="Here's where to start based on your goals."
                    icon={
                      <CheckCircle2 className="ob-success-pop w-10 h-10 text-primary mx-auto mb-4" />
                    }
                    centered
                  >
                    <div className="space-y-2.5">
                      {suggestedActions.map(action => (
                        <Link
                          key={action.href}
                          href={action.href}
                          className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/[0.04] transition-all duration-150 cursor-pointer group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">{action.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </StepWrap>
                )}

              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
                <div>
                  {step > 1 ? (
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={saving}
                      className="cursor-pointer"
                    >
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={skip}
                    disabled={saving}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Skip for now
                  </button>
                  <Button
                    onClick={handleNext}
                    disabled={saving}
                    className="gap-2 rounded-full px-6 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {step === TOTAL_STEPS ? 'Go to dashboard' : 'Next'}
                  </Button>
                </div>
              </div>

            </div>
            {/* end card */}

          </div>
        </div>
      </div>
    </>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StepWrap({
  title,
  subtitle,
  icon,
  centered,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  centered?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      {icon && (
        <div className={centered ? 'text-center' : ''}>
          {icon}
        </div>
      )}
      <h1 className={`text-[1.35rem] font-bold text-foreground leading-tight ${centered ? 'text-center' : ''}`}>
        {title}
      </h1>
      {subtitle ? (
        <p className={`text-sm text-muted-foreground mt-1.5 mb-6 ${centered ? 'text-center' : ''}`}>
          {subtitle}
        </p>
      ) : (
        <div className="mb-6" />
      )}
      {children}
    </div>
  )
}

function Field({
  label,
  optional,
  children,
}: {
  label: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal ml-1.5">(optional)</span>
        )}
      </label>
      {children}
    </div>
  )
}

function SelectCard({
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
          <Icon
            className={`w-5 h-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`}
          />
        </span>
      )}
      {label}
    </button>
  )
}
