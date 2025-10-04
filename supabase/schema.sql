-- Supabase schema for dashboards, roles, courses, dynamic forms, enrollments, progress

-- Profiles table (linked to auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student', -- 'student' | 'admin' | 'teacher'
  months_remaining integer not null default 0,
  full_name text,
  phone text,
  country text,
  email text,
  dark_mode boolean not null default false,
  created_at timestamp with time zone default now()
);
-- Ensure email column exists for existing deployments
alter table profiles add column if not exists email text;

-- Courses
create table if not exists courses (
  id bigserial primary key,
  title text not null,
  slug text not null unique,
  description text,
  image_url text,
  price_per_month numeric,
  price_per_semester numeric,
  is_flagship boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Course forms (Google Forms-style schema stored as JSON)
-- form_type: 'individual' | 'family_head' | 'family_member'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_type') THEN
    CREATE TYPE form_type AS ENUM ('individual', 'family_head', 'family_member');
  END IF;
END $$;
create table if not exists course_forms (
  id bigserial primary key,
  course_id bigint not null references courses(id) on delete cascade,
  form_type form_type not null,
  schema jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);
create unique index if not exists course_forms_unique on course_forms(course_id, form_type);

-- Family groups
create table if not exists family_groups (
  id bigserial primary key,
  head_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Enrollments
create table if not exists enrollments (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint references courses(id) on delete cascade,
  program_id bigint references programs(id) on delete cascade,
  is_family boolean not null default false,
  family_group_id bigint references family_groups(id) on delete set null,
  status text not null default 'pending', -- 'pending' | 'active' | 'completed' | 'cancelled'
  payment_status text not null default 'unpaid', -- 'unpaid' | 'paid' | 'failed'
  created_at timestamp with time zone default now()
);

-- Course progress
create table if not exists course_progress (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references courses(id) on delete cascade,
  progress_percent numeric not null default 0,
  months_remaining integer not null default 0,
  updated_at timestamp with time zone default now()
);

-- Trigger: create profile on new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Backfill profiles for existing users if needed
-- insert into public.profiles (id, email)
-- select u.id, u.email from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'on_auth_user_created' AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- RLS and policies (recommended for production)
-- Enable RLS
alter table profiles enable row level security;
alter table courses enable row level security;
alter table course_forms enable row level security;
alter table enrollments enable row level security;
alter table course_progress enable row level security;
alter table family_groups enable row level security;
-- Also enable for existing programs table (site content)
alter table programs enable row level security;
-- Resources table (create if not exists)
create table if not exists resources (
  id bigserial primary key,
  title text not null,
  description text,
  file_url text not null,
  category text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);
alter table resources enable row level security;

-- Program forms (tied to programs)
create table if not exists program_forms (
  id bigserial primary key,
  program_id bigint not null references programs(id) on delete cascade,
  form_type form_type not null,
  schema jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);
create unique index if not exists program_forms_unique on program_forms(program_id, form_type);
alter table program_forms enable row level security;

-- Helper: determine if current user is admin
create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable as $$
  select exists(
    select 1 from public.profiles p where p.id = uid and p.role in ('admin','super_admin')
  );
$$;

-- profiles policies (idempotent)
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING ( auth.uid() = id OR is_admin(auth.uid()) );
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING ( auth.uid() = id );
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE USING ( is_admin(auth.uid()) );

-- courses policies
create policy "courses_read_all" on courses for select using ( true );
create policy "courses_admin_write" on courses for insert with check ( is_admin(auth.uid()) );
create policy "courses_admin_update" on courses for update using ( is_admin(auth.uid()) );
create policy "courses_admin_delete" on courses for delete using ( is_admin(auth.uid()) );

-- programs policies
create policy "programs_read_all" on programs for select using ( true );
create policy "programs_admin_write" on programs for insert with check ( is_admin(auth.uid()) );
create policy "programs_admin_update" on programs for update using ( is_admin(auth.uid()) );
create policy "programs_admin_delete" on programs for delete using ( is_admin(auth.uid()) );

-- course_forms policies
create policy "course_forms_read_all" on course_forms for select using ( true );
create policy "course_forms_admin_write" on course_forms for insert with check ( is_admin(auth.uid()) );
create policy "course_forms_admin_update" on course_forms for update using ( is_admin(auth.uid()) );
create policy "course_forms_admin_delete" on course_forms for delete using ( is_admin(auth.uid()) );

-- program_forms policies
create policy "program_forms_read_all" on program_forms for select using ( true );
create policy "program_forms_admin_write" on program_forms for insert with check ( is_admin(auth.uid()) );
create policy "program_forms_admin_update" on program_forms for update using ( is_admin(auth.uid()) );
create policy "program_forms_admin_delete" on program_forms for delete using ( is_admin(auth.uid()) );

-- enrollments policies
create policy "enrollments_read_own_or_admin" on enrollments for select using ( user_id = auth.uid() or is_admin(auth.uid()) );
create policy "enrollments_insert_self" on enrollments for insert with check ( user_id = auth.uid() );
create policy "enrollments_update_admin" on enrollments for update using ( is_admin(auth.uid()) );

-- New columns for defer and completion states (idempotent)
alter table enrollments add column if not exists defer_active boolean not null default false;
alter table enrollments add column if not exists completed_at timestamp with time zone;

-- course_progress policies
create policy "progress_read_own_or_admin" on course_progress for select using ( user_id = auth.uid() or is_admin(auth.uid()) );
create policy "progress_update_own" on course_progress for update using ( user_id = auth.uid() );
create policy "progress_admin_insert" on course_progress for insert with check ( is_admin(auth.uid()) );

-- family_groups policies
create policy "family_groups_read_head" on family_groups for select using ( head_user_id = auth.uid() or is_admin(auth.uid()) );
create policy "family_groups_insert_head" on family_groups for insert with check ( head_user_id = auth.uid() );

-- resources policies
create policy "resources_read_all" on resources for select using ( true );
create policy "resources_admin_write" on resources for insert with check ( is_admin(auth.uid()) );
create policy "resources_admin_update" on resources for update using ( is_admin(auth.uid()) );
create policy "resources_admin_delete" on resources for delete using ( is_admin(auth.uid()) );

-- Optional RPC to fetch users with emails (requires Postgres function that joins auth.users)
create or replace function public.get_users_with_profiles()
returns table(id uuid, email text, role text) language sql security definer as $$
  select u.id, u.email, p.role
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
$$;

