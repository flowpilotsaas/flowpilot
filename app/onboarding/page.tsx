'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

const INDUSTRIES = [
  { id: 'HVAC',        label: 'HVAC',        icon: '🌡️' },
  { id: 'Plumbing',    label: 'Plumbing',    icon: '🔧' },
  { id: 'Electrical',  label: 'Electrical',  icon: '⚡' },
  { id: 'Landscaping', label: 'Landscaping', icon: '🌿' },
  { id: 'Cleaning',    label: 'Cleaning',    icon: '🧹' },
  { id: 'Other',       label: 'Other',       icon: '🔩' },
]

const TEAM_SIZES = ['Just me', '2–5', '6–15', '16+']

const GOALS = [
  { id: 'Schedule jobs',    label: 'Schedule jobs',    icon: '📅' },
  { id: 'Send estimates',   label: 'Send estimates',   icon: '📋' },
  { id: 'Get paid',         label: 'Get paid',         icon: '💳' },
  { id: 'Remind customers', label: 'Remind customers', icon: '🔔' },
]

const GOAL_ACTIONS: Record<string, { label: string; desc: string; href: string }> = {
  'Schedule jobs':    { label: 'Add your first job',       desc: 'Create and assign jobs to your team.',       href: '/dashboard/jobs' },
  'Send estimates':   { label: 'Create an estimate',       desc: 'Send a professional quote to a customer.',   href: '/dashboard/estimates' },
  'Get paid':         { label: 'Set up Stripe Payments',   desc: 'Accept card payments on estimates.',         href: '/dashboard/settings' },
  'Remind customers': { label: 'Add a customer',           desc: 'Build your customer list.',                  href: '/dashboard/customers' },
}

const DEFAULT_ACTIONS = [
  { label: 'Add a customer',   desc: 'Build your customer list.',                href: '/dashboard/customers' },
  { label: 'Create a job',     desc: 'Schedule and manage work orders.',          href: '/dashboard/jobs' },
  { label: 'Explore Settings', desc: 'Connect Stripe and customize your account.', href: '/dashboard/settings' },
]

// ─── component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [orgId,    setOrgId]    = React.useState<string | null>(null)
  const [step,     setStep]     = React.useState(1)
  const [loading,  setLoading]  = React.useState(true)
  const [saving,   setSaving]   = React.useState(false)

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

      // Already finished — send to dashboard
      if (org.onboarding_completed_at) { router.replace('/dashboard'); return }

      // Prefill
      setBizName(org.name    ?? '')
      setPhone(org.phone     ?? '')
      setIndustries(org.industries ?? [])
      setTeamSize(org.team_size ?? '')
      setGoals(org.goals ?? [])

      // Resume where they left off
      const saved = typeof org.onboarding_step === 'number' ? org.onboarding_step : 0
      setStep(Math.min(Math.max(saved + 1, 1), TOTAL_STEPS))
      setLoading(false)
    }
    init()
  }, [router])

  // ── helpers ─────────────────────────────────────────────────────────────────

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

  // ── suggested actions for step 5 ────────────────────────────────────────────

  const suggestedActions = React.useMemo(() => {
    const matched = goals
      .map(g => GOAL_ACTIONS[g])
      .filter(Boolean)
      .slice(0, 3)
    return matched.length > 0 ? matched : DEFAULT_ACTIONS.slice(0, 3)
  }, [goals])

  // ─── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── progress bar ── */}
      <div className="w-full h-1.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* ── centered content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* step dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={[
                  'rounded-full transition-all',
                  i + 1 < step  ? 'w-2 h-2 bg-primary'          : '',
                  i + 1 === step ? 'w-3 h-3 bg-primary'          : '',
                  i + 1 > step  ? 'w-2 h-2 bg-muted-foreground/30' : '',
                ].join(' ')}
              />
            ))}
          </div>

          {/* ── step content ── */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-8">

            {step === 1 && (
              <StepWrap
                title="Welcome to Jobigram!"
                subtitle="Let's set up your account in a few quick steps."
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Business name</label>
                    <Input
                      placeholder="e.g. Smith HVAC Services"
                      value={bizName}
                      onChange={e => setBizName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Phone <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="e.g. (555) 123-4567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </StepWrap>
            )}

            {step === 2 && (
              <StepWrap
                title="What kind of work do you do?"
                subtitle="Select all that apply. We'll tailor Jobigram to your trade."
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {INDUSTRIES.map(ind => (
                    <SelectCard
                      key={ind.id}
                      icon={ind.icon}
                      label={ind.label}
                      selected={industries.includes(ind.id)}
                      onClick={() => toggleMulti(industries, ind.id, setIndustries)}
                    />
                  ))}
                </div>
              </StepWrap>
            )}

            {step === 3 && (
              <StepWrap
                title="How big is your team?"
                subtitle="Pick the option that best describes you right now."
              >
                <div className="grid grid-cols-2 gap-3">
                  {TEAM_SIZES.map(size => (
                    <SelectCard
                      key={size}
                      label={size}
                      selected={teamSize === size}
                      onClick={() => setTeamSize(size)}
                    />
                  ))}
                </div>
              </StepWrap>
            )}

            {step === 4 && (
              <StepWrap
                title="What do you want to do first?"
                subtitle="Select everything you're hoping to accomplish."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOALS.map(g => (
                    <SelectCard
                      key={g.id}
                      icon={g.icon}
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
                title="You're all set! 🎉"
                subtitle="Here's where to start based on your goals."
              >
                <div className="space-y-3">
                  {suggestedActions.map(action => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </StepWrap>
            )}

            {/* ── navigation ── */}
            <div className="flex items-center justify-between mt-8">
              <div>
                {step > 1 ? (
                  <Button variant="outline" onClick={handleBack} disabled={saving}>
                    Back
                  </Button>
                ) : (
                  <div />
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={skip}
                  disabled={saving}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Skip for now
                </button>
                <Button onClick={handleNext} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {step === TOTAL_STEPS ? 'Go to dashboard' : 'Next'}
                </Button>
              </div>
            </div>

          </div>

          {/* step counter */}
          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            Step {step} of {TOTAL_STEPS}
          </p>

        </div>
      </div>
    </div>
  )
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StepWrap({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
      {children}
    </div>
  )
}

function SelectCard({
  icon,
  label,
  selected,
  onClick,
}: {
  icon?: string
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all cursor-pointer',
        selected
          ? 'border-primary bg-primary/8 text-foreground shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
      ].join(' ')}
    >
      {selected && (
        <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />
      )}
      {icon && <span className="text-xl leading-none">{icon}</span>}
      {label}
    </button>
  )
}
