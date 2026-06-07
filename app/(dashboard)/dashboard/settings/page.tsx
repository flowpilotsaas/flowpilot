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
import { Loader2, Building2, Lock, Plug, User, CheckCircle2 } from 'lucide-react'

const INDUSTRIES = [
  'HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning',
  'Pest Control', 'Appliance Repair', 'General Contractor', 'Other',
]

export default function SettingsPage() {
  // ── Company info ────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = React.useState('')
  const [industry, setIndustry]       = React.useState('')
  const [timezone, setTimezone]       = React.useState('')
  const [savingCompany, setSavingCompany] = React.useState(false)
  const [companyMsg, setCompanyMsg]   = React.useState('')
  const [settingsId, setSettingsId]   = React.useState<string | null>(null)

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

      const { data } = await supabase
        .from('user_settings')
        .select('id, company_name, industry, timezone')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setSettingsId(data.id)
        setCompanyName(data.company_name ?? '')
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

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id:      user.id,
          company_name: companyName.trim() || null,
          industry:     industry || null,
          timezone:     timezone.trim() || null,
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

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
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
