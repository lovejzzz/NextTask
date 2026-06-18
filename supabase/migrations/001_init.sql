create extension if not exists "pgcrypto";

do $$
begin
  create type public.task_status as enum ('todo', 'in_progress', 'in_review', 'done');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_priority as enum ('low', 'normal', 'high');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.activity_type as enum (
    'task_created',
    'task_updated',
    'task_moved',
    'assignee_added',
    'assignee_removed',
    'label_added',
    'label_removed',
    'comment_added',
    'comment_deleted',
    'task_deleted'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'normal',
  due_date date,
  position integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  avatar_url text,
  color text not null default '#7A5AF8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index if not exists team_members_user_name_idx
  on public.team_members (user_id, lower(name));

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  color text not null default '#2E90FA' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index if not exists labels_user_name_idx
  on public.labels (user_id, lower(name));

create table if not exists public.task_assignees (
  task_id uuid not null,
  member_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, member_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade,
  foreign key (member_id, user_id) references public.team_members(id, user_id) on delete cascade
);

create table if not exists public.task_labels (
  task_id uuid not null,
  label_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade,
  foreign key (label_id, user_id) references public.labels(id, user_id) on delete cascade
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type public.activity_type not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);

create index if not exists tasks_user_status_position_idx
  on public.tasks (user_id, status, position);

create index if not exists tasks_user_due_date_idx
  on public.tasks (user_id, due_date);

create index if not exists task_assignees_user_member_idx
  on public.task_assignees (user_id, member_id);

create index if not exists task_labels_user_label_idx
  on public.task_labels (user_id, label_id);

create index if not exists comments_task_created_idx
  on public.comments (task_id, created_at);

create index if not exists activity_task_created_idx
  on public.activity_events (task_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists set_labels_updated_at on public.labels;
create trigger set_labels_updated_at
before update on public.labels
for each row execute function public.set_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.team_members enable row level security;
alter table public.labels enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels enable row level security;
alter table public.comments enable row level security;
alter table public.activity_events enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.labels to authenticated;
grant select, insert, update, delete on public.task_assignees to authenticated;
grant select, insert, update, delete on public.task_labels to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, update, delete on public.activity_events to authenticated;

drop policy if exists "Users can read own tasks" on public.tasks;
drop policy if exists "Users can create own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Users can read own tasks"
on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own tasks"
on public.tasks for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own tasks"
on public.tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own tasks"
on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own team members" on public.team_members;
drop policy if exists "Users can create own team members" on public.team_members;
drop policy if exists "Users can update own team members" on public.team_members;
drop policy if exists "Users can delete own team members" on public.team_members;

create policy "Users can read own team members"
on public.team_members for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own team members"
on public.team_members for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own team members"
on public.team_members for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own team members"
on public.team_members for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own labels" on public.labels;
drop policy if exists "Users can create own labels" on public.labels;
drop policy if exists "Users can update own labels" on public.labels;
drop policy if exists "Users can delete own labels" on public.labels;

create policy "Users can read own labels"
on public.labels for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own labels"
on public.labels for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own labels"
on public.labels for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own labels"
on public.labels for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own task assignees" on public.task_assignees;
drop policy if exists "Users can create own task assignees" on public.task_assignees;
drop policy if exists "Users can update own task assignees" on public.task_assignees;
drop policy if exists "Users can delete own task assignees" on public.task_assignees;

create policy "Users can read own task assignees"
on public.task_assignees for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own task assignees"
on public.task_assignees for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own task assignees"
on public.task_assignees for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own task assignees"
on public.task_assignees for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own task labels" on public.task_labels;
drop policy if exists "Users can create own task labels" on public.task_labels;
drop policy if exists "Users can update own task labels" on public.task_labels;
drop policy if exists "Users can delete own task labels" on public.task_labels;

create policy "Users can read own task labels"
on public.task_labels for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own task labels"
on public.task_labels for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own task labels"
on public.task_labels for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own task labels"
on public.task_labels for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own comments" on public.comments;
drop policy if exists "Users can create own comments" on public.comments;
drop policy if exists "Users can update own comments" on public.comments;
drop policy if exists "Users can delete own comments" on public.comments;

create policy "Users can read own comments"
on public.comments for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own comments"
on public.comments for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own comments"
on public.comments for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own comments"
on public.comments for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own activity events" on public.activity_events;
drop policy if exists "Users can create own activity events" on public.activity_events;
drop policy if exists "Users can update own activity events" on public.activity_events;
drop policy if exists "Users can delete own activity events" on public.activity_events;

create policy "Users can read own activity events"
on public.activity_events for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own activity events"
on public.activity_events for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own activity events"
on public.activity_events for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own activity events"
on public.activity_events for delete to authenticated
using ((select auth.uid()) = user_id);
