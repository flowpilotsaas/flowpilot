'use client'

/*
  SQL — run in Supabase SQL editor:

  create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    due_date date,
    customer_id uuid references public.customers(id) on delete set null,
    priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
    notes text,
    completed boolean not null default false,
    created_at timestamptz not null default now()
  );

  alter table public.tasks enable row level security;

  create policy "tasks: owner full access"
    on public.tasks for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  grant all on public.tasks to anon, authenticated;
*/

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
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
import { Plus, CheckSquare, Loader2, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { TrialExpiredModal } from '@/components/TrialExpiredModal'

type Priority = 'Low' | 'Medium' | 'High'
type FilterStatus = 'all' | 'pending' | 'completed'

type Task = {
  id: string
  user_id: string
  title: string
  due_date: string | null
  customer_id: string | null
  priority: Priority
  notes: string | null
  completed: boolean
  created_at: string
  customers?: { name: string } | null
}

type Customer = { id: string; name: string }

type FormData = {
  title: string
  due_date: string
  customer_id: string
  priority: Priority
  notes: string
}

type DeleteTarget =
  | { kind: 'single'; id: string; name: string }
  | { kind: 'bulk'; count: number }
  | null

const EMPTY_FORM: FormData = {
  title: '', due_date: '', customer_id: '', priority: 'Medium', notes: '',
}

const PRIORITY_STYLES: Record<Priority, string> = {
  Low:    'bg-muted text-muted-foreground',
  Medium: 'bg-warning/20 text-warning',
  High:   'bg-destructive/10 text-destructive',
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TasksPage() {
  const [tasks, setTasks]         = React.useState<Task[]>([])
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loading, setLoading]     = React.useState(true)
  const [filter, setFilter]       = React.useState<FilterStatus>('all')

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [form, setForm]           = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving]       = React.useState(false)

  const [toggling, setToggling]   = React.useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget>(null)
  const [deleting, setDeleting]         = React.useState(false)

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const [trialModalOpen, setTrialModalOpen] = React.useState(false)
  const { isAllowed: trialAllowed, isLoading: trialLoading } = useTrialStatus()

  const fetchData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [tasksRes, custRes] = await Promise.all([
      supabase.from('tasks').select('*, customers(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').eq('user_id', user.id).order('name'),
    ])

    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (custRes.data)  setCustomers(custRes.data)
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  const filtered = React.useMemo(() => {
    if (filter === 'pending')   return tasks.filter((t) => !t.completed)
    if (filter === 'completed') return tasks.filter((t) => t.completed)
    return tasks
  }, [tasks, filter])

  // ─── Bulk select helpers ────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const allSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id))
  const someSelected = filtered.some((t) => selectedIds.has(t.id))
  const selectAll = () => setSelectedIds(new Set(filtered.map((t) => t.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const openSheet = () => { setForm(EMPTY_FORM); setFormError(''); setSheetOpen(true) }

  const handleSave = async () => {
    if (!trialAllowed) { setTrialModalOpen(true); return }
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Not authenticated.'); return }

    const { error } = await supabase.from('tasks').insert({
      user_id:     user.id,
      title:       form.title.trim(),
      due_date:    form.due_date || null,
      customer_id: form.customer_id || null,
      priority:    form.priority,
      notes:       form.notes.trim() || null,
      completed:   false,
    })

    if (error) { setFormError(error.message); setSaving(false); return }
    toast.success('Task created')
    setSaving(false)
    setSheetOpen(false)
    await fetchData()
  }

  const handleToggle = async (task: Task) => {
    setToggling(task.id)
    const newVal = !task.completed
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: newVal } : t))
    const { error } = await supabase.from('tasks').update({ completed: newVal }).eq('id', task.id)
    if (error) await fetchData()
    setToggling(null)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { toast.error('Failed to delete task'); setDeleting(false); return }
    setTasks((prev) => prev.filter((t) => t.id !== id))
    toast.success('Task deleted')
    setDeleteTarget(null)
    setDeleting(false)
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('tasks').delete().in('id', ids)
    if (error) { toast.error('Failed to delete tasks'); setDeleting(false); return }
    setTasks((prev) => prev.filter((t) => !ids.includes(t.id)))
    setSelectedIds(new Set())
    toast.success(`${ids.length} task${ids.length > 1 ? 's' : ''} deleted`)
    setDeleteTarget(null)
    setDeleting(false)
  }

  const handleBulkComplete = async (completed: boolean) => {
    const ids = Array.from(selectedIds)
    setTasks((prev) => prev.map((t) => ids.includes(t.id) ? { ...t, completed } : t))
    const { error } = await supabase.from('tasks').update({ completed }).in('id', ids)
    if (error) { fetchData(); toast.error('Failed to update tasks') }
    else { setSelectedIds(new Set()); toast.success(`${ids.length} task${ids.length > 1 ? 's' : ''} updated`) }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks &amp; Reminders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Follow-ups and reminders linked to customers</p>
        </div>
        <Button onClick={openSheet} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'pending', 'completed'] as FilterStatus[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize cursor-pointer',
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task list */}
      <Card>
        <CardHeader className="border-b pb-4">
          {selectedIds.size > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={deselectAll} className="h-8 px-3 text-xs cursor-pointer">Clear</Button>
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                  onClick={() => handleBulkComplete(true)}>
                  <Check className="w-3.5 h-3.5" /> Complete
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs cursor-pointer"
                  onClick={() => handleBulkComplete(false)}>
                  Incomplete
                </Button>
                <Button size="sm" variant="destructive" className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                  onClick={() => setDeleteTarget({ kind: 'bulk', count: selectedIds.size })}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size}
                </Button>
              </div>
            </div>
          ) : (
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {loading ? 'Loading…' : `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading tasks…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filter === 'all' ? 'Create tasks to follow up with customers and track work.' : 'All clear in this category.'}
                </p>
              </div>
              {filter === 'all' && (
                <Button variant="outline" size="sm" onClick={openSheet} className="gap-1.5 mt-1">
                  <Plus className="w-3.5 h-3.5" /> New Task
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Select-all row */}
              {filtered.length > 0 && (
                <div className="flex items-center gap-4 px-6 py-2 bg-muted/20 border-b border-border">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                    className="w-4 h-4 rounded border-input accent-primary cursor-pointer shrink-0"
                    aria-label="Select all tasks"
                  />
                  <span className="text-xs text-muted-foreground">Select all</span>
                </div>
              )}
              {filtered.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors',
                    task.completed && 'opacity-60'
                  )}
                >
                  {/* Selection checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(task.id)}
                    onChange={() => toggleSelect(task.id)}
                    className="mt-0.5 w-4 h-4 rounded border-input accent-primary cursor-pointer shrink-0"
                    aria-label={`Select ${task.title}`}
                  />

                  {/* Completion toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggle(task)}
                    disabled={toggling === task.id}
                    className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-input flex items-center justify-center transition-colors hover:border-primary focus:outline-none cursor-pointer"
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {toggling === task.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : task.completed ? (
                      <span className="w-3 h-3 rounded-sm bg-primary block" />
                    ) : null}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium text-foreground',
                      task.completed && 'line-through text-muted-foreground'
                    )}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {task.customers?.name && (
                        <span className="text-xs text-muted-foreground">{task.customers.name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">Due {formatDate(task.due_date)}</span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.notes}</p>
                    )}
                  </div>

                  {/* Priority */}
                  <span className={cn(
                    'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    PRIORITY_STYLES[task.priority]
                  )}>
                    {task.priority}
                  </span>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ kind: 'single', id: task.id, name: task.title })}
                    className="shrink-0 mt-0.5 w-6 h-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors focus:outline-none cursor-pointer"
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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
            : `Delete ${deleteTarget?.count ?? 0} task${(deleteTarget?.count ?? 0) !== 1 ? 's' : ''}?`
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.kind === 'single') handleDelete(deleteTarget.id)
          else if (deleteTarget?.kind === 'bulk') handleBulkDelete()
        }}
        loading={deleting}
      />

      {/* New Task sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>New Task</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Title" required>
              <Input
                placeholder="e.g. Follow up with John about estimate"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
            </Field>
            <Field label="Linked Customer">
              <select value={form.customer_id} onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">No customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Priority }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                {(['Low', 'Medium', 'High'] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea
                rows={4}
                placeholder="Additional notes…"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || trialLoading}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Add Task'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <TrialExpiredModal open={trialModalOpen} onClose={() => setTrialModalOpen(false)} />
    </div>
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
