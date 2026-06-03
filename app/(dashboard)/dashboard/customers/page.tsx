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
import { Plus, Search, Pencil, Trash2, Loader2, Users } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

type Customer = {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

type FormData = {
  name: string
  email: string
  phone: string
  address: string
  notes: string
}

const EMPTY_FORM: FormData = { name: '', email: '', phone: '', address: '', notes: '' }

// ─── Component ──────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
  const [form, setForm] = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchCustomers = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) setCustomers(data)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // ─── Search filter ──────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
    )
  }, [customers, search])

  // ─── Sheet helpers ───────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingCustomer(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setForm({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    })
    setFormError('')
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    setFormError('')
  }

  const setField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ─── Save (insert / update) ──────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Not authenticated.'); return }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editingCustomer.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert({ ...payload, user_id: user.id })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    closeSheet()
    await fetchCustomers()
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (!error) {
      setCustomers((prev) => prev.filter((c) => c.id !== id))
    }
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your customer database
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table card */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {loading ? 'Loading…' : `${filtered.length} customer${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading customers…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Users className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No customers match your search.' : 'No customers yet. Add your first one!'}
              </p>
              {!search && (
                <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add Customer
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Email</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Address</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Notes</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <React.Fragment key={customer.id}>
                      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">
                          {customer.name}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {customer.email ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {customer.phone ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground max-w-[12rem] truncate" title={customer.address ?? ''}>
                          {customer.address ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground max-w-[14rem] truncate" title={customer.notes ?? ''}>
                          {customer.notes ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {deleteConfirmId === customer.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Delete?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleDelete(customer.id)}
                                disabled={deleting}
                              >
                                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => setDeleteConfirmId(null)}
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
                                onClick={() => openEdit(customer)}
                                aria-label="Edit customer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirmId(customer.id)}
                                aria-label="Delete customer"
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

      {/* Add / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Name" required>
              <Input
                placeholder="Jane Smith"
                value={form.name}
                onChange={setField('name')}
              />
            </Field>
            <Field label="Email">
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
            <Field label="Address">
              <Input
                placeholder="123 Main St, Springfield"
                value={form.address}
                onChange={setField('address')}
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={4}
                placeholder="Any additional notes…"
                value={form.notes}
                onChange={setField('notes')}
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeSheet}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
              ) : editingCustomer ? 'Save changes' : 'Add customer'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Small helper for form field labels ─────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}
