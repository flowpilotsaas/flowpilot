'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar, Loader2, Plus, Settings, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type CalView = 'month' | 'week' | 'day'
type JobStatus = 'Scheduled' | 'In Progress' | 'Completed'

type Job = {
  id: string
  title: string
  status: JobStatus
  scheduled_date: string | null
  start_time: string | null
  end_time: string | null
  customer_id: string | null
  price: number | null
  notes: string | null
  customers: { name: string } | null
}

type UserSettings = {
  id: string
  user_id: string
  working_days: string[]
  work_start_time: string
  work_end_time: string
}

type WorkHoursForm = {
  workingDays: string[]
  startTime: string
  endTime: string
}

type ModalForm = {
  date: string
  startTime: string
  endTime: string
  notes: string
}

type EditJobForm = {
  title: string
  status: JobStatus
  scheduled_date: string
  start_time: string
  end_time: string
  price: string
  notes: string
}

type GridCfg = {
  start: number
  end: number
  totalH: number
  slotTops: number[]
  hourLabels: { label: string; top: number }[]
}

// ─── Fixed constants ────────────────────────────────────────────────────────

const SLOT_H     = 48
const PX_PER_MIN = SLOT_H / 30

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ALL_DAYS   = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const JOB_BLOCK: Record<JobStatus, string> = {
  'Scheduled':   'bg-blue-500 text-white',
  'In Progress': 'bg-amber-500 text-white',
  'Completed':   'bg-green-600 text-white',
}

const JOB_STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed']

// Time slots for the job-schedule modal (6 am – 8 pm, every 30 min)
const TIME_SLOTS: string[] = (() => {
  const s: string[] = []
  for (let h = 6; h <= 20; h++) {
    s.push(hh(h, 0))
    if (h < 20) s.push(hh(h, 30))
  }
  return s
})()

// Time slots for working-hours setup: start 5 am–12 pm, end 12 pm–10 pm
const WH_START_SLOTS: string[] = (() => {
  const s: string[] = []
  for (let h = 5; h <= 12; h++) {
    s.push(hh(h, 0))
    if (h < 12) s.push(hh(h, 30))
  }
  return s
})()

const WH_END_SLOTS: string[] = (() => {
  const s: string[] = []
  for (let h = 12; h <= 22; h++) {
    s.push(hh(h, 0))
    if (h < 22) s.push(hh(h, 30))
  }
  return s
})()

// ─── Utility ────────────────────────────────────────────────────────────────

function hh(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function fmtTime(t: string): string {
  const [hs, ms] = t.split(':')
  const h = parseInt(hs)
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${ms} ${period}`
}

function parseTime(t: string): { h: number; m: number } {
  const [hs, ms] = t.split(':')
  return { h: parseInt(hs), m: parseInt(ms) }
}

function topPx(time: string, gridStart: number): number {
  const { h, m } = parseTime(time)
  return Math.max(0, (h - gridStart) * 60 + m) * PX_PER_MIN
}

function heightPx(start: string, end: string | null): number {
  if (!end) return SLOT_H * 2
  const s = parseTime(start)
  const e = parseTime(end)
  return Math.max((e.h - s.h) * 60 + (e.m - s.m), 15) * PX_PER_MIN
}

function buildGrid(startTime: string, endTime: string): GridCfg {
  const s   = parseTime(startTime)
  const e   = parseTime(endTime)
  const start = s.h
  const end   = e.h + (e.m > 0 ? 1 : 0)
  const slots = (end - start) * 2
  return {
    start,
    end,
    totalH: slots * SLOT_H,
    slotTops: Array.from({ length: slots }, (_, i) => i * SLOT_H),
    hourLabels: Array.from({ length: end - start + 1 }, (_, i) => ({
      label: fmtTime(hh(start + i, 0)),
      top: i * SLOT_H * 2,
    })),
  }
}

function getWeekStart(d: Date): Date {
  const c = new Date(d); c.setHours(0, 0, 0, 0)
  const dow = c.getDay()
  c.setDate(c.getDate() + (dow === 0 ? -6 : 1 - dow))
  return c
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d); c.setDate(c.getDate() + n); return c
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtWeekHeader(ws: Date): string {
  const we = addDays(ws, 6)
  const s  = ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const e  = we.toLocaleDateString('en-US',
    ws.getMonth() === we.getMonth() ? { day: 'numeric' } : { month: 'short', day: 'numeric' }
  )
  return `${s} – ${e}, ${ws.getFullYear()}`
}

const DEFAULT_GRID = buildGrid('07:00', '18:00')

const STATUS_BADGE: Record<JobStatus, string> = {
  'Scheduled':   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Completed':   'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
}

function fmtDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [jobs, setJobs]           = React.useState<Job[]>([])
  const [settings, setSettings]   = React.useState<UserSettings | null>(null)
  const [loading, setLoading]     = React.useState(true)
  const [view, setView]           = React.useState<CalView>('week')
  const [currentDate, setCurrentDate] = React.useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })

  // Job detail popover
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null)

  // Job detail — edit mode
  const [detailEditMode, setDetailEditMode] = React.useState(false)
  const [detailForm, setDetailForm]         = React.useState<EditJobForm>({
    title: '', status: 'Scheduled', scheduled_date: '',
    start_time: '09:00', end_time: '10:00', price: '', notes: '',
  })
  const [savingDetail, setSavingDetail] = React.useState(false)
  const [detailError, setDetailError]   = React.useState('')

  // Job-schedule modal
  const [schedulingJob, setSchedulingJob] = React.useState<Job | null>(null)
  const [modalForm, setModalForm] = React.useState<ModalForm>({
    date: '', startTime: '09:00', endTime: '10:00', notes: '',
  })
  const [saving, setSaving]         = React.useState(false)
  const [modalError, setModalError] = React.useState('')

  // Working-hours form (shared between setup + update modals)
  const [setupOpen, setSetupOpen] = React.useState(false)
  const [hoursOpen, setHoursOpen] = React.useState(false)
  const [whForm, setWhForm]       = React.useState<WorkHoursForm>({
    workingDays: DEFAULT_WORKING_DAYS,
    startTime:   '08:00',
    endTime:     '17:00',
  })
  const [savingWH, setSavingWH] = React.useState(false)
  const [whError, setWhError]   = React.useState('')

  // ─── Grid config derived from settings ───────────────────────────────────

  const grid = React.useMemo<GridCfg>(
    () => settings
      ? buildGrid(settings.work_start_time, settings.work_end_time)
      : DEFAULT_GRID,
    [settings]
  )

  // ─── Fetch jobs + settings on mount ──────────────────────────────────────

  const fetchJobs = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, status, scheduled_date, start_time, end_time, customer_id, price, notes, customers(name)')
      .eq('user_id', user.id)
    if (!error && data) setJobs(data as Job[])
  }, [])

  React.useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [, settingsRes] = await Promise.all([
        fetchJobs(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      if (settingsRes.data) {
        setSettings(settingsRes.data)
      } else {
        // No row yet — trigger first-time setup
        setWhForm({ workingDays: DEFAULT_WORKING_DAYS, startTime: '08:00', endTime: '17:00' })
        setSetupOpen(true)
      }
      setLoading(false)
    }
    init()
  }, [fetchJobs])

  // ─── Derived ─────────────────────────────────────────────────────────────

  const unscheduled = React.useMemo(() => jobs.filter((j) => !j.scheduled_date), [jobs])

  const byDate = React.useMemo(() => {
    const map = new Map<string, Job[]>()
    for (const j of jobs) {
      if (!j.scheduled_date) continue
      const k = j.scheduled_date.slice(0, 10)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(j)
    }
    return map
  }, [jobs])

  // ─── Calendar navigation ──────────────────────────────────────────────────

  const goToday = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0); setCurrentDate(d)
  }

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (view === 'week')  d.setDate(d.getDate() + dir * 7)
      if (view === 'month') d.setMonth(d.getMonth() + dir)
      if (view === 'day')   d.setDate(d.getDate() + dir)
      return d
    })
  }

  const headerLabel = (() => {
    if (view === 'week')  return fmtWeekHeader(getWeekStart(currentDate))
    if (view === 'month') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  })()

  // ─── Job-schedule modal ───────────────────────────────────────────────────

  const openModal = (job: Job) => {
    setSchedulingJob(job)
    setModalForm({ date: '', startTime: '09:00', endTime: '10:00', notes: '' })
    setModalError('')
  }

  const closeModal = () => { setSchedulingJob(null); setModalError('') }

  const handleSchedule = async () => {
    if (!schedulingJob) return
    if (!modalForm.date) { setModalError('Please pick a date.'); return }
    setSaving(true)
    setModalError('')
    const { error } = await supabase.from('jobs').update({
      scheduled_date: modalForm.date,
      start_time:     modalForm.startTime || null,
      end_time:       modalForm.endTime   || null,
      status:         'Scheduled',
      ...(modalForm.notes.trim() ? { notes: modalForm.notes.trim() } : {}),
    }).eq('id', schedulingJob.id)
    if (error) { setModalError(error.message); setSaving(false); return }
    setSaving(false)
    closeModal()
    await fetchJobs()
  }

  // ─── Job detail edit mode ─────────────────────────────────────────────────

  const closeDetailModal = () => {
    setSelectedJob(null)
    setDetailEditMode(false)
    setDetailError('')
  }

  const openDetailEdit = () => {
    if (!selectedJob) return
    setDetailForm({
      title:          selectedJob.title,
      status:         selectedJob.status,
      scheduled_date: selectedJob.scheduled_date ?? '',
      start_time:     selectedJob.start_time  ?? '09:00',
      end_time:       selectedJob.end_time    ?? '10:00',
      price:          selectedJob.price != null ? String(selectedJob.price) : '',
      notes:          selectedJob.notes ?? '',
    })
    setDetailError('')
    setDetailEditMode(true)
  }

  const cancelDetailEdit = () => { setDetailEditMode(false); setDetailError('') }

  const saveDetail = async () => {
    if (!selectedJob) return
    if (!detailForm.title.trim()) { setDetailError('Title is required.'); return }
    setSavingDetail(true)
    setDetailError('')

    const { error } = await supabase.from('jobs').update({
      title:          detailForm.title.trim(),
      status:         detailForm.status,
      scheduled_date: detailForm.scheduled_date || null,
      start_time:     detailForm.start_time || null,
      end_time:       detailForm.end_time   || null,
      price:          detailForm.price !== '' ? parseFloat(detailForm.price) : null,
      notes:          detailForm.notes.trim() || null,
    }).eq('id', selectedJob.id)

    if (error) { setDetailError(error.message); setSavingDetail(false); return }

    // Reflect edits in view mode without closing the modal
    setSelectedJob((prev) => prev ? {
      ...prev,
      title:          detailForm.title.trim(),
      status:         detailForm.status,
      scheduled_date: detailForm.scheduled_date || null,
      start_time:     detailForm.start_time || null,
      end_time:       detailForm.end_time   || null,
      price:          detailForm.price !== '' ? parseFloat(detailForm.price) : null,
      notes:          detailForm.notes.trim() || null,
    } : prev)

    setSavingDetail(false)
    setDetailEditMode(false)
    await fetchJobs()
  }

  // ─── Working-hours modal ──────────────────────────────────────────────────

  const openWorkingHours = () => {
    setWhForm(settings
      ? { workingDays: settings.working_days, startTime: settings.work_start_time, endTime: settings.work_end_time }
      : { workingDays: DEFAULT_WORKING_DAYS, startTime: '08:00', endTime: '17:00' }
    )
    setWhError('')
    setHoursOpen(true)
  }

  const handleSaveWorkingHours = async (isSetup: boolean) => {
    if (whForm.workingDays.length === 0) {
      setWhError('Select at least one working day.'); return
    }
    setSavingWH(true)
    setWhError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setWhError('Not authenticated.'); setSavingWH(false); return }

    const payload = {
      working_days:    whForm.workingDays,
      work_start_time: whForm.startTime,
      work_end_time:   whForm.endTime,
    }

    if (settings) {
      const { error } = await supabase
        .from('user_settings').update(payload).eq('user_id', user.id)
      if (error) { setWhError(error.message); setSavingWH(false); return }
      setSettings((prev) => prev ? { ...prev, ...payload } : prev)
    } else {
      const { data, error } = await supabase
        .from('user_settings').insert({ user_id: user.id, ...payload }).select().single()
      if (error) { setWhError(error.message); setSavingWH(false); return }
      setSettings(data)
    }

    setSavingWH(false)
    if (isSetup) setSetupOpen(false)
    else setHoursOpen(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen p-6 flex flex-col gap-5">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Schedule</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-muted-foreground">Plan and dispatch your team's jobs</p>
            <button
              type="button"
              onClick={openWorkingHours}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-3 h-3" />
              Working Hours
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {(['month', 'week', 'day'] as CalView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 transition-colors capitalize',
                  view === v
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Previous">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(1)} aria-label="Next">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-foreground w-64 text-center">{headerLabel}</span>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Calendar card */}
        <div className="flex-1 min-h-0 bg-background border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading schedule…
            </div>
          ) : view === 'week' ? (
            <WeekView
              currentDate={currentDate}
              byDate={byDate}
              grid={grid}
              workingDays={settings?.working_days ?? DEFAULT_WORKING_DAYS}
              onDayClick={(d) => { setCurrentDate(d); setView('day') }}
              onJobClick={setSelectedJob}
            />
          ) : view === 'month' ? (
            <MonthView
              currentDate={currentDate}
              byDate={byDate}
              onDayClick={(d) => { setCurrentDate(d); setView('day') }}
              onJobClick={setSelectedJob}
            />
          ) : (
            <DayView
              currentDate={currentDate}
              jobs={byDate.get(dateKey(currentDate)) ?? []}
              grid={grid}
              onJobClick={setSelectedJob}
            />
          )}
          </div>
        </div>

        {/* Unscheduled panel */}
        <div className="w-72 flex-shrink-0 bg-background border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <p className="text-sm font-semibold text-foreground">Unscheduled</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unscheduled.length} job{unscheduled.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {unscheduled.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">All jobs are scheduled</p>
              </div>
            ) : (
              unscheduled.map((job) => (
                <div key={job.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{job.title}</p>
                    {job.customers?.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{job.customers.name}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openModal(job)}
                    className="w-full h-7 text-xs gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Schedule
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── First-time setup modal (non-dismissible) ── */}
      {setupOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Set Your Working Hours</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This helps us show your calendar accurately
              </p>
            </div>
            <WorkHoursFormFields form={whForm} onChange={setWhForm} error={whError} />
            <Button
              onClick={() => handleSaveWorkingHours(true)}
              disabled={savingWH}
              className="w-full gap-2"
            >
              {savingWH && <Loader2 className="w-4 h-4 animate-spin" />}
              Save &amp; Continue
            </Button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Update working hours modal (dismissible) ── */}
      {hoursOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHoursOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background shadow-2xl p-6 flex flex-col gap-6">
            <h2 className="text-base font-semibold text-foreground">Update Working Hours</h2>
            <WorkHoursFormFields form={whForm} onChange={setWhForm} error={whError} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setHoursOpen(false)} disabled={savingWH}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveWorkingHours(false)} disabled={savingWH} className="gap-2">
                {savingWH && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Job-schedule modal ── */}
      {schedulingJob && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background shadow-2xl p-6 flex flex-col gap-5">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-semibold text-foreground">Schedule Job</h2>
              <p className="text-sm font-medium text-foreground mt-2">{schedulingJob.title}</p>
              {schedulingJob.customers?.name && (
                <p className="text-xs text-muted-foreground">{schedulingJob.customers.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <MField label="Date" required>
                <Input
                  type="date"
                  value={modalForm.date}
                  onChange={(e) => setModalForm((p) => ({ ...p, date: e.target.value }))}
                />
              </MField>
              <div className="grid grid-cols-2 gap-3">
                <MField label="Start Time">
                  <TimeSelect value={modalForm.startTime} slots={TIME_SLOTS}
                    onChange={(v) => setModalForm((p) => ({ ...p, startTime: v }))} />
                </MField>
                <MField label="End Time">
                  <TimeSelect value={modalForm.endTime} slots={TIME_SLOTS}
                    onChange={(v) => setModalForm((p) => ({ ...p, endTime: v }))} />
                </MField>
              </div>
              <MField label="Notes">
                <textarea
                  rows={3}
                  placeholder="Any scheduling notes…"
                  value={modalForm.notes}
                  onChange={(e) => setModalForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </MField>
              {modalError && <p className="text-sm text-destructive">{modalError}</p>}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
              <Button onClick={handleSchedule} disabled={saving} className="gap-2">
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Calendar className="w-4 h-4" />}
                Schedule
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Job detail modal ── */}
      {selectedJob && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetailModal} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background shadow-2xl">

            {detailEditMode ? (
              /* ── Edit mode ── */
              <>
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
                  <p className="text-base font-semibold text-foreground">Edit Job</p>
                  <button
                    type="button"
                    onClick={closeDetailModal}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                  <MField label="Title">
                    <Input
                      value={detailForm.title}
                      onChange={(e) => setDetailForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Job title"
                    />
                  </MField>

                  <MField label="Status">
                    <select
                      value={detailForm.status}
                      onChange={(e) => setDetailForm((p) => ({ ...p, status: e.target.value as JobStatus }))}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </MField>

                  <MField label="Scheduled Date">
                    <Input
                      type="date"
                      value={detailForm.scheduled_date}
                      onChange={(e) => setDetailForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                    />
                  </MField>

                  <div className="grid grid-cols-2 gap-3">
                    <MField label="Start Time">
                      <TimeSelect value={detailForm.start_time} slots={TIME_SLOTS}
                        onChange={(v) => setDetailForm((p) => ({ ...p, start_time: v }))} />
                    </MField>
                    <MField label="End Time">
                      <TimeSelect value={detailForm.end_time} slots={TIME_SLOTS}
                        onChange={(v) => setDetailForm((p) => ({ ...p, end_time: v }))} />
                    </MField>
                  </div>

                  <MField label="Price ($)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={detailForm.price}
                      onChange={(e) => setDetailForm((p) => ({ ...p, price: e.target.value }))}
                    />
                  </MField>

                  <MField label="Notes">
                    <textarea
                      rows={3}
                      placeholder="Notes…"
                      value={detailForm.notes}
                      onChange={(e) => setDetailForm((p) => ({ ...p, notes: e.target.value }))}
                      className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </MField>

                  {detailError && <p className="text-sm text-destructive">{detailError}</p>}
                </div>

                <div className="px-5 pb-5 flex flex-col gap-2 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={cancelDetailEdit} disabled={savingDetail} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={saveDetail} disabled={savingDetail} className="flex-1 gap-2">
                      {savingDetail && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
                    <Link href={`/dashboard/jobs/${selectedJob.id}`}>View Full Job</Link>
                  </Button>
                </div>
              </>
            ) : (
              /* ── View mode ── */
              <>
                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground leading-snug">{selectedJob.title}</p>
                    {selectedJob.customers?.name && (
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedJob.customers.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={openDetailEdit}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={closeDetailModal}
                      aria-label="Close"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-4">
                  <span className={cn(
                    'inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-medium',
                    STATUS_BADGE[selectedJob.status]
                  )}>
                    {selectedJob.status}
                  </span>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {selectedJob.scheduled_date && (
                      <DetailRow label="Date" value={fmtDate(selectedJob.scheduled_date)} />
                    )}
                    {(selectedJob.start_time || selectedJob.end_time) && (
                      <DetailRow
                        label="Time"
                        value={[
                          selectedJob.start_time && fmtTime(selectedJob.start_time),
                          selectedJob.end_time   && fmtTime(selectedJob.end_time),
                        ].filter(Boolean).join(' – ')}
                      />
                    )}
                    {selectedJob.price != null && (
                      <DetailRow label="Price" value={fmtCurrency(selectedJob.price)} />
                    )}
                  </div>

                  {selectedJob.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedJob.notes}</p>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/dashboard/jobs/${selectedJob.id}`}>View Full Job</Link>
                  </Button>
                </div>
              </>
            )}

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  byDate,
  grid,
  workingDays,
  onDayClick,
  onJobClick,
}: {
  currentDate: Date
  byDate: Map<string, Job[]>
  grid: GridCfg
  workingDays: string[]
  onDayClick: (d: Date) => void
  onJobClick: (job: Job) => void
}) {
  const today     = React.useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const weekStart = getWeekStart(currentDate)

  // Build all 7 Mon-indexed days then filter to those in workingDays
  const days = Array.from({ length: 7 }, (_, i) => ({
    date:     addDays(weekStart, i),
    label:    DAY_LABELS[i],   // 'Mon', 'Tue', …
    fullName: ALL_DAYS[i],     // 'Monday', 'Tuesday', …
  })).filter(({ fullName }) => workingDays.includes(fullName))

  return (
    <div className="flex flex-col min-w-[320px]">

      {/* Day headers — sticky so they stay visible as the calendar container scrolls */}
      <div className="flex border-b border-border shrink-0 bg-background sticky top-0 z-10">
        <div className="w-14 shrink-0" />
        {days.map(({ date, label }) => {
          const isToday = isSameDay(date, today)
          return (
            <button
              key={label}
              type="button"
              onClick={() => onDayClick(date)}
              className="flex-1 py-2.5 flex flex-col items-center gap-0.5 hover:bg-muted/40 transition-colors"
            >
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
              <span className={cn(
                'text-sm font-medium w-7 h-7 rounded-full flex items-center justify-center',
                isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
              )}>
                {date.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* All-day strip */}
      <AllDayStrip days={days.map(({ date }) => date)} byDate={byDate} onJobClick={onJobClick} />

      {/* Time grid — pt-3 gives the first hour label room above top:0 so it isn't clipped */}
      <div className="flex pt-3">
        {/* Hour gutter */}
        <div className="w-14 shrink-0 relative" style={{ height: grid.totalH }}>
          {grid.hourLabels.map(({ label, top }) => (
            <div
              key={label}
              className="absolute right-2 text-[10px] text-muted-foreground/60 select-none"
              style={{ top, transform: 'translateY(-50%)' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(({ date, label }) => {
          const key     = dateKey(date)
          const dayJobs = byDate.get(key) ?? []
          const isToday = isSameDay(date, today)

          return (
            <div
              key={label}
              className={cn('flex-1 relative border-l border-border', isToday && 'bg-primary/[0.02]')}
              style={{ height: grid.totalH }}
            >
              {grid.slotTops.map((top, si) => (
                <div
                  key={si}
                  className={cn('absolute inset-x-0 border-t', si % 2 === 0 ? 'border-border/60' : 'border-border/25')}
                  style={{ top }}
                />
              ))}

              {dayJobs.map((job) => {
                if (!job.start_time) return null
                const { h: sh } = parseTime(job.start_time)
                const { h: eh } = job.end_time ? parseTime(job.end_time) : { h: sh + 1 }
                if (sh >= grid.end || eh <= grid.start) return null
                const top    = topPx(job.start_time, grid.start)
                const height = Math.min(heightPx(job.start_time, job.end_time), grid.totalH - top)
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => onJobClick(job)}
                    title={job.title}
                    className={cn(
                      'absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left overflow-hidden hover:opacity-80 transition-opacity z-[1]',
                      JOB_BLOCK[job.status]
                    )}
                    style={{ top, height }}
                  >
                    <p className="text-[11px] font-semibold leading-tight truncate">{job.title}</p>
                    {job.customers?.name && height > 36 && (
                      <p className="text-[10px] opacity-80 truncate leading-tight">{job.customers.name}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AllDayStrip({ days, byDate, onJobClick }: { days: Date[]; byDate: Map<string, Job[]>; onJobClick: (job: Job) => void }) {
  const hasAny = days.some((d) => (byDate.get(dateKey(d)) ?? []).some((j) => !j.start_time))
  if (!hasAny) return null
  return (
    <div className="flex border-b border-border shrink-0">
      <div className="w-14 shrink-0 flex items-center justify-end pr-2">
        <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wide">All day</span>
      </div>
      {days.map((day, i) => {
        const allDay = (byDate.get(dateKey(day)) ?? []).filter((j) => !j.start_time)
        return (
          <div key={i} className="flex-1 border-l border-border px-0.5 py-0.5 flex flex-col gap-0.5">
            {allDay.slice(0, 2).map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => onJobClick(job)}
                className={cn('text-[10px] font-medium px-1 py-0.5 rounded truncate text-left hover:opacity-80', JOB_BLOCK[job.status])}
              >
                {job.title}
              </button>
            ))}
            {allDay.length > 2 && (
              <span className="text-[9px] text-muted-foreground pl-1">+{allDay.length - 2}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  byDate,
  onDayClick,
  onJobClick,
}: {
  currentDate: Date
  byDate: Map<string, Job[]>
  onDayClick: (d: Date) => void
  onJobClick: (job: Job) => void
}) {
  const today = React.useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay  = new Date(year, month, 1)
  const dow       = firstDay.getDay()
  const gridStart = addDays(firstDay, dow === 0 ? -6 : 1 - dow)
  const cells     = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="grid grid-cols-7 mb-1 shrink-0">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border flex-1">
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const dayJobs = byDate.get(dateKey(day)) ?? []
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                'bg-background p-2 text-left hover:bg-muted/40 transition-colors flex flex-col min-h-[88px]',
                !inMonth && 'bg-muted/20'
              )}
            >
              <span className={cn(
                'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 shrink-0',
                isToday
                  ? 'bg-primary text-primary-foreground'
                  : inMonth ? 'text-foreground' : 'text-muted-foreground/40'
              )}>
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                {dayJobs.slice(0, 3).map((job) => (
                  <div
                    key={job.id}
                    onClick={(e) => { e.stopPropagation(); onJobClick(job) }}
                    className={cn('text-[10px] font-medium px-1 py-px rounded truncate w-full cursor-pointer hover:opacity-80', JOB_BLOCK[job.status])}
                    role="button"
                    tabIndex={0}
                  >
                    {job.title}
                  </div>
                ))}
                {dayJobs.length > 3 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{dayJobs.length - 3} more</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  jobs,
  grid,
  onJobClick,
}: {
  currentDate: Date
  jobs: Job[]
  grid: GridCfg
  onJobClick: (job: Job) => void
}) {
  const timedJobs  = jobs.filter((j) => j.start_time)
  const allDayJobs = jobs.filter((j) => !j.start_time)

  return (
    <div className="flex flex-col">

      {/* All-day row */}
      {allDayJobs.length > 0 && (
        <div className="shrink-0 flex border-b border-border">
          <div className="w-14 shrink-0 border-r border-border flex items-center justify-end pr-2">
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wide">all day</span>
          </div>
          <div className="flex-1 h-10 flex items-center gap-1 px-2">
            {allDayJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => onJobClick(job)}
                className={cn('text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap hover:opacity-80', JOB_BLOCK[job.status])}
              >
                {job.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gutter + grid — pt-3 gives the first hour label room so it isn't clipped */}
      <div className="flex pt-3">

        {/* Hour gutter */}
        <div className="w-14 shrink-0 border-r border-border relative" style={{ height: grid.totalH }}>
          {grid.hourLabels.map(({ label, top }) => (
            <div
              key={label}
              className="absolute right-2 text-[10px] text-muted-foreground/60 select-none"
              style={{ top, transform: 'translateY(-50%)' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Time grid (inside scroll) */}
        <div className="flex-1 relative" style={{ height: grid.totalH }}>
          {grid.slotTops.map((top, si) => (
            <div
              key={si}
              className={cn('absolute inset-x-0 border-t', si % 2 === 0 ? 'border-border/60' : 'border-border/25')}
              style={{ top }}
            />
          ))}
          {timedJobs.map((job) => {
            const { h: sh } = parseTime(job.start_time!)
            const { h: eh } = job.end_time ? parseTime(job.end_time) : { h: sh + 1 }
            if (sh >= grid.end || eh <= grid.start) return null
            const top    = topPx(job.start_time!, grid.start)
            const height = Math.min(heightPx(job.start_time!, job.end_time), grid.totalH - top)
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => onJobClick(job)}
                title={job.title}
                className={cn(
                  'absolute left-2 right-2 rounded-lg px-2.5 py-1.5 text-left overflow-hidden hover:opacity-80 transition-opacity z-[1]',
                  JOB_BLOCK[job.status]
                )}
                style={{ top, height }}
              >
                <p className="text-xs font-semibold leading-tight truncate">{job.title}</p>
                {job.customers?.name && (
                  <p className="text-[11px] opacity-80 leading-tight truncate">{job.customers.name}</p>
                )}
                <p className="text-[10px] opacity-70 mt-0.5">
                  {fmtTime(job.start_time!)}
                  {job.end_time && ` – ${fmtTime(job.end_time)}`}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Working hours form (reused in both modals) ───────────────────────────────

function WorkHoursFormFields({
  form,
  onChange,
  error,
}: {
  form: WorkHoursForm
  onChange: (f: WorkHoursForm) => void
  error: string
}) {
  const toggleDay = (day: string) => {
    onChange({
      ...form,
      workingDays: form.workingDays.includes(day)
        ? form.workingDays.filter((d) => d !== day)
        : [...form.workingDays, day],
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Working Days</p>
        <div className="grid grid-cols-4 gap-2">
          {ALL_DAYS.map((day) => {
            const checked = form.workingDays.includes(day)
            return (
              <label
                key={day}
                className={cn(
                  'flex items-center justify-center py-2 rounded-md border text-xs cursor-pointer select-none transition-colors',
                  checked
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleDay(day)}
                />
                {day.slice(0, 3)}
              </label>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MField label="Work Start Time">
          <TimeSelect
            value={form.startTime}
            slots={WH_START_SLOTS}
            onChange={(v) => onChange({ ...form, startTime: v })}
          />
        </MField>
        <MField label="Work End Time">
          <TimeSelect
            value={form.endTime}
            slots={WH_END_SLOTS}
            onChange={(v) => onChange({ ...form, endTime: v })}
          />
        </MField>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function MField({ label, required, children }: {
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

function TimeSelect({ value, onChange, slots }: {
  value: string
  onChange: (v: string) => void
  slots: string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {slots.map((t) => (
        <option key={t} value={t}>{fmtTime(t)}</option>
      ))}
    </select>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}
