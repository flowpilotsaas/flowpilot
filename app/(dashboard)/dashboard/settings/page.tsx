'use client'

/*
  SQL — run in Supabase SQL editor to add columns to user_settings:

  alter table public.user_settings
    add column if not exists company_name text,
    add column if not exists industry text,
    add column if not exists timezone text;
*/

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Building2, Lock, Plug, User, CheckCircle2, CreditCard, ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

const INDUSTRIES = [
  'HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning',
  'Pest Control', 'Appliance Repair', 'General Contractor', 'Other',
]

type StripeRow = {
  stripe_account_id: string | null
  charges_enabled: boolean
  details_submitted: boolean
}

export default function SettingsPage() {
  // ── Company info ────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = React.useState('')
  const [industry, setIndustry]       = React.useState('')
  const [timezone, setTimezone]       = React.useState('')
  const [savingCompany, setSavingCompany] = React.useState(false)
  const [companyMsg, setCompanyMsg]   = React.useState('')
  const [settingsId, setSettingsId]   = React.useState<string | null>(null)
  const [orgId, setOrgId]             = React.useState<string | null>(null)

  // ── Password ────────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw]     = React.useState('')
  const [newPw, setNewPw]             = React.useState('')
  const [confirmPw, setConfirmPw]     = React.useState('')
  const [savingPw, setSavingPw]       = React.useState(false)
  const [pwMsg, setPwMsg]             = React.useState('')
  const [pwError, setPwError]         = React.useState('')

  // ── Account info ─────────────────────────────────────────────────────────
  const [email, setEmail]             = React.useState('')
  const [memberSince, setMemberSince] = React.useState('')
  const [loadingUser, setLoadingUser] = React.useState(true)
  const [orgRole, setOrgRole]         = React.useState<string | null>(null)

  // ── Stripe Connect ───────────────────────────────────────────────────────
  const [stripeRow, setStripeRow]         = React.useState<StripeRow>({
    stripe_account_id: null, charges_enabled: false, details_submitted: false,
  })
  const [stripeLoading, setStripeLoading]       = React.useState(false)
  const [showDisconnect, setShowDisconnect]     = React.useState(false)
  const [disconnecting, setDisconnecting]       = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')
      setMemberSince(
        new Date(user.created_at).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })
      )

      // Resolve the user's org + role
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (membership?.organization_id) {
        setOrgId(membership.organization_id)
        setOrgRole(membership.role ?? null)

        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', membership.organization_id)
          .maybeSingle()
        if (org) setCompanyName(org.name ?? '')

        // Load Stripe Connect status
        const { data: stripeData } = await supabase
          .from('organization_stripe_accounts')
          .select('stripe_account_id, charges_enabled, details_submitted')
          .eq('organization_id', membership.organization_id)
          .maybeSingle()

        setStripeRow({
          stripe_account_id: stripeData?.stripe_account_id ?? null,
          charges_enabled:   stripeData?.charges_enabled   ?? false,
          details_submitted: stripeData?.details_submitted ?? false,
        })

        // Handle Stripe redirect params (?stripe=return|refresh)
        if (typeof window !== 'undefined') {
          const params    = new URLSearchParams(window.location.search)
          const stripeParam = params.get('stripe')
          if (stripeParam) {
            window.history.replaceState({}, '', '/dashboard/settings')

            if (stripeParam === 'return') {
              // Refresh status from Stripe after onboarding
              const res = await fetch('/api/stripe/connect/status', { method: 'POST' })
              if (res.ok) {
                const refreshed = await res.json()
                setStripeRow(prev => ({ ...prev, ...refreshed }))
              } else {
                toast.error('Could not refresh Stripe status.')
              }
            } else if (stripeParam === 'refresh') {
              // Account link expired — get a new one
              const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
              if (res.ok) {
                const { url } = await res.json()
                if (url) window.location.href = url
              } else {
                toast.error('Could not restart Stripe onboarding.')
              }
            }
          }
        }
      }

      // user_settings stores industry/timezone only (company name lives on organizations)
      const { data } = await supabase
        .from('user_settings')
        .select('id, industry, timezone')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setSettingsId(data.id)
        setIndustry(data.industry ?? '')
        setTimezone(data.timezone ?? '')
      }

      setLoadingUser(false)
    }
    load()
  }, [])

  const handleSaveCompany = async () => {
    setSavingCompany(true)
    setCompanyMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingCompany(false); return }

    // Write company name to organizations.name — the single source of truth
    if (orgId) {
      const { error: orgError } = await supabase
        .from('organizations')
        .update({ name: companyName.trim() || null })
        .eq('id', orgId)
      if (orgError) {
        setCompanyMsg(`error:${orgError.message}`)
        setSavingCompany(false)
        return
      }
    }

    // user_settings stores industry/timezone only
    const { data, error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id:  user.id,
          industry: industry || null,
          timezone: timezone.trim() || null,
        },
        { onConflict: 'user_id' },
      )
      .select('id')
      .single()

    if (error) {
      setCompanyMsg(`error:${error.message}`)
      setSavingCompany(false)
      return
    }
    if (data) setSettingsId(data.id)

    setCompanyMsg('success:Changes saved successfully.')
    setSavingCompany(false)
    setTimeout(() => setCompanyMsg(''), 4000)
  }

  const handleChangePassword = async () => {
    setPwError('')
    setPwMsg('')

    if (!currentPw)          { setPwError('Current password is required.'); return }
    if (!newPw)              { setPwError('New password is required.'); return }
    if (newPw.length < 6)    { setPwError('Password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }

    setSavingPw(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPwError('Could not retrieve account email.'); setSavingPw(false); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    user.email,
      password: currentPw,
    })
    if (signInError) {
      setPwError('Current password is incorrect.')
      setSavingPw(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPw })
    if (updateError) { setPwError(updateError.message); setSavingPw(false); return }

    setPwMsg('Password updated successfully.')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setSavingPw(false)
    setTimeout(() => setPwMsg(''), 4000)
  }

  const handleConnectStripe = async () => {
    setStripeLoading(true)
    try {
      const res  = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(`Could not start Stripe onboarding: ${data.error ?? 'Unknown error'}`)
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Could not start Stripe onboarding.')
    } finally {
      setStripeLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res  = await fetch('/api/stripe/connect/disconnect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Could not disconnect Stripe.'); return }
      setStripeRow({ stripe_account_id: null, charges_enabled: false, details_submitted: false })
      setShowDisconnect(false)
      toast.success('Stripe account disconnected.')
    } catch {
      toast.error('Could not disconnect Stripe.')
    } finally {
      setDisconnecting(false)
    }
  }

  const isPrivileged = orgRole === 'owner' || orgRole === 'admin'

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and company preferences</p>
      </div>

      {/* ── Company Information ── */}
      <Section icon={Building2} title="Company Information" subtitle="Update your business profile">
        {loadingUser ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Company Name">
              <Input
                placeholder="e.g. Smith HVAC Services"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </Field>
            <Field label="Industry">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select an industry…</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <Input
                placeholder="e.g. America/New_York"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSaveCompany} disabled={savingCompany} className="gap-2">
                {savingCompany && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </Button>
              <InlineMsg msg={companyMsg} />
            </div>
          </div>
        )}
      </Section>

      {/* ── Get Paid with Stripe ── */}
      <Section icon={CreditCard} title="Get Paid with Stripe" subtitle="Accept card payments on estimates">
        {loadingUser ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : stripeRow.charges_enabled ? (
          /* ── State 3: fully connected ── */
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Stripe connected</p>
                <p className="text-xs text-muted-foreground">Payments are enabled on your estimates</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {isPrivileged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnect(true)}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        ) : stripeRow.stripe_account_id ? (
          /* ── State 2: account created but onboarding incomplete ── */
          <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Finish your Stripe setup</p>
                <p className="text-xs text-muted-foreground">Complete onboarding to enable payments</p>
              </div>
            </div>
            {isPrivileged && (
              <Button
                size="sm"
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                className="gap-2"
              >
                {stripeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Finish setup
              </Button>
            )}
          </div>
        ) : (
          /* ── State 1: not connected ── */
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground">
                S
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Stripe</p>
                <p className="text-xs text-muted-foreground">Connect Stripe to accept payments on estimates</p>
              </div>
            </div>
            {isPrivileged && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                className="gap-2"
              >
                {stripeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect
              </Button>
            )}
          </div>
        )}
      </Section>

      {/* ── Change Password ── */}
      <Section icon={Lock} title="Change Password" subtitle="Update your login password">
        <div className="space-y-4">
          <Field label="Current Password">
            <Input
              type="password"
              placeholder="••••••••"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </Field>
          <Field label="New Password">
            <Input
              type="password"
              placeholder="••••••••"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </Field>
          <Field label="Confirm New Password">
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleChangePassword} disabled={savingPw} className="gap-2">
              {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </Button>
            {pwError && (
              <p className="text-sm text-destructive">{pwError}</p>
            )}
            {pwMsg && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {pwMsg}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* ── Integrations ── */}
      <Section icon={Plug} title="Integrations" subtitle="Connect third-party services">
        <div className="space-y-3">
          <IntegrationRow
            name="QuickBooks"
            description="Sync invoices and payments with QuickBooks Online"
            logoInitials="QB"
            logoBg="bg-green-100 dark:bg-green-900/30"
            logoColor="text-green-700 dark:text-green-400"
          />
          <IntegrationRow
            name="Google Business Profile"
            description="Sync reviews and manage posts from Google"
            logoInitials="G"
            logoBg="bg-blue-100 dark:bg-blue-900/30"
            logoColor="text-blue-700 dark:text-blue-400"
          />
        </div>
      </Section>

      {/* ── Account Information ── */}
      <Section icon={User} title="Account Information" subtitle="Your login and account details">
        {loadingUser ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <AccountRow label="Email"        value={email || '—'} />
            <AccountRow label="Role"         value="Admin" />
            <AccountRow label="Member Since" value={memberSince || '—'} />
          </div>
        )}
      </Section>

      {/* ── Disconnect confirmation modal ── */}
      <DeleteConfirmModal
        open={showDisconnect}
        title="Disconnect Stripe"
        message="This will unlink your Stripe account. Existing paid invoices are not affected, but new estimate payment links will stop working until you reconnect."
        confirmLabel="Disconnect"
        onCancel={() => setShowDisconnect(false)}
        onConfirm={handleDisconnect}
        loading={disconnecting}
      />
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

// msg format: "success:text" | "error:text" | ""
function InlineMsg({ msg }: { msg: string }) {
  if (!msg) return null
  const isSuccess = msg.startsWith('success:')
  const text = msg.replace(/^(success|error):/, '')
  if (isSuccess) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        {text}
      </span>
    )
  }
  return <p className="text-sm text-destructive">{text}</p>
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function IntegrationRow({
  name,
  description,
  logoInitials,
  logoBg,
  logoColor,
}: {
  name: string
  description: string
  logoInitials: string
  logoBg: string
  logoColor: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${logoBg} ${logoColor}`}>
          {logoInitials}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm">Connect</Button>
    </div>
  )
}
