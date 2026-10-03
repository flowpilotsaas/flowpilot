'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useOrganization } from '@/hooks/useOrganization'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import Link from 'next/link'
import {
  Plus, Loader2, Users, Check, X, Mail,
  MoreHorizontal, UserX, RefreshCw, Trash2,
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
  invited_at: string | null
  joined_at: string | null
}

type RemoveTarget =
  | { kind: 'single-member'; id: string; email: string }
  | { kind: 'bulk-members'; count: number; ids: string[] }
  | { kind: 'single-invite'; id: string; email: string }
  | { kind: 'bulk-invites'; count: number; ids: string[] }
  | null

// ─── Constants ─────────────────────────────────────────────────────────────

const PERMISSIONS = [
  { label: 'View Jobs',          Owner: true,  Admin: true,  Technician: true  },
  { label: 'Create / Edit Jobs', Owner: true,  Admin: true,  Technician: false },
  { label: 'View Estimates',     Owner: true,  Admin: true,  Technician: false },
  { label: 'Edit Estimates',     Owner: true,  Admin: true,  Technician: false },
  { label: 'Manage Team',        Owner: true,  Admin: false, Technician: false },
  { label: 'Billing',            Owner: true,  Admin: false, Technician: false },
  { label: 'Settings',           Owner: true,  Admin: false, Technician: false },
]

const ROLE_BADGE: Record<OrgRole, string> = {
  owner:      'bg-primary/10 text-primary',
  admin:      'bg-muted text-muted-foreground',
  technician: 'bg-muted/60 text-muted-foreground/80',
}

function roleLabel(r: OrgRole) {
  return r.charAt(0).toUpperCase() + r.slice(1)
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
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

  const [inviteOpen, setInviteOpen]   = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole]   = React.useState<'admin' | 'technician'>('technician')
  const [inviteError, setInviteError]     = React.useState('')
  const [inviteAtLimit, setInviteAtLimit] = React.useState(false)
  const [inviting, setInviting]           = React.useState(false)
  const [notificationWarning, setNotificationWarning] = React.useState('')

  const [removeTarget, setRemoveTarget] = React.useState<RemoveTarget>(null)
  const [removing, setRemoving]         = React.useState(false)

  const [resendingId, setResendingId] = React.useState<string | null>(null)

  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set())
  const [selectedInviteIds, setSelectedInviteIds] = React.useState<Set<string>>(new Set())

  // ─── Data ────────────────────────────────────────────────────────────────

  const fetchMembers = React.useCallback(async () => {
    if (!organizationId) return
    const { data } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('invited_at', { ascending: true })
    if (data) setMembers(data as OrgMember[])
    setLoading(false)
  }, [organizationId])

  React.useEffect(() => { fetchMembers() }, [fetchMembers])

  const activeMembers  = React.useMemo(() => members.filter(m => m.status === 'active'),  [members])
  const pendingInvites = React.useMemo(() => members.filter(m => m.status === 'pending'), [members])

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  // ─── Bulk select helpers ────────────────────────────────────────────────

  const removableMembers = activeMembers.filter(m => m.role !== 'owner')

  const allMembersSelected = removableMembers.length > 0 && removableMembers.every(m => selectedMemberIds.has(m.id))
  const someMembersSelected = removableMembers.some(m => selectedMemberIds.has(m.id))

  const allInvitesSelected = pendingInvites.length > 0 && pendingInvites.every(i => selectedInviteIds.has(i.id))
  const someInvitesSelected = pendingInvites.some(i => selectedInviteIds.has(i.id))

  const toggleMember = (id: string) =>
    setSelectedMemberIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const selectAllMembers = () => setSelectedMemberIds(new Set(removableMembers.map(m => m.id)))
  const deselectAllMembers = () => setSelectedMemberIds(new Set())

  const toggleInvite = (id: string) =>
    setSelectedInviteIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const selectAllInvites = () => setSelectedInviteIds(new Set(pendingInvites.map(i => i.id)))
  const deselectAllInvites = () => setSelectedInviteIds(new Set())

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
    setInviteAtLimit(false)

    try {
      const r = await fetch('/api/team/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      })
      const b = await r.json().catch(() => ({})) as { error?: string; code?: string; emailWarning?: string }

      if (!r.ok) {
        if (b.code === 'plan_limit' || b.code === 'no_subscription') setInviteAtLimit(true)
        setInviteError(b.error ?? 'Failed to send invite.')
        setInviting(false)
        return
      }

      setInviting(false)
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('technician')
      setInviteAtLimit(false)
      await fetchMembers()
      toast.success('Invite sent')
      if (b.emailWarning) setNotificationWarning(`Invite created, but the email failed to send: ${b.emailWarning}`)
    } catch {
      setInviteError('Network error. Please try again.')
      setInviting(false)
    }
  }

  const handleResend = async (member: OrgMember) => {
    setResendingId(member.id)
    try {
      const r = await fetch('/api/team/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email, role: member.role }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => ({}))
        setNotificationWarning(`Invite email could not be resent: ${(b as { error?: string }).error ?? 'unknown error'}`)
      } else {
        toast.success('Invite resent')
      }
    } catch {
      setNotificationWarning('Invite email could not be resent (network error).')
    }
    setResendingId(null)
  }

  // ─── Remove / Cancel ─────────────────────────────────────────────────────

  const confirmAction = async () => {
    if (!removeTarget) return
    setRemoving(true)

    if (removeTarget.kind === 'single-member') {
      await supabase.from('organization_members').delete().eq('id', removeTarget.id)
      setMembers(prev => prev.filter(m => m.id !== removeTarget.id))
      setSelectedMemberIds(prev => { const n = new Set(prev); n.delete(removeTarget.id); return n })
      toast.success('Member removed')
    } else if (removeTarget.kind === 'bulk-members') {
      await supabase.from('organization_members').delete().in('id', removeTarget.ids)
      setMembers(prev => prev.filter(m => !removeTarget.ids.includes(m.id)))
      setSelectedMemberIds(new Set())
      toast.success(`${removeTarget.ids.length} member${removeTarget.ids.length > 1 ? 's' : ''} removed`)
    } else if (removeTarget.kind === 'single-invite') {
      await supabase.from('organization_members').delete().eq('id', removeTarget.id)
      setMembers(prev => prev.filter(m => m.id !== removeTarget.id))
      setSelectedInviteIds(prev => { const n = new Set(prev); n.delete(removeTarget.id); return n })
      toast.success('Invite cancelled')
    } else if (removeTarget.kind === 'bulk-invites') {
      await supabase.from('organization_members').delete().in('id', removeTarget.ids)
      setMembers(prev => prev.filter(m => !removeTarget.ids.includes(m.id)))
      setSelectedInviteIds(new Set())
      toast.success(`${removeTarget.ids.length} invite${removeTarget.ids.length > 1 ? 's' : ''} cancelled`)
    }

    setRemoving(false)
    setRemoveTarget(null)
  }

  const removeModalTitle = () => {
    if (!removeTarget) return ''
    if (removeTarget.kind === 'single-member') return `Remove "${removeTarget.email}"?`
    if (removeTarget.kind === 'bulk-members') return `Remove ${removeTarget.count} member${removeTarget.count !== 1 ? 's' : ''}?`
    if (removeTarget.kind === 'single-invite') return `Cancel invite to "${removeTarget.email}"?`
    return `Cancel ${(removeTarget as { count: number }).count} invite${(removeTarget as { count: number }).count !== 1 ? 's' : ''}?`
  }

  const removeModalMessage = () => {
    if (!removeTarget) return ''
    if (removeTarget.kind === 'single-member' || removeTarget.kind === 'bulk-members')
      return "They'll lose access to your organization."
    return 'The invite links will stop working.'
  }

  const removeModalLabel = () => {
    if (!removeTarget) return 'Confirm'
    if (removeTarget.kind === 'single-member' || removeTarget.kind === 'bulk-members') return 'Remove'
    return 'Cancel Invite'
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'members', label: `Members${!loading ? ` (${activeMembers.length})` : ''}` },
    { key: 'pending', label: `Pending${!loading && pendingInvites.length > 0 ? ` (${pendingInvites.length})` : ''}` },
    { key: 'roles',   label: 'Roles & Permissions' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your team members and invites</p>
        </div>
        {canManage && (
          <Button onClick={() => { setInviteOpen(true); setInviteAtLimit(false); setInviteError('') }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Invite Member
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
                : 'border-transparent text-muted-foreground hover:text-foreground cursor-pointer'
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
            {selectedMemberIds.size > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{selectedMemberIds.size} selected</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={deselectAllMembers} className="h-8 px-3 text-xs cursor-pointer">Clear</Button>
                  <Button size="sm" variant="destructive" className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                    onClick={() => setRemoveTarget({ kind: 'bulk-members', count: selectedMemberIds.size, ids: Array.from(selectedMemberIds) })}>
                    <Trash2 className="w-3.5 h-3.5" /> Remove {selectedMemberIds.size}
                  </Button>
                </div>
              </div>
            ) : (
              <CardTitle className="text-sm text-muted-foreground font-normal">
                {loading ? 'Loading…' : `${activeMembers.length} member${activeMembers.length !== 1 ? 's' : ''}`}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading…
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                  <Users className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No members yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Invite your team to get started.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {canManage && (
                        <th className="px-4 py-3.5 w-10">
                          <input
                            type="checkbox"
                            checked={allMembersSelected}
                            ref={(el) => { if (el) el.indeterminate = someMembersSelected && !allMembersSelected }}
                            onChange={(e) => e.target.checked ? selectAllMembers() : deselectAllMembers()}
                            className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                            aria-label="Select all"
                          />
                        </th>
                      )}
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Email</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Role</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Member Since</th>
                      {canManage && <th className="text-right px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        {canManage && (
                          <td className="px-4 py-4">
                            {member.role !== 'owner' ? (
                              <input
                                type="checkbox"
                                checked={selectedMemberIds.has(member.id)}
                                onChange={() => toggleMember(member.id)}
                                className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                                aria-label={`Select ${member.email}`}
                              />
                            ) : (
                              <span className="block w-4 h-4" />
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 text-foreground">{member.email}</td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ROLE_BADGE[member.role])}>
                            {roleLabel(member.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{fmtDate(member.joined_at ?? member.invited_at)}</td>
                        {canManage && (
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            {member.role === 'owner' ? (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            ) : (
                              <MemberActionMenu onRemove={() => setRemoveTarget({ kind: 'single-member', id: member.id, email: member.email })} />
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
            {selectedInviteIds.size > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{selectedInviteIds.size} selected</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={deselectAllInvites} className="h-8 px-3 text-xs cursor-pointer">Clear</Button>
                  <Button size="sm" variant="destructive" className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                    onClick={() => setRemoveTarget({ kind: 'bulk-invites', count: selectedInviteIds.size, ids: Array.from(selectedInviteIds) })}>
                    <Trash2 className="w-3.5 h-3.5" /> Cancel {selectedInviteIds.size}
                  </Button>
                </div>
              </div>
            ) : (
              <CardTitle className="text-sm text-muted-foreground font-normal">
                {loading ? 'Loading…' : `${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}`}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading…
              </div>
            ) : pendingInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No pending invites</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Invitations you send will appear here until accepted.</p>
                </div>
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
                    <tr className="border-b border-border bg-muted/50">
                      {canManage && (
                        <th className="px-4 py-3.5 w-10">
                          <input
                            type="checkbox"
                            checked={allInvitesSelected}
                            ref={(el) => { if (el) el.indeterminate = someInvitesSelected && !allInvitesSelected }}
                            onChange={(e) => e.target.checked ? selectAllInvites() : deselectAllInvites()}
                            className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                            aria-label="Select all invites"
                          />
                        </th>
                      )}
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Email</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Role</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Invited</th>
                      {canManage && <th className="text-right px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map((invite) => (
                      <tr key={invite.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        {canManage && (
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedInviteIds.has(invite.id)}
                              onChange={() => toggleInvite(invite.id)}
                              className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                              aria-label={`Select invite for ${invite.email}`}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 text-foreground">{invite.email}</td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ROLE_BADGE[invite.role])}>
                            {roleLabel(invite.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{fmtDate(invite.invited_at)}</td>
                        {canManage && (
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                                onClick={() => handleResend(invite)} disabled={resendingId === invite.id}>
                                {resendingId === invite.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <RefreshCw className="w-3 h-3" />}
                                Resend
                              </Button>
                              <Button size="sm" variant="ghost"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => setRemoveTarget({ kind: 'single-invite', id: invite.id, email: invite.email })}>
                                Cancel
                              </Button>
                            </span>
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
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Permission</th>
                      <th className="text-center px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground w-28">Owner</th>
                      <th className="text-center px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground w-28">Admin</th>
                      <th className="text-center px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground w-28">Technician</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((perm) => (
                      <tr key={perm.label} className="border-b border-border last:border-0">
                        <td className="px-6 py-4 font-medium text-foreground">{perm.label}</td>
                        <td className="px-6 py-4"><PermIcon allowed={perm.Owner} /></td>
                        <td className="px-6 py-4"><PermIcon allowed={perm.Admin} /></td>
                        <td className="px-6 py-4"><PermIcon allowed={perm.Technician} /></td>
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

      {/* Remove / Cancel confirmation modal */}
      <DeleteConfirmModal
        open={removeTarget !== null}
        title={removeModalTitle()}
        message={removeModalMessage()}
        confirmLabel={removeModalLabel()}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmAction}
        loading={removing}
      />

      {/* ── Invite Sheet ── */}
      <Sheet open={inviteOpen} onOpenChange={(open) => { if (!open) { setInviteError(''); setInviteAtLimit(false) }; setInviteOpen(open) }}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>Invite Member</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground -mt-1">
              They&apos;ll receive an email invite to join your organization.
            </p>
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
              <NativeSelect value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'technician')}>
                <option value="admin">Admin</option>
                <option value="technician">Technician</option>
              </NativeSelect>
            </Field>
            {inviteError && (
              <div className="text-sm text-destructive">
                {inviteError}
                {inviteAtLimit && (
                  <> <Link href="/dashboard/billing" className="underline font-medium whitespace-nowrap">Upgrade plan →</Link></>
                )}
              </div>
            )}
          </div>
          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1"
              onClick={() => { setInviteOpen(false); setInviteError(''); setInviteAtLimit(false) }}
              disabled={inviting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleInvite} disabled={inviting}>
              {inviting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</> : 'Send Invite'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false)
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
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none cursor-pointer">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && createPortal(
        <div ref={menuRef} role="menu" style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onRemove() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
            <UserX className="w-3.5 h-3.5" /> Remove
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

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
