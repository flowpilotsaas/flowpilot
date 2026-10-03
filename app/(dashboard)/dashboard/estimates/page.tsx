'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useOrganization } from '@/hooks/useOrganization'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { TrialExpiredModal } from '@/components/TrialExpiredModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Eye, Trash2, Loader2, FileText, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type EstimateStatus = 'Draft' | 'Sent' | 'Approved' | 'Declined'

type Estimate = {
  id: string
  user_id: string
  estimate_number: number
  customer_name: string | null
  status: EstimateStatus
  total: number
  created_at: string
}

type DeleteTarget =
  | { kind: 'single'; id: string; name: string }
  | { kind: 'bulk'; count: number }
  | null

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUSES: EstimateStatus[] = ['Draft', 'Sent', 'Approved', 'Declined']

const STATUS_STYLES: Record<EstimateStatus, string> = {
  Draft:    'bg-muted text-muted-foreground',
  Sent:     'bg-primary/10 text-primary',
  Approved: 'bg-success/15 text-success',
  Declined: 'bg-destructive/10 text-destructive',
}

function StatusBadge({ status }: { status: EstimateStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

function fmtEstNum(n: number) {
  return `EST-${String(n).padStart(4, '0')}`
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EstimatesPage() {
  const [estimates, setEstimates] = React.useState<Estimate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | EstimateStatus>('all')

  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget>(null)
  const [deleting, setDeleting] = React.useState(false)

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const { organizationId } = useOrganization()
  const { isAllowed: trialAllowed } = useTrialStatus()
  const [trialModalOpen, setTrialModalOpen] = React.useState(false)

  const fetchEstimates = React.useCallback(async () => {
    if (!organizationId) return
    const { data, error } = await supabase
      .from('estimates')
      .select('id, user_id, estimate_number, customer_name, status, total, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    if (!error && data) setEstimates(data)
    setLoading(false)
  }, [organizationId])

  React.useEffect(() => { fetchEstimates() }, [fetchEstimates])

  const filtered = React.useMemo(() => {
    return estimates.filter((e) => {
      const q = search.toLowerCase().trim()
      const matchesSearch = !q
        || (e.customer_name ?? '').toLowerCase().includes(q)
        || fmtEstNum(e.estimate_number).toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [estimates, search, statusFilter])

  // ─── Bulk select helpers ────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id))
  const someSelected = filtered.some((e) => selectedIds.has(e.id))
  const selectAll = () => setSelectedIds(new Set(filtered.map((e) => e.id)))
  const deselectAll = () => setSelectedIds(new Set())

  // ─── Status change ───────────────────────────────────────────────────────

  const handleStatusChange = async (estimateId: string, newStatus: EstimateStatus) => {
    setEstimates((prev) => prev.map((e) => e.id === estimateId ? { ...e, status: newStatus } : e))
    const { error } = await supabase.from('estimates').update({ status: newStatus }).eq('id', estimateId)
    if (error) { fetchEstimates(); toast.error('Failed to update status') }
  }

  const handleBulkStatusChange = async (newStatus: EstimateStatus) => {
    const ids = Array.from(selectedIds)
    setEstimates((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, status: newStatus } : e))
    const { error } = await supabase.from('estimates').update({ status: newStatus }).in('id', ids)
    if (error) { fetchEstimates(); toast.error('Failed to update status') }
    else { setSelectedIds(new Set()); toast.success(`${ids.length} estimate${ids.length > 1 ? 's' : ''} updated`) }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!trialAllowed) { setTrialModalOpen(true); setDeleteTarget(null); return }
    setDeleting(true)
    const { error } = await supabase.from('estimates').delete().eq('id', id)
    if (error) { toast.error('Failed to delete estimate'); setDeleting(false); return }
    setEstimates((prev) => prev.filter((e) => e.id !== id))
    toast.success('Estimate deleted')
    setDeleteTarget(null)
    setDeleting(false)
  }

  const handleBulkDelete = async () => {
    if (!trialAllowed) { setTrialModalOpen(true); setDeleteTarget(null); return }
    setDeleting(true)
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('estimates').delete().in('id', ids)
    if (error) { toast.error('Failed to delete estimates'); setDeleting(false); return }
    setEstimates((prev) => prev.filter((e) => !ids.includes(e.id)))
    setSelectedIds(new Set())
    toast.success(`${ids.length} estimate${ids.length > 1 ? 's' : ''} deleted`)
    setDeleteTarget(null)
    setDeleting(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Estimates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and send estimates to customers</p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/dashboard/estimates/new">
            <Plus className="w-4 h-4" /> New Estimate
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by customer or estimate #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | EstimateStatus)}
          className="h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table card */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          {selectedIds.size > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={deselectAll} className="h-8 px-3 text-xs cursor-pointer">
                  Clear
                </Button>
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) { handleBulkStatusChange(e.target.value as EstimateStatus); e.target.value = '' } }}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-[color,box-shadow] focus-visible:border-ring cursor-pointer"
                >
                  <option value="" disabled>Change status…</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                  onClick={() => setDeleteTarget({ kind: 'bulk', count: selectedIds.size })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete {selectedIds.size}
                </Button>
              </div>
            </div>
          ) : (
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {loading ? 'Loading…' : `${filtered.length} estimate${filtered.length !== 1 ? 's' : ''}`}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading estimates…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {search || statusFilter !== 'all' ? 'No results found' : 'No estimates yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {search || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first estimate to send to a customer.'}
                </p>
              </div>
              {!search && statusFilter === 'all' && (
                <Button variant="outline" size="sm" asChild className="gap-1.5 mt-1">
                  <Link href="/dashboard/estimates/new">
                    <Plus className="w-3.5 h-3.5" /> New Estimate
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                        className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                        aria-label="Select all"
                      />
                    </th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Estimate #</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Customer</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Total</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Created</th>
                    <th className="text-right px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((est) => (
                    <tr key={est.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(est.id)}
                          onChange={() => toggleSelect(est.id)}
                          className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                          aria-label={`Select ${fmtEstNum(est.estimate_number)}`}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-foreground whitespace-nowrap">
                        {fmtEstNum(est.estimate_number)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {est.customer_name ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-6 py-3">
                        <StatusDropdown
                          estimateId={est.id}
                          currentStatus={est.status}
                          onStatusChange={handleStatusChange}
                        />
                      </td>
                      <td className="px-6 py-4 text-foreground font-medium tabular-nums whitespace-nowrap">
                        {fmtCurrency(est.total)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {fmtDate(est.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <ActionMenu
                          estimateId={est.id}
                          onDelete={() => setDeleteTarget({ kind: 'single', id: est.id, name: fmtEstNum(est.estimate_number) })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === 'single'
            ? `Delete "${deleteTarget.name}"?`
            : `Delete ${deleteTarget?.count ?? 0} estimate${(deleteTarget?.count ?? 0) !== 1 ? 's' : ''}?`
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.kind === 'single') handleDelete(deleteTarget.id)
          else if (deleteTarget?.kind === 'bulk') handleBulkDelete()
        }}
        loading={deleting}
      />

      <TrialExpiredModal open={trialModalOpen} onClose={() => setTrialModalOpen(false)} />
    </div>
  )
}

// ─── Action menu ─────────────────────────────────────────────────────────────

function ActionMenu({ estimateId, onDelete }: { estimateId: string; onDelete: () => void }) {
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
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm"
        >
          <Link
            href={`/dashboard/estimates/${estimateId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            View
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Inline status dropdown ───────────────────────────────────────────────────

function StatusDropdown({ estimateId, currentStatus, onStatusChange }: {
  estimateId: string
  currentStatus: EstimateStatus
  onStatusChange: (id: string, status: EstimateStatus) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const DROPDOWN_HEIGHT = 132

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= DROPDOWN_HEIGHT ? rect.bottom + 6 : rect.top - DROPDOWN_HEIGHT - 6
    setCoords({ top, left: rect.left })
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
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <StatusBadge status={currentStatus} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              role="option"
              aria-selected={s === currentStatus}
              type="button"
              onClick={() => { onStatusChange(estimateId, s); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer',
                s === currentStatus && 'bg-muted/50'
              )}
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
