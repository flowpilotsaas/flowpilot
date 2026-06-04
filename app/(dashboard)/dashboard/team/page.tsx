'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
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
import { Plus, Pencil, Trash2, Loader2, Users, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'office' | 'technicians' | 'roles'
type SheetMode = 'office' | 'technician'
type MemberRole = 'Admin' | 'Dispatcher' | 'Technician'
type MemberStatus = 'Active' | 'Inactive'

type TeamMember = {
  id: string
  user_id: string
  name: string
  email: string
  phone: string | null
  role: MemberRole
  status: MemberStatus
  created_at: string
}

type FormData = {
  name: string
  email: string
  phone: string
  role: MemberRole
  status: MemberStatus
}

// ─── Constants ─────────────────────────────────────────────────────────────

const OFFICE_ROLES: MemberRole[] = ['Admin', 'Dispatcher']

const EMPTY_OFFICE_FORM: FormData = { name: '', email: '', phone: '', role: 'Admin', status: 'Active' }
const EMPTY_TECH_FORM: FormData   = { name: '', email: '', phone: '', role: 'Technician', status: 'Active' }

const STATUS_STYLES: Record<MemberStatus, string> = {
  Active:   'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
  Inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

// ─── Roles & Permissions data ───────────────────────────────────────────────

const PERMISSIONS = [
  { label: 'View Jobs',       Admin: true,  Dispatcher: true,  Technician: true  },
  { label: 'Edit Jobs',       Admin: true,  Dispatcher: true,  Technician: false },
  { label: 'View Estimates',  Admin: true,  Dispatcher: true,  Technician: false },
  { label: 'Edit Estimates',  Admin: true,  Dispatcher: false, Technician: false },
  { label: 'Manage Team',     Admin: true,  Dispatcher: false, Technician: false },
]

// ─── Small helpers ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

function PermIcon({ allowed }: { allowed: boolean }) {
  return allowed
    ? <Check className="w-4 h-4 text-green-600 mx-auto" />
    : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('office')
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [loading, setLoading] = React.useState(true)

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<SheetMode>('office')
  const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null)
  const [form, setForm] = React.useState<FormData>(EMPTY_OFFICE_FORM)
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchMembers = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error && data) setMembers(data)
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchMembers() }, [fetchMembers])

  // ─── Derived lists ──────────────────────────────────────────────────────

  const officeMembers = React.useMemo(
    () => members.filter((m) => m.role === 'Admin' || m.role === 'Dispatcher'),
    [members]
  )
  const technicians = React.useMemo(
    () => members.filter((m) => m.role === 'Technician'),
    [members]
  )

  // ─── Sheet helpers ──────────────────────────────────────────────────────

  const openAdd = (mode: SheetMode) => {
    setSheetMode(mode)
    setEditingMember(null)
    setForm(mode === 'office' ? EMPTY_OFFICE_FORM : EMPTY_TECH_FORM)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (member: TeamMember) => {
    setSheetMode(member.role === 'Technician' ? 'technician' : 'office')
    setEditingMember(member)
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone ?? '',
      role: member.role,
      status: member.status,
    })
    setFormError('')
    setSheetOpen(true)
  }

  const closeSheet = () => { setSheetOpen(false); setFormError('') }

  const setField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    if (!form.email.trim()) { setFormError('Email is required.'); return }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Not authenticated.'); return }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: sheetMode === 'technician' ? 'Technician' : form.role,
      status: form.status,
    }

    if (editingMember) {
      const { error } = await supabase
        .from('team_members')
        .update(payload)
        .eq('id', editingMember.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('team_members')
        .insert({ ...payload, user_id: user.id })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    closeSheet()
    await fetchMembers()
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (!error) setMembers((prev) => prev.filter((m) => m.id !== id))
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your office staff and field technicians</p>
        </div>
        {activeTab === 'office' && (
          <Button onClick={() => openAdd('office')} className="gap-2">
            <Plus className="w-4 h-4" />
            Invite Office Staff
          </Button>
        )}
        {activeTab === 'technicians' && (
          <Button onClick={() => openAdd('technician')} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Technician
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {([
          { key: 'office',      label: 'Office Staff'      },
          { key: 'technicians', label: 'Technicians'       },
          { key: 'roles',       label: 'Roles & Permissions' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
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

      {/* ── Office Staff tab ── */}
      {activeTab === 'office' && (
        <MembersTable
          members={officeMembers}
          loading={loading}
          emptyMessage="No office staff yet. Invite your first team member!"
          emptyIcon={<Users className="w-10 h-10 text-muted-foreground/40" />}
          onAdd={() => openAdd('office')}
          addLabel="Invite Office Staff"
          onEdit={openEdit}
          deleteConfirmId={deleteConfirmId}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {/* ── Technicians tab ── */}
      {activeTab === 'technicians' && (
        <MembersTable
          members={technicians}
          loading={loading}
          emptyMessage="No technicians yet. Add your first one!"
          emptyIcon={<Users className="w-10 h-10 text-muted-foreground/40" />}
          onAdd={() => openAdd('technician')}
          addLabel="Add Technician"
          onEdit={openEdit}
          deleteConfirmId={deleteConfirmId}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {/* ── Roles & Permissions tab ── */}
      {activeTab === 'roles' && (
        <div className="flex flex-col gap-4">
          <Card className="py-0 overflow-hidden">
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground font-normal">
                Permission matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Permission</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground w-28">Admin</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground w-28">Dispatcher</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground w-28">Technician</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((perm) => (
                      <tr key={perm.label} className="border-b border-border last:border-0">
                        <td className="px-6 py-3 font-medium text-foreground">{perm.label}</td>
                        <td className="px-6 py-3"><PermIcon allowed={perm.Admin} /></td>
                        <td className="px-6 py-3"><PermIcon allowed={perm.Dispatcher} /></td>
                        <td className="px-6 py-3"><PermIcon allowed={perm.Technician} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            Roles &amp; permissions are managed by your account admin
          </p>
        </div>
      )}

      {/* ── Add / Edit sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>
              {editingMember
                ? 'Edit Member'
                : sheetMode === 'office'
                  ? 'Invite Office Staff'
                  : 'Add Technician'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Name" required>
              <Input
                placeholder="Jane Smith"
                value={form.name}
                onChange={setField('name')}
              />
            </Field>

            <Field label="Email" required>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={setField('email')}
              />
            </Field>

            <Field label="Phone">
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={setField('phone')}
              />
            </Field>

            {sheetMode === 'office' && (
              <Field label="Role">
                <NativeSelect value={form.role} onChange={setField('role')}>
                  {OFFICE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </NativeSelect>
              </Field>
            )}

            <Field label="Status">
              <NativeSelect value={form.status} onChange={setField('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </NativeSelect>
            </Field>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={closeSheet} disabled={saving}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                : editingMember ? 'Save changes' : sheetMode === 'office' ? 'Send invite' : 'Add technician'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  )
}

// ─── Shared members table ─────────────────────────────────────────────────────

function MembersTable({
  members,
  loading,
  emptyMessage,
  emptyIcon,
  onAdd,
  addLabel,
  onEdit,
  deleteConfirmId,
  onDeleteRequest,
  onDeleteConfirm,
  deleting,
}: {
  members: TeamMember[]
  loading: boolean
  emptyMessage: string
  emptyIcon: React.ReactNode
  onAdd: () => void
  addLabel: string
  onEdit: (m: TeamMember) => void
  deleteConfirmId: string | null
  onDeleteRequest: (id: string | null) => void
  onDeleteConfirm: (id: string) => void
  deleting: boolean
}) {
  return (
    <Card className="py-0 overflow-hidden">
      <CardHeader className="border-b px-6 py-4">
        <CardTitle className="text-sm text-muted-foreground font-normal">
          {loading ? 'Loading…' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            {emptyIcon}
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5 mt-1">
              <Plus className="w-3.5 h-3.5" />
              {addLabel}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <React.Fragment key={member.id}>
                    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">
                        {member.name}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {member.email}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                        {member.phone ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                        {member.role}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        {deleteConfirmId === member.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Delete?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => onDeleteConfirm(member.id)}
                              disabled={deleting}
                            >
                              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => onDeleteRequest(null)}
                              disabled={deleting}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => onEdit(member)}
                              aria-label="Edit member"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => onDeleteRequest(member.id)}
                              aria-label="Delete member"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
