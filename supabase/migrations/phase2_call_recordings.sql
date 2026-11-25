-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2 – Call recordings schema
-- Run in the Supabase SQL editor (Dashboard → SQL editor → New query).
-- Safe to run multiple times (all statements use IF NOT EXISTS / OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. call_recordings table ──────────────────────────────────────────────

create table if not exists public.call_recordings (
  id               uuid        primary key default gen_random_uuid(),
  org_id           uuid        not null,
  call_sid         text        not null unique,
  recording_sid    text,
  recording_url    text,
  duration_seconds int,
  call_status      text,
  created_at       timestamptz not null default now()
);

-- ── 2. RLS ────────────────────────────────────────────────────────────────

alter table public.call_recordings enable row level security;

drop policy if exists "members read own org recordings" on public.call_recordings;
create policy "members read own org recordings"
  on public.call_recordings for select
  using (
    org_id in (
      select organization_id
      from public.organization_members
      where user_id = auth.uid()
        and status = 'active'
    )
  );

-- ── 3. Index for fast lookup by org ──────────────────────────────────────

create index if not exists call_recordings_org_id_idx
  on public.call_recordings (org_id, created_at desc);
