-- Master SQL for success_enroll and basic policies
-- Create table
create table if not exists public.success_enroll (
  id bigserial primary key,
  user_id uuid null,
  user_name text null,
  user_email text null,
  type text not null check (type in ('program','donation','other')),
  program_id bigint null,
  program_title text null,
  amount numeric(12,2) null,
  currency text not null default 'NGN',
  description text null,
  tx_ref text unique,
  transaction_id text null,
  status text not null default 'pending',
  form_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists success_enroll_user_idx on public.success_enroll (user_id);
create index if not exists success_enroll_created_idx on public.success_enroll (created_at desc);

-- Basic RLS: allow users to see their own rows, inserts their own; updates by service role only
alter table public.success_enroll enable row level security;

-- Policies (drop then create; CREATE POLICY does not support IF NOT EXISTS)
drop policy if exists success_enroll_select_own on public.success_enroll;
drop policy if exists success_enroll_insert_own on public.success_enroll;

-- Allow authenticated users to select their own rows
create policy success_enroll_select_own
  on public.success_enroll
  for select
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

-- Allow authenticated users to insert for themselves
create policy success_enroll_insert_own
  on public.success_enroll
  for insert
  to authenticated
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

-- No update/delete by normal users

-- Optional: policies for registration_drafts (read/insert own; updates/deletes by service role)
-- Adjust names if your table is different
create schema if not exists public;
-- Drop existing to avoid duplicates
drop policy if exists registration_drafts_select_own on public.registration_drafts;
drop policy if exists registration_drafts_insert_own on public.registration_drafts;
drop policy if exists registration_drafts_update_none on public.registration_drafts;
drop policy if exists registration_drafts_delete_none on public.registration_drafts;

alter table if exists public.registration_drafts enable row level security;

create policy registration_drafts_select_own
  on public.registration_drafts
  for select
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

create policy registration_drafts_insert_own
  on public.registration_drafts
  for insert
  to authenticated
  with check (auth.uid() is not null and user_id = auth.uid());

-- Disallow updates/deletes by regular users (service role can still perform)
create policy registration_drafts_update_none
  on public.registration_drafts
  for update
  to authenticated
  using (false)
  with check (false);

create policy registration_drafts_delete_none
  on public.registration_drafts
  for delete
  to authenticated
  using (false);

-- Optionally, cache program_title from programs
create or replace function public.cache_success_enroll_program_title()
returns trigger language plpgsql as $$
begin
  if (new.program_id is not null and (new.program_title is null or new.program_title = '')) then
    select title into new.program_title from public.programs where id = new.program_id;
  end if;
  return new;
end$$;

-- Ensure column exists on existing deployments
alter table public.success_enroll add column if not exists form_data jsonb default '{}'::jsonb;

-- Recreate trigger (no IF NOT EXISTS for triggers)
drop trigger if exists trg_cache_success_enroll_title on public.success_enroll;
create trigger trg_cache_success_enroll_title
  before insert or update on public.success_enroll
  for each row execute function public.cache_success_enroll_program_title();
