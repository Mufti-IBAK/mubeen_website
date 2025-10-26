-- Add missing columns used by app (idempotent)
alter table public.enrollments add column if not exists amount numeric;
alter table public.enrollments add column if not exists currency text;
alter table public.enrollments add column if not exists transaction_id text;
alter table public.enrollments add column if not exists duration_months integer;
alter table public.enrollments add column if not exists plan_id bigint references public.program_plans(id) on delete set null;
alter table public.enrollments add column if not exists form_data jsonb;
alter table public.enrollments add column if not exists classroom_link text;
alter table public.enrollments add column if not exists classroom_enabled boolean not null default false;
alter table public.enrollments add column if not exists is_draft boolean not null default false;
alter table public.enrollments add column if not exists draft_data jsonb;
alter table public.enrollments add column if not exists last_edited_at timestamptz;