-- Registration drafts table for temporary, unpaid registrations
-- Run in Supabase SQL editor

create table if not exists public.registration_drafts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id integer not null references public.programs(id) on delete cascade,
  registration_type text not null check (registration_type in ('individual','family_head','family_member')),
  family_size integer,
  plan_id integer references public.program_plans(id) on delete set null,
  draft_data jsonb not null default '{}'::jsonb,
  last_edited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_registration_drafts_user on public.registration_drafts(user_id);
create index if not exists idx_registration_drafts_program on public.registration_drafts(program_id);

-- Enable Row Level Security
alter table public.registration_drafts enable row level security;

-- Policies (drop if exist first since CREATE POLICY doesn't support IF NOT EXISTS)
DO $$ BEGIN
  DROP POLICY IF EXISTS registration_drafts_owner_select ON public.registration_drafts;
  DROP POLICY IF EXISTS registration_drafts_owner_ins ON public.registration_drafts;
  DROP POLICY IF EXISTS registration_drafts_owner_upd ON public.registration_drafts;
  DROP POLICY IF EXISTS registration_drafts_owner_del ON public.registration_drafts;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Owners can manage their own drafts
create policy registration_drafts_owner_select
  on public.registration_drafts for select
  using (auth.uid() = user_id);

create policy registration_drafts_owner_ins
  on public.registration_drafts for insert
  with check (auth.uid() = user_id);

create policy registration_drafts_owner_upd
  on public.registration_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy registration_drafts_owner_del
  on public.registration_drafts for delete
  using (auth.uid() = user_id);

-- Read-only access for admins via service role or RPCs
-- (Service role bypasses RLS; you can add more granular policies if you add JWT custom claims.)
