'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus, Loader2, Users, Check, X, Mail,
  MoreHorizontal, UserX, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'members' | 'pending' | 'roles'
type OrgRole = 'owner' | 'admin' | 'technician'

type OrgMember = {
  id: string
  organization_id: string
  user_id: string | null
  email: string
  role: OrgRole
  status: string
  created_at: string
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PERMISSIONS = [
  { label: 'View Jobs',         Owner: true,  Admin: true,  Technician: true  },
  { label: 'Create / Edit Jobs',Owner: true,  Admin: true,  Technician: false },
  { label: 'View Estimates',    Owner: true,  Admin: true,  Technician: false },
  { label: 'Edit Estimates',    Owner: true,  Admin: true,  Technician: false },
  { label: 'Manage Team',       Owner: true,  Admin: false, Technician: false },
  { label: 'Billing',           Owner: true,  Admin: false, Technician: false },
  { label: 'Settings',          Owner: true,  Admin: false, Technician: false },
]

const ROLE_BADGE: Record<OrgRole, string> = {
  owner:      'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  admin:      'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  technician: 'bg-muted text-muted-foreground',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function roleLabel(r: OrgRole) {
  return r.charAt(0).toUpperCase() + r.slice(1)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PermIcon({ allowed }: { allowed: boolean }) {
  return allowed
    ? <Check className="w-4 h-4 text-green-600 mx-auto" />
    : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { organizationId, role: currentUserRole } = useOrganization()
  const [activeTab, setActiveTab] = React.useState<Tab>('members')
  const [members, setMembers]     = React.useState<OrgMember[]>([])
  const [loading, setLoading]     = React.useState(true)

  // Invite modal
  const [inviteOpen, setInviteOpen]   = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole]   = React.useState<'admin' | 'technician'>('technician')
  const [inviteError, setInviteError] = React.useState('')
  const [inviting, setInviting]       = React.useState(false)

  const [notificationWarning, setNotificationWarning] = React.useState('')

  // Action states
  const [removeConfirmId, setRemoveConfirmId] = React.useState<string | null>(null)
  const [removingId, setRemovingId]           = React.useState<string | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = React.useState<string | null>(null)
  const [cancellingId, setCancellingId]       = React.useState<string | null>(null)
  const [resendingId, setResendingId]         = React.useState<string | null>(null)

  // ─── Data ────────────────────────────────────────────────────────────────

  const fetchMembers = React.useCallback(async () => {
    if (!organizationId) return
    const { data } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
    if (data) setMembers(data as OrgMember[])
    setLoading(false)
  }, [organizationId])

  React.useEffect(() => { fetchMembers() }, [fetchMembers])

  const activeMembers  = React.useMemo(() => members.filter(m => m.status === 'active'),  [members])
  const pendingInvites = React.useMemo(() => members.filter(m => m.status === 'pending'), [members])

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  // ─── Invite ──────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) { setInviteError('Email is required.'); return }
    if (!organizationId) { setInviteError('Not authenticated.'); return }

    const existing = members.find(m => m.email === email)
    if (existing?.status === 'active')  { setInviteError('This person is already a member.'); return }
    if (existing?.status === 'pending') { setInviteError('A pending invite already exists for this email.'); return }

    setInviting(true)
    setInviteError('')

    const { error } = await supabase.from('organization_members').insert({
      organization_id: organizationId,
      email,
      role: inviteRole,
      status: 'pending',
    })

    if (error) { setInviteError(error.message); setInviting(false); return }

    setInviting(false)
    setInviteOpen(false)
    setInviteEmail('')
    setInviteRole('technician')
    await fetchMembers()

    try {
      const r = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => ({}))
        setNotificationWarning(`Invite created, but the email failed to send: ${(b as { error?: string }).error ?? 'unknown error'}`)
      }
    } catch {
      setNotificationWarning('Invite created, but the email could not be sent (network error).')
    }
  }

  const handleResend = async (member: OrgMember) => {
    setResendingId(member.id)
    try {
      const r = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email, role: member.role }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => ({}))
        setNotificationWarning(`Invite email could not be resent: ${(b as { error?: string }).error ?? 'unknown error'}`)
      }
    } catch {
      setNotificationWarning('Invite email could not be resent (network error).')
    }
    setResendingId(null)
  }

  const handleCancelInvite = async (id: string) => {
    setCancellingId(id)
    await supabase.from('organization_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
    setCancellingId(null)
    setCancelConfirmId(null)
  }

  const handleRemoveMember = async (id: string) => {
    setRemovingId(id)
    await supabase.from('organization_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
    setRemovingId(null)
    setRemoveConfirmId(null)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'members', label: `Members${!loading ? ` (${activeMembers.length})` : ''}` },
    { key: 'pending', label: `Pending${!loading && pendingInvites.length > 0 ? ` (${pendingInvites.length})` : ''}` },
    { key: 'roles',   label: 'Roles & Permissions' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your team members and invites</p>
        </div>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Invite Member
          </Button>
        )}
      </div>

      {notificationWarning && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{notificationWarning}</p>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Members tab ── */}
      {activeTab === 'members' && (
        <Card className="py-0 overflow-hidden">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {loading ? 'Loading…' : `${activeMembers.length} member${activeMembers.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading…
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Users className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No members yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Member Since</th>
                      {canManage && <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 text-foreground">{member.email}</td>
                        <td className="px-6 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ROLE_BADGE[member.role])}>
                            {roleLabel(member.role)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(member.created_at)}</td>
                        {canManage && (
                          <td className="px-6 py-3 text-right whitespace-nowrap">
                            {member.role === 'owner' ? (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            ) : removeConfirmId === member.id ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Remove?</span>
                                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs"
                                  onClick={() => handleRemoveMember(member.id)}
                                  disabled={removingId === member.id}>
                                  {removingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                  onClick={() => setRemoveConfirmId(null)}
                                  disabled={removingId === member.id}>
                                  Cancel
                                </Button>
                              </span>
                            ) : (
                              <MemberActionMenu onRemove={() => setRemoveConfirmId(member.id)} />
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Pending Invites tab ── */}
      {activeTab === 'pending' && (
        <Card className="py-0 overflow-hidden">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {loading ? 'Loading…' : `${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading…
              </div>
            ) : pendingInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Mail className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No pending invites.</p>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 mt-1">
                    <Plus className="w-3.5 h-3.5" /> Invite Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Invited</th>
                      {canManage && <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map((invite) => (
                      <tr key={invite.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 text-foreground">{invite.email}</td>
                        <td className="px-6 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ROLE_BADGE[invite.role])}>
                            {roleLabel(invite.role)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(invite.created_at)}</td>
                        {canManage && (
                          <td className="px-6 py-3 text-right whitespace-nowrap">
                            {cancelConfirmId === invite.id ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Cancel invite?</span>
                                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs"
                                  onClick={() => handleCancelInvite(invite.id)}
                                  disabled={cancellingId === invite.id}>
                                  {cancellingId === invite.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                  onClick={() => setCancelConfirmId(null)}
                                  disabled={cancellingId === invite.id}>
                                  No
                                </Button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                                  onClick={() => handleResend(invite)}
                                  disabled={resendingId === invite.id}>
                                  {resendingId === invite.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <RefreshCw className="w-3 h-3" />}
                                  Resend
                                </Button>
                                <Button size="sm" variant="ghost"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => setCancelConfirmId(invite.id)}>
                                  Cancel
                                </Button>
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Roles & Permissions tab ── */}
      {activeTab === 'roles' && (
        <div className="flex flex-col gap-4">
          <Card className="py-0 overflow-hidden">
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-sm font-normal text-muted-foreground">Permission matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Permission</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground w-28">Owner</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground w-28">Admin</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground w-28">Technician</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((perm) => (
                      <tr key={perm.label} className="border-b border-border last:border-0">
                        <td className="px-6 py-3 font-medium text-foreground">{perm.label}</td>
                        <td className="px-6 py-3"><PermIcon allowed={perm.Owner} /></td>
                        <td className="px-6 py-3"><PermIcon allowed={perm.Admin} /></td>
                        <td className="px-6 py-3"><PermIcon allowed={perm.Technician} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            Roles &amp; permissions are managed by your account owner
          </p>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {inviteOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setInviteOpen(false); setInviteError('') } }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Invite Member</h2>
            <p className="text-sm text-muted-foreground mb-5">
              They&apos;ll receive an email invite to join your organization.
            </p>
            <div className="flex flex-col gap-4">
              <Field label="Email" required>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  autoFocus
                />
              </Field>
              <Field label="Role">
                <NativeSelect
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'technician')}
                >
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                </NativeSelect>
              </Field>
              {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1"
                onClick={() => { setInviteOpen(false); setInviteError('') }}
                disabled={inviting}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleInvite} disabled={inviting}>
                {inviting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
                  : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Member action menu ───────────────────────────────────────────────────────

function MemberActionMenu({ onRemove }: { onRemove: () => void }) {
  const [open, setOpen]     = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef          = React.useRef<HTMLButtonElement>(null)
  const menuRef             = React.useRef<HTMLDivElement>(null)

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 6, left: rect.right - 144 })
    setOpen(true)
  }

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const h = () => setOpen(false)
    window.addEventListener('scroll', h, true)
    return () => window.removeEventListener('scroll', h, true)
  }, [open])

  return (
    <>
      <button ref={triggerRef} type="button" onClick={openMenu}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && createPortal(
        <div ref={menuRef} role="menu" style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm">
          <button type="button" role="menuitem"
            onClick={() => { setOpen(false); onRemove() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors">
            <UserX className="w-3.5 h-3.5" /> Remove
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
