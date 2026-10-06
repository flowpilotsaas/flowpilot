-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1 – Stripe Connect schema
-- Run in the Supabase SQL editor (Dashboard → SQL editor → New query).
-- Safe to run multiple times (all statements use IF NOT EXISTS / IF EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. jobs: add estimate_id FK ───────────────────────────────────────────
-- (the application already tries to write this column; silently skips when absent)
alter table public.jobs
  add column if not exists estimate_id uuid
    references public.estimates(id) on delete set null;

-- ── 2. transactions: current schema (for reference) ─────────────────────
--
--   id              uuid  PK  not null  default gen_random_uuid()
--   user_id         uuid        not null  references auth.users on delete cascade
--   organization_id uuid        not null  (added via prior ALTER)
--   job_id          uuid        nullable  references jobs on delete set null
--   customer_id     uuid        nullable  references customers on delete set null
--   customer_name   text        nullable
--   job_number      text        nullable
--   amount          numeric(10,2) not null default 0
--   payment_method  text        nullable  — no CHECK constraint / enum
--   status          text        not null  default 'paid'  — no CHECK constraint
--   type            text        not null  default 'payment' — no CHECK constraint
--   details         text        nullable
--   date            date        not null
--   created_at      timestamptz not null  default now()
--
-- job_id is already nullable — no change required there.

alter table public.transactions
  add column if not exists estimate_id uuid
    references public.estimates(id) on delete set null,
  add column if not exists stripe_checkout_session_id text;

-- Unique only where the column is not null (multiple nulls are distinct in
-- Postgres anyway, but a partial unique index makes the intent explicit).
create unique index if not exists transactions_stripe_session_uniq
  on public.transactions (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- ── 3. organization_stripe_accounts ──────────────────────────────────────
-- Server-only writes: no INSERT/UPDATE/DELETE policy for anon or authenticated.
-- The service-role key bypasses RLS and is the only writer.

create table if not exists public.organization_stripe_accounts (
  organization_id   uuid primary key
    references public.organizations(id) on delete cascade,
  stripe_account_id text,
  charges_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  updated_at        timestamptz not null default now()
);

alter table public.organization_stripe_accounts enable row level security;

-- Active members of the org can read the row (to gate UI elements).
-- No write policies: only the service-role client can INSERT/UPDATE/DELETE.
create policy "org members can select stripe account"
  on public.organization_stripe_accounts for select
  using (
    exists (
      select 1
      from   public.organization_members m
      where  m.organization_id = organization_stripe_accounts.organization_id
        and  m.user_id = auth.uid()
        and  m.status  = 'active'
    )
  );

grant select on public.organization_stripe_accounts to authenticated;
revoke insert, update, delete
  on public.organization_stripe_accounts from anon, authenticated;
