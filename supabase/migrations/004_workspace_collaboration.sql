-- NextTask v0.1 workspace tenancy and collaboration foundation.
--
-- This migration is deliberately compatibility-safe:
--   1. every user who already owns data receives a personal workspace + board;
--   2. every existing row is backfilled before board_id becomes NOT NULL;
--   3. legacy user_id columns remain as creator/actor attribution;
--   4. authorization switches from row creator ownership to board membership;
--   5. existing zero-argument reorder/reset RPCs keep working for personal boards.

do $$
begin
  create type public.workspace_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null;
end $$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 80),
  is_personal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_personal_owner_idx
  on public.workspaces (owner_id)
  where is_personal;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  display_name text not null default 'Collaborator'
    check (char_length(trim(display_name)) between 1 and 80),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id, workspace_id);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create index if not exists boards_workspace_created_idx
  on public.boards (workspace_id, created_at);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash bytea not null unique,
  role public.workspace_role not null check (role <> 'owner'),
  invitee_email text check (
    invitee_email is null
    or (
      char_length(invitee_email) between 3 and 320
      and invitee_email = lower(trim(invitee_email))
      and invitee_email like '%@%'
    )
  ),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists workspace_invitations_workspace_idx
  on public.workspace_invitations (workspace_id, created_at desc);

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_members_updated_at on public.workspace_members;
create trigger set_workspace_members_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

drop trigger if exists set_boards_updated_at on public.boards;
create trigger set_boards_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

-- Add the new tenancy key as nullable until every legacy row is mapped.
alter table public.tasks add column if not exists board_id uuid;
alter table public.team_members add column if not exists board_id uuid;
alter table public.labels add column if not exists board_id uuid;
alter table public.task_assignees add column if not exists board_id uuid;
alter table public.task_labels add column if not exists board_id uuid;
alter table public.comments add column if not exists board_id uuid;
alter table public.activity_events add column if not exists board_id uuid;

-- Creator/actor ids become attribution rather than ownership. Removing a user
-- from Auth must not cascade-delete shared board content they helped create.
alter table public.tasks alter column user_id drop not null;
alter table public.team_members alter column user_id drop not null;
alter table public.labels alter column user_id drop not null;
alter table public.task_assignees alter column user_id drop not null;
alter table public.task_labels alter column user_id drop not null;
alter table public.comments alter column user_id drop not null;
alter table public.activity_events alter column user_id drop not null;

alter table public.tasks
  drop constraint if exists tasks_user_id_fkey,
  add constraint tasks_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.team_members
  drop constraint if exists team_members_user_id_fkey,
  add constraint team_members_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.labels
  drop constraint if exists labels_user_id_fkey,
  add constraint labels_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.task_assignees
  drop constraint if exists task_assignees_user_id_fkey,
  add constraint task_assignees_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.task_labels
  drop constraint if exists task_labels_user_id_fkey,
  add constraint task_labels_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.comments
  drop constraint if exists comments_user_id_fkey,
  add constraint comments_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.activity_events
  drop constraint if exists activity_events_user_id_fkey,
  add constraint activity_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

-- Only users with persisted product data are backfilled eagerly. A user with an
-- empty legacy board receives a personal workspace on the next authenticated
-- request through ensure_personal_workspace().
with legacy_owners as (
  select user_id from public.tasks
  union select user_id from public.team_members
  union select user_id from public.labels
  union select user_id from public.comments
  union select user_id from public.activity_events
)
insert into public.workspaces (owner_id, name, is_personal)
select legacy_owners.user_id, 'My Workspace', true
from legacy_owners
where not exists (
  select 1
  from public.workspaces
  where workspaces.owner_id = legacy_owners.user_id
    and workspaces.is_personal
);

insert into public.workspace_members (workspace_id, user_id, role, display_name)
select id, owner_id, 'owner'::public.workspace_role, 'Owner'
from public.workspaces
where is_personal
on conflict (workspace_id, user_id) do update set role = 'owner';

insert into public.boards (workspace_id, name, created_by)
select workspaces.id, 'My Board', workspaces.owner_id
from public.workspaces
where workspaces.is_personal
  and not exists (
    select 1 from public.boards where boards.workspace_id = workspaces.id
  );

update public.tasks
set board_id = personal.board_id
from (
  select workspaces.owner_id, min(boards.id::text)::uuid as board_id
  from public.workspaces
  join public.boards on boards.workspace_id = workspaces.id
  where workspaces.is_personal
  group by workspaces.owner_id
) as personal
where tasks.board_id is null and tasks.user_id = personal.owner_id;

update public.team_members
set board_id = personal.board_id
from (
  select workspaces.owner_id, min(boards.id::text)::uuid as board_id
  from public.workspaces
  join public.boards on boards.workspace_id = workspaces.id
  where workspaces.is_personal
  group by workspaces.owner_id
) as personal
where team_members.board_id is null and team_members.user_id = personal.owner_id;

update public.labels
set board_id = personal.board_id
from (
  select workspaces.owner_id, min(boards.id::text)::uuid as board_id
  from public.workspaces
  join public.boards on boards.workspace_id = workspaces.id
  where workspaces.is_personal
  group by workspaces.owner_id
) as personal
where labels.board_id is null and labels.user_id = personal.owner_id;

update public.task_assignees
set board_id = tasks.board_id
from public.tasks
where task_assignees.board_id is null and task_assignees.task_id = tasks.id;

update public.task_labels
set board_id = tasks.board_id
from public.tasks
where task_labels.board_id is null and task_labels.task_id = tasks.id;

update public.comments
set board_id = tasks.board_id
from public.tasks
where comments.board_id is null and comments.task_id = tasks.id;

update public.activity_events
set board_id = tasks.board_id
from public.tasks
where activity_events.board_id is null and activity_events.task_id = tasks.id;

do $$
begin
  if exists (
    select 1
    from (
      select board_id from public.tasks
      union all select board_id from public.team_members
      union all select board_id from public.labels
      union all select board_id from public.task_assignees
      union all select board_id from public.task_labels
      union all select board_id from public.comments
      union all select board_id from public.activity_events
    ) rows
    where board_id is null
  ) then
    raise exception 'Workspace migration could not map every legacy row to a board';
  end if;
end $$;

alter table public.tasks alter column board_id set not null;
alter table public.team_members alter column board_id set not null;
alter table public.labels alter column board_id set not null;
alter table public.task_assignees alter column board_id set not null;
alter table public.task_labels alter column board_id set not null;
alter table public.comments alter column board_id set not null;
alter table public.activity_events alter column board_id set not null;

alter table public.tasks
  drop constraint if exists tasks_board_id_fkey,
  add constraint tasks_board_id_fkey foreign key (board_id) references public.boards(id) on delete cascade,
  drop constraint if exists tasks_id_board_id_key,
  add constraint tasks_id_board_id_key unique (id, board_id);

alter table public.team_members
  drop constraint if exists team_members_board_id_fkey,
  add constraint team_members_board_id_fkey foreign key (board_id) references public.boards(id) on delete cascade,
  drop constraint if exists team_members_id_board_id_key,
  add constraint team_members_id_board_id_key unique (id, board_id);

alter table public.labels
  drop constraint if exists labels_board_id_fkey,
  add constraint labels_board_id_fkey foreign key (board_id) references public.boards(id) on delete cascade,
  drop constraint if exists labels_id_board_id_key,
  add constraint labels_id_board_id_key unique (id, board_id);

-- Replace legacy creator-matching relations with board-matching relations so
-- collaborators can create joins/comments/activity without impersonating the
-- original task creator.
alter table public.task_assignees
  drop constraint if exists task_assignees_task_id_user_id_fkey,
  drop constraint if exists task_assignees_member_id_user_id_fkey,
  drop constraint if exists task_assignees_task_board_fkey,
  drop constraint if exists task_assignees_member_board_fkey,
  add constraint task_assignees_task_board_fkey
    foreign key (task_id, board_id) references public.tasks(id, board_id) on delete cascade,
  add constraint task_assignees_member_board_fkey
    foreign key (member_id, board_id) references public.team_members(id, board_id) on delete cascade;

alter table public.task_labels
  drop constraint if exists task_labels_task_id_user_id_fkey,
  drop constraint if exists task_labels_label_id_user_id_fkey,
  drop constraint if exists task_labels_task_board_fkey,
  drop constraint if exists task_labels_label_board_fkey,
  add constraint task_labels_task_board_fkey
    foreign key (task_id, board_id) references public.tasks(id, board_id) on delete cascade,
  add constraint task_labels_label_board_fkey
    foreign key (label_id, board_id) references public.labels(id, board_id) on delete cascade;

alter table public.comments
  drop constraint if exists comments_task_id_user_id_fkey,
  drop constraint if exists comments_task_board_fkey,
  add constraint comments_task_board_fkey
    foreign key (task_id, board_id) references public.tasks(id, board_id) on delete cascade;

alter table public.activity_events
  drop constraint if exists activity_events_task_id_user_id_fkey,
  drop constraint if exists activity_events_task_board_fkey,
  add constraint activity_events_task_board_fkey
    foreign key (task_id, board_id) references public.tasks(id, board_id) on delete cascade;

drop index if exists public.team_members_user_name_idx;
drop index if exists public.labels_user_name_idx;
create unique index if not exists team_members_board_name_idx
  on public.team_members (board_id, lower(name));
create unique index if not exists labels_board_name_idx
  on public.labels (board_id, lower(name));
create index if not exists tasks_board_status_position_idx
  on public.tasks (board_id, status, position);
create index if not exists tasks_board_due_date_idx
  on public.tasks (board_id, due_date);
create index if not exists task_assignees_board_member_idx
  on public.task_assignees (board_id, member_id);
create index if not exists task_labels_board_label_idx
  on public.task_labels (board_id, label_id);

create or replace function public.protect_board_attribution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.board_id is distinct from old.board_id then
    raise exception 'board_id cannot be changed after creation' using errcode = '42501';
  end if;
  -- The auth-user FK may anonymize attribution during an administrative user
  -- deletion. Ordinary authenticated writes may not change it, including to
  -- NULL, so collaborators cannot erase or impersonate authorship.
  if new.user_id is distinct from old.user_id
    and not (new.user_id is null and auth.uid() is null) then
    raise exception 'creator attribution cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_tasks_attribution on public.tasks;
create trigger protect_tasks_attribution before update on public.tasks
for each row execute function public.protect_board_attribution();
drop trigger if exists protect_team_members_attribution on public.team_members;
create trigger protect_team_members_attribution before update on public.team_members
for each row execute function public.protect_board_attribution();
drop trigger if exists protect_labels_attribution on public.labels;
create trigger protect_labels_attribution before update on public.labels
for each row execute function public.protect_board_attribution();
drop trigger if exists protect_task_assignees_attribution on public.task_assignees;
create trigger protect_task_assignees_attribution before update on public.task_assignees
for each row execute function public.protect_board_attribution();
drop trigger if exists protect_task_labels_attribution on public.task_labels;
create trigger protect_task_labels_attribution before update on public.task_labels
for each row execute function public.protect_board_attribution();
drop trigger if exists protect_comments_attribution on public.comments;
create trigger protect_comments_attribution before update on public.comments
for each row execute function public.protect_board_attribution();
drop trigger if exists protect_activity_attribution on public.activity_events;
create trigger protect_activity_attribution before update on public.activity_events
for each row execute function public.protect_board_attribution();

-- SECURITY DEFINER membership helpers avoid recursive workspace_members RLS.
-- They return only authorization booleans/roles and never expose hidden rows.
create or replace function public.current_workspace_role(target_workspace_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.workspace_members
  where workspace_id = target_workspace_id
    and user_id = auth.uid()
$$;

create or replace function public.can_view_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_workspace_role(target_workspace_id) is not null
$$;

create or replace function public.can_edit_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_workspace_role(target_workspace_id) in ('owner', 'editor')
$$;

create or replace function public.can_admin_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_workspace_role(target_workspace_id) = 'owner'
$$;

create or replace function public.can_view_board(target_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards
    join public.workspace_members
      on workspace_members.workspace_id = boards.workspace_id
    where boards.id = target_board_id
      and workspace_members.user_id = auth.uid()
  )
$$;

create or replace function public.can_edit_board(target_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards
    join public.workspace_members
      on workspace_members.workspace_id = boards.workspace_id
    where boards.id = target_board_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'editor')
  )
$$;

revoke all on function public.current_workspace_role(uuid) from public;
revoke all on function public.can_view_workspace(uuid) from public;
revoke all on function public.can_edit_workspace(uuid) from public;
revoke all on function public.can_admin_workspace(uuid) from public;
revoke all on function public.can_view_board(uuid) from public;
revoke all on function public.can_edit_board(uuid) from public;
grant execute on function public.current_workspace_role(uuid) to authenticated;
grant execute on function public.can_view_workspace(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;
grant execute on function public.can_admin_workspace(uuid) to authenticated;
grant execute on function public.can_view_board(uuid) to authenticated;
grant execute on function public.can_edit_board(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards enable row level security;
alter table public.workspace_invitations enable row level security;

grant select, update, delete on public.workspaces to authenticated;
grant select, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.boards to authenticated;
grant select, delete on public.workspace_invitations to authenticated;

drop policy if exists "Members can read workspaces" on public.workspaces;
drop policy if exists "Users can create workspaces" on public.workspaces;
drop policy if exists "Owners can update workspaces" on public.workspaces;
drop policy if exists "Owners can delete workspaces" on public.workspaces;
create policy "Members can read workspaces"
on public.workspaces for select to authenticated
using (public.can_view_workspace(id));
create policy "Users can create workspaces"
on public.workspaces for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy "Owners can update workspaces"
on public.workspaces for update to authenticated
using (public.can_admin_workspace(id))
with check (public.can_admin_workspace(id) and owner_id = (select auth.uid()));
create policy "Owners can delete workspaces"
on public.workspaces for delete to authenticated
using (public.can_admin_workspace(id) and not is_personal);

drop policy if exists "Members can read workspace members" on public.workspace_members;
drop policy if exists "Owners can add workspace members" on public.workspace_members;
drop policy if exists "Owners can update workspace members" on public.workspace_members;
drop policy if exists "Owners can remove workspace members" on public.workspace_members;
create policy "Members can read workspace members"
on public.workspace_members for select to authenticated
using (public.can_view_workspace(workspace_id));
create policy "Owners can add workspace members"
on public.workspace_members for insert to authenticated
with check (
  (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_id
        and workspaces.owner_id = (select auth.uid())
    )
  )
  or (
    public.can_admin_workspace(workspace_id)
    and role <> 'owner'
  )
);
create policy "Owners can update workspace members"
on public.workspace_members for update to authenticated
using (public.can_admin_workspace(workspace_id))
with check (
  public.can_admin_workspace(workspace_id)
  and (
    (
      role = 'owner'
      and exists (
        select 1 from public.workspaces
        where workspaces.id = workspace_id
          and workspaces.owner_id = user_id
      )
    )
    or (
      role <> 'owner'
      and not exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_id
        and workspaces.owner_id = user_id
      )
    )
  )
);
create policy "Owners can remove workspace members"
on public.workspace_members for delete to authenticated
using (
  public.can_admin_workspace(workspace_id)
  and not exists (
    select 1 from public.workspaces
    where workspaces.id = workspace_id
      and workspaces.owner_id = user_id
  )
);

drop policy if exists "Members can read boards" on public.boards;
drop policy if exists "Editors can create boards" on public.boards;
drop policy if exists "Editors can update boards" on public.boards;
drop policy if exists "Owners can delete boards" on public.boards;
create policy "Members can read boards"
on public.boards for select to authenticated
using (public.can_view_workspace(workspace_id));
create policy "Editors can create boards"
on public.boards for insert to authenticated
with check (public.can_edit_workspace(workspace_id) and created_by = (select auth.uid()));
create policy "Editors can update boards"
on public.boards for update to authenticated
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));
create policy "Owners can delete boards"
on public.boards for delete to authenticated
using (public.can_admin_workspace(workspace_id));

drop policy if exists "Owners can read invitations" on public.workspace_invitations;
drop policy if exists "Owners can create invitations" on public.workspace_invitations;
drop policy if exists "Owners can revoke invitations" on public.workspace_invitations;
create policy "Owners can read invitations"
on public.workspace_invitations for select to authenticated
using (public.can_admin_workspace(workspace_id));
create policy "Owners can create invitations"
on public.workspace_invitations for insert to authenticated
with check (
  public.can_admin_workspace(workspace_id)
  and created_by = (select auth.uid())
  and role <> 'owner'
);
create policy "Owners can revoke invitations"
on public.workspace_invitations for delete to authenticated
using (public.can_admin_workspace(workspace_id));

-- Replace every legacy creator-ownership policy on product data. Explicit
-- board filters in the API remain defense in depth; RLS is authoritative.
do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'tasks', 'team_members', 'labels', 'task_assignees',
    'task_labels', 'comments', 'activity_events'
  ]
  loop
    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end loop;
  end loop;
end $$;

create policy "Board members can read tasks"
on public.tasks for select to authenticated using (public.can_view_board(board_id));
create policy "Board editors can create tasks"
on public.tasks for insert to authenticated with check (
  public.can_edit_board(board_id) and user_id = (select auth.uid())
);
create policy "Board editors can update tasks"
on public.tasks for update to authenticated
using (public.can_edit_board(board_id))
with check (public.can_edit_board(board_id));
create policy "Board editors can delete tasks"
on public.tasks for delete to authenticated using (public.can_edit_board(board_id));

create policy "Board members can read team members"
on public.team_members for select to authenticated using (public.can_view_board(board_id));
create policy "Board editors can create team members"
on public.team_members for insert to authenticated with check (
  public.can_edit_board(board_id) and user_id = (select auth.uid())
);
create policy "Board editors can update team members"
on public.team_members for update to authenticated
using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));
create policy "Board editors can delete team members"
on public.team_members for delete to authenticated using (public.can_edit_board(board_id));

create policy "Board members can read labels"
on public.labels for select to authenticated using (public.can_view_board(board_id));
create policy "Board editors can create labels"
on public.labels for insert to authenticated with check (
  public.can_edit_board(board_id) and user_id = (select auth.uid())
);
create policy "Board editors can update labels"
on public.labels for update to authenticated
using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));
create policy "Board editors can delete labels"
on public.labels for delete to authenticated using (public.can_edit_board(board_id));

create policy "Board members can read task assignees"
on public.task_assignees for select to authenticated using (public.can_view_board(board_id));
create policy "Board editors can create task assignees"
on public.task_assignees for insert to authenticated with check (
  public.can_edit_board(board_id) and user_id = (select auth.uid())
);
create policy "Board editors can update task assignees"
on public.task_assignees for update to authenticated
using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));
create policy "Board editors can delete task assignees"
on public.task_assignees for delete to authenticated using (public.can_edit_board(board_id));

create policy "Board members can read task labels"
on public.task_labels for select to authenticated using (public.can_view_board(board_id));
create policy "Board editors can create task labels"
on public.task_labels for insert to authenticated with check (
  public.can_edit_board(board_id) and user_id = (select auth.uid())
);
create policy "Board editors can update task labels"
on public.task_labels for update to authenticated
using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));
create policy "Board editors can delete task labels"
on public.task_labels for delete to authenticated using (public.can_edit_board(board_id));

create policy "Board members can read comments"
on public.comments for select to authenticated using (public.can_view_board(board_id));
create policy "Board editors can create comments"
on public.comments for insert to authenticated with check (
  public.can_edit_board(board_id) and user_id = (select auth.uid())
);
create policy "Comment authors can update comments"
on public.comments for update to authenticated
using (public.can_edit_board(board_id) and user_id = (select auth.uid()))
with check (public.can_edit_board(board_id) and user_id = (select auth.uid()));
create policy "Comment authors or owners can delete comments"
on public.comments for delete to authenticated
using (
  public.can_edit_board(board_id)
  and (
    user_id = (select auth.uid())
    or public.can_admin_workspace((select workspace_id from public.boards where id = board_id))
  )
);

create policy "Board members can read activity events"
on public.activity_events for select to authenticated using (public.can_view_board(board_id));
create policy "Board editors can create activity events"
on public.activity_events for insert to authenticated with check (
  public.can_edit_board(board_id) and user_id = (select auth.uid())
);

-- Personal workspace bootstrap used by compatibility clients and the API when
-- no explicit X-NextTask-Board-Id has been selected yet.
create or replace function public.ensure_personal_workspace()
returns table (workspace_id uuid, board_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target_workspace_id uuid;
  target_board_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select workspaces.id into target_workspace_id
  from public.workspaces as workspaces
  where workspaces.owner_id = uid and workspaces.is_personal
  limit 1;

  if target_workspace_id is null then
    insert into public.workspaces (owner_id, name, is_personal)
    values (uid, 'My Workspace', true)
    returning id into target_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, display_name)
  values (
    target_workspace_id,
    uid,
    'owner',
    coalesce(nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''), 'Owner')
  )
  on conflict on constraint workspace_members_pkey do update set role = 'owner';

  select boards.id into target_board_id
  from public.boards as boards
  where boards.workspace_id = target_workspace_id
  order by boards.created_at, boards.id
  limit 1;

  if target_board_id is null then
    insert into public.boards (workspace_id, name, created_by)
    values (target_workspace_id, 'My Board', uid)
    returning id into target_board_id;
  end if;

  return query select target_workspace_id, target_board_id;
end;
$$;

-- Workspace creation is transactional, preventing orphan workspaces if board or
-- membership creation fails.
create or replace function public.create_workspace(workspace_name text)
returns table (workspace_id uuid, board_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target_workspace_id uuid;
  target_board_id uuid;
  clean_name text := trim(workspace_name);
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if char_length(clean_name) not between 1 and 80 then
    raise exception 'Workspace name must contain 1 to 80 characters' using errcode = '22023';
  end if;

  insert into public.workspaces (owner_id, name)
  values (uid, clean_name)
  returning id into target_workspace_id;
  insert into public.workspace_members (workspace_id, user_id, role, display_name)
  values (
    target_workspace_id,
    uid,
    'owner',
    coalesce(nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''), 'Owner')
  );
  insert into public.boards (workspace_id, name, created_by)
  values (target_workspace_id, 'Main Board', uid)
  returning id into target_board_id;
  return query select target_workspace_id, target_board_id;
end;
$$;

create or replace function public.create_workspace_invitation(
  target_workspace_id uuid,
  invite_role public.workspace_role,
  target_email text default null,
  valid_for interval default interval '7 days'
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  raw_token text;
  clean_email text := nullif(lower(trim(target_email)), '');
  target_expiry timestamptz;
  target_invitation_id uuid;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not public.can_admin_workspace(target_workspace_id) then
    raise exception 'Only workspace owners can invite members' using errcode = '42501';
  end if;
  if invite_role = 'owner' then
    raise exception 'Invitations cannot grant owner access' using errcode = '22023';
  end if;
  if valid_for < interval '5 minutes' or valid_for > interval '30 days' then
    raise exception 'Invitation lifetime must be between 5 minutes and 30 days' using errcode = '22023';
  end if;
  if clean_email is not null and (char_length(clean_email) not between 3 and 320 or clean_email not like '%@%') then
    raise exception 'Invalid invitation email' using errcode = '22023';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  target_expiry := now() + valid_for;
  insert into public.workspace_invitations (
    workspace_id, token_hash, role, invitee_email, created_by, expires_at
  ) values (
    target_workspace_id,
    extensions.digest(raw_token, 'sha256'),
    invite_role,
    clean_email,
    uid,
    target_expiry
  ) returning id into target_invitation_id;

  return query select target_invitation_id, raw_token, target_expiry;
end;
$$;

-- SECURITY DEFINER is required because an invitee is not a member yet and must
-- not receive SELECT access to invitation hashes. The function exposes only the
-- accepted workspace id after validating the opaque token and optional email.
create or replace function public.accept_workspace_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invitation public.workspace_invitations%rowtype;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if char_length(invitation_token) <> 64 then
    raise exception 'Invalid or expired invitation' using errcode = '22023';
  end if;

  select * into invitation
  from public.workspace_invitations
  where token_hash = extensions.digest(invitation_token, 'sha256')
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invitation' using errcode = '22023';
  end if;
  if invitation.invitee_email is not null and invitation.invitee_email <> jwt_email then
    raise exception 'This invitation belongs to a different email address' using errcode = '42501';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, display_name, invited_by)
  values (
    invitation.workspace_id,
    uid,
    invitation.role,
    coalesce(nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''), 'Collaborator'),
    invitation.created_by
  )
  on conflict (workspace_id, user_id) do update
    -- Accepting another link must never downgrade an existing editor or owner.
    -- Existing membership is authoritative; the invitation only grants access
    -- to users who are not members yet.
    set invited_by = coalesce(public.workspace_members.invited_by, excluded.invited_by);

  update public.workspace_invitations
  set accepted_at = now(), accepted_by = uid
  where id = invitation.id;

  return invitation.workspace_id;
end;
$$;

create or replace function public.update_workspace_profile(
  target_workspace_id uuid,
  new_display_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean_name text := trim(new_display_name);
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if char_length(clean_name) not between 1 and 80 then
    raise exception 'Display name must contain 1 to 80 characters' using errcode = '22023';
  end if;

  update public.workspace_members
  set display_name = clean_name
  where workspace_id = target_workspace_id and user_id = uid;
  if not found then raise exception 'Workspace membership not found' using errcode = 'P0002'; end if;
  return clean_name;
end;
$$;

revoke all on function public.ensure_personal_workspace() from public;
revoke all on function public.create_workspace(text) from public;
revoke all on function public.create_workspace_invitation(uuid, public.workspace_role, text, interval) from public;
revoke all on function public.accept_workspace_invitation(text) from public;
revoke all on function public.update_workspace_profile(uuid, text) from public;
grant execute on function public.ensure_personal_workspace() to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.create_workspace_invitation(uuid, public.workspace_role, text, interval) to authenticated;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
grant execute on function public.update_workspace_profile(uuid, text) to authenticated;

-- Rebuild reorder for board-scoped authorization while preserving the original
-- JSON-only signature used by existing clients.
create or replace function public.reorder_tasks(updates jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  item jsonb;
  v_id uuid;
  v_status public.task_status;
  v_position integer;
  v_prev_status public.task_status;
  target_board_id uuid;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if jsonb_typeof(updates) is distinct from 'array' or jsonb_array_length(updates) = 0 then
    raise exception 'No updates provided' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(updates)) is distinct from
     (select count(distinct (value->>'id')) from jsonb_array_elements(updates) value) then
    raise exception 'Duplicate task id in reorder batch' using errcode = '22023';
  end if;

  select board_id into target_board_id
  from public.tasks
  where id = ((updates->0)->>'id')::uuid;
  if target_board_id is null or not public.can_edit_board(target_board_id) then
    raise exception 'Task board is not editable by current user' using errcode = '42501';
  end if;

  for item in select value from jsonb_array_elements(updates) value
  loop
    v_id := (item->>'id')::uuid;
    v_status := (item->>'status')::public.task_status;
    v_position := (item->>'position')::integer;
    if v_position < 0 then
      raise exception 'Invalid position % for task %', v_position, v_id using errcode = '22023';
    end if;

    select status into v_prev_status
    from public.tasks
    where id = v_id and board_id = target_board_id;
    if not found then
      raise exception 'Task % is missing or belongs to another board', v_id using errcode = 'P0002';
    end if;

    update public.tasks set status = v_status, position = v_position
    where id = v_id and board_id = target_board_id;
    if v_prev_status is distinct from v_status then
      insert into public.activity_events (task_id, board_id, user_id, type, message, metadata)
      values (
        v_id,
        target_board_id,
        uid,
        'task_moved',
        'Moved from ' || public.status_label(v_prev_status) || ' to ' || public.status_label(v_status),
        jsonb_build_object('from', v_prev_status, 'to', v_status)
      );
    end if;
  end loop;
end;
$$;

create or replace function public.reset_board(target_board_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not public.can_edit_board(target_board_id) then
    raise exception 'Board is not editable by current user' using errcode = '42501';
  end if;
  delete from public.tasks where board_id = target_board_id;
  delete from public.team_members where board_id = target_board_id;
  delete from public.labels where board_id = target_board_id;
end;
$$;

create or replace function public.reset_board()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  personal_board_id uuid;
begin
  select board_id into personal_board_id from public.ensure_personal_workspace();
  perform public.reset_board(personal_board_id);
end;
$$;

grant execute on function public.reorder_tasks(jsonb) to authenticated;
grant execute on function public.reset_board(uuid) to authenticated;
grant execute on function public.reset_board() to authenticated;

-- Durable, database-backed authenticated write limiting. No table privileges are
-- granted; callers can only consume their own bucket through this RPC.
create table if not exists public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (char_length(scope) between 1 and 80),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, scope)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  rate_scope text,
  maximum_requests integer,
  window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  allowed boolean;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if char_length(rate_scope) not between 1 and 80
    or maximum_requests not between 1 and 10000
    or window_seconds not between 1 and 3600 then
    raise exception 'Invalid rate-limit configuration' using errcode = '22023';
  end if;

  insert into public.api_rate_limits (user_id, scope, window_started_at, request_count)
  values (uid, rate_scope, now(), 1)
  on conflict (user_id, scope) do update
  set window_started_at = case
        when api_rate_limits.window_started_at + make_interval(secs => window_seconds) <= now()
          then now()
        else api_rate_limits.window_started_at
      end,
      request_count = case
        when api_rate_limits.window_started_at + make_interval(secs => window_seconds) <= now()
          then 1
        else api_rate_limits.request_count + 1
      end
  returning request_count <= maximum_requests into allowed;
  return allowed;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to authenticated;

-- Realtime events are filtered by board_id and still pass each subscriber's RLS
-- SELECT policy. Publication changes are idempotent for repeated deployments.
-- FULL identity keeps board_id/workspace_id available on UPDATE and DELETE so
-- filtered subscriptions can invalidate the correct client cache.
alter table public.tasks replica identity full;
alter table public.team_members replica identity full;
alter table public.labels replica identity full;
alter table public.task_assignees replica identity full;
alter table public.task_labels replica identity full;
alter table public.comments replica identity full;
alter table public.activity_events replica identity full;
alter table public.workspace_members replica identity full;
alter table public.boards replica identity full;

do $$
declare
  target_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach target_table in array array[
      'tasks', 'team_members', 'labels', 'task_assignees',
      'task_labels', 'comments', 'activity_events',
      'workspace_members', 'boards'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', target_table);
      end if;
    end loop;
  end if;
end $$;

-- Rollback requires returning APIs to user ownership before dropping board_id.
-- Because v0.1 permits genuine shared edits, rollback is intentionally not a
-- blind destructive script. Restore migration 003 policies/RPCs, export shared
-- workspaces, then remove the v0.1 tables and columns in a maintenance window.
