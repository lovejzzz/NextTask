-- NextTask v0.2 collaboration lifecycle, authorized presence, and audit history.
--
-- This migration is additive and preserves every v0.1 workspace and board. It:
--   1. makes ownership transfer and member departure transactional;
--   2. preserves revoked invitations instead of deleting the evidence;
--   3. records immutable workspace lifecycle events for owner export;
--   4. authorizes private board Presence channels through workspace membership;
--   5. allows a user to delete their account only after shared ownership is resolved.

create table if not exists public.workspace_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_]{2,63}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists workspace_audit_events_workspace_created_idx
  on public.workspace_audit_events (workspace_id, created_at desc, id desc);

alter table public.workspace_audit_events enable row level security;
revoke all on public.workspace_audit_events from anon, authenticated;
grant select on public.workspace_audit_events to authenticated;

drop policy if exists "Owners can read workspace audit events" on public.workspace_audit_events;
create policy "Owners can read workspace audit events"
on public.workspace_audit_events for select to authenticated
using (public.can_admin_workspace(workspace_id));

-- Creator ids are attribution, not lifetime ownership. This makes account
-- deletion safe without removing shared boards or outstanding invitations.
alter table public.boards alter column created_by drop not null;
alter table public.boards
  drop constraint if exists boards_created_by_fkey,
  add constraint boards_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

alter table public.workspace_invitations alter column created_by drop not null;
alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_created_by_fkey,
  add constraint workspace_invitations_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

-- Revocation must go through the audited RPC. Owners retain read access but can
-- no longer hard-delete or directly mutate invitation evidence.
revoke insert, update, delete on public.workspace_invitations from authenticated;
drop policy if exists "Owners can revoke invitations" on public.workspace_invitations;

create or replace function public.append_workspace_audit_event(
  target_workspace_id uuid,
  event_action text,
  target_user_id uuid default null,
  event_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_workspace_id is null
    or event_action !~ '^[a-z][a-z0-9_]{2,63}$'
    or jsonb_typeof(event_metadata) is distinct from 'object' then
    raise exception 'Invalid workspace audit event' using errcode = '22023';
  end if;

  insert into public.workspace_audit_events (
    workspace_id,
    actor_user_id,
    subject_user_id,
    action,
    metadata
  ) values (
    target_workspace_id,
    auth.uid(),
    target_user_id,
    event_action,
    event_metadata
  );
end;
$$;

revoke all on function public.append_workspace_audit_event(uuid, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.audit_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_workspace_audit_event(
      new.id,
      'workspace_created',
      new.owner_id,
      jsonb_build_object('name', new.name, 'personal', new.is_personal)
    );
  elsif new.owner_id is distinct from old.owner_id then
    perform public.append_workspace_audit_event(
      new.id,
      'ownership_transferred',
      new.owner_id,
      jsonb_build_object('previous_owner_role', 'owner')
    );
  end if;

  if tg_op = 'UPDATE' and new.name is distinct from old.name then
    perform public.append_workspace_audit_event(
      new.id,
      'workspace_renamed',
      null,
      jsonb_build_object('from', old.name, 'to', new.name)
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_workspace_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_workspace_audit_event(
      new.workspace_id,
      'member_joined',
      new.user_id,
      jsonb_build_object('role', new.role, 'invited', new.invited_by is not null)
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- A workspace deletion cascades through memberships after the parent row is
    -- no longer visible. Its audit history is being removed too, so do not try
    -- to append an event that can no longer satisfy the workspace foreign key.
    if not exists (select 1 from public.workspaces where id = old.workspace_id) then
      return old;
    end if;
    perform public.append_workspace_audit_event(
      old.workspace_id,
      'member_removed',
      old.user_id,
      jsonb_build_object('role', old.role)
    );
    return old;
  end if;

  if new.role is distinct from old.role then
    perform public.append_workspace_audit_event(
      new.workspace_id,
      'member_role_changed',
      new.user_id,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_workspace_invitation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_workspace_audit_event(
      new.workspace_id,
      'invitation_created',
      null,
      jsonb_build_object(
        'invitation_id', new.id,
        'role', new.role,
        'email_bound', new.invitee_email is not null,
        'expires_at', new.expires_at
      )
    );
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform public.append_workspace_audit_event(
      new.workspace_id,
      'invitation_revoked',
      null,
      jsonb_build_object('invitation_id', new.id, 'role', new.role, 'email_bound', new.invitee_email is not null)
    );
  elsif new.accepted_at is not null and old.accepted_at is null then
    perform public.append_workspace_audit_event(
      new.workspace_id,
      'invitation_accepted',
      new.accepted_by,
      jsonb_build_object('invitation_id', new.id, 'role', new.role)
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_board_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_workspace_audit_event(
      new.workspace_id,
      'board_created',
      null,
      jsonb_build_object('board_id', new.id, 'name', new.name)
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- Skip board events generated by a cascading workspace deletion. Testing
    -- parent existence is reliable for both direct and cascade trigger depth.
    if not exists (select 1 from public.workspaces where id = old.workspace_id) then
      return old;
    end if;
    perform public.append_workspace_audit_event(
      old.workspace_id,
      'board_deleted',
      null,
      jsonb_build_object('board_id', old.id, 'name', old.name)
    );
    return old;
  end if;

  if new.name is distinct from old.name then
    perform public.append_workspace_audit_event(
      new.workspace_id,
      'board_renamed',
      null,
      jsonb_build_object('board_id', new.id, 'from', old.name, 'to', new.name)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_workspace_changes on public.workspaces;
create trigger audit_workspace_changes
after insert or update on public.workspaces
for each row execute function public.audit_workspace_change();

drop trigger if exists audit_workspace_member_changes on public.workspace_members;
create trigger audit_workspace_member_changes
after insert or update or delete on public.workspace_members
for each row execute function public.audit_workspace_member_change();

drop trigger if exists audit_workspace_invitation_changes on public.workspace_invitations;
create trigger audit_workspace_invitation_changes
after insert or update on public.workspace_invitations
for each row execute function public.audit_workspace_invitation_change();

drop trigger if exists audit_board_changes on public.boards;
create trigger audit_board_changes
after insert or update or delete on public.boards
for each row execute function public.audit_board_change();

create or replace function public.revoke_workspace_invitation(
  target_workspace_id uuid,
  target_invitation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not public.can_admin_workspace(target_workspace_id) then
    raise exception 'Only workspace owners can revoke invitations' using errcode = '42501';
  end if;

  update public.workspace_invitations
  set revoked_at = now()
  where workspace_id = target_workspace_id
    and id = target_invitation_id
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  returning id into invitation_id;

  if invitation_id is null then
    raise exception 'Active invitation not found' using errcode = 'P0002';
  end if;
  return invitation_id;
end;
$$;

create or replace function public.transfer_workspace_ownership(
  target_workspace_id uuid,
  new_owner_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace_record public.workspaces%rowtype;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;

  select * into workspace_record
  from public.workspaces
  where id = target_workspace_id
  for update;

  if not found then raise exception 'Workspace not found' using errcode = 'P0002'; end if;
  if workspace_record.owner_id <> uid then
    raise exception 'Only the current owner can transfer ownership' using errcode = '42501';
  end if;
  if workspace_record.is_personal then
    raise exception 'Personal workspace ownership cannot be transferred' using errcode = '22023';
  end if;
  if new_owner_id = uid then
    raise exception 'Select another workspace member' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = new_owner_id
  ) then
    raise exception 'New owner must already be a workspace member' using errcode = '22023';
  end if;

  update public.workspaces set owner_id = new_owner_id where id = target_workspace_id;
  update public.workspace_members
  set role = case when user_id = new_owner_id then 'owner'::public.workspace_role else 'editor'::public.workspace_role end
  where workspace_id = target_workspace_id and user_id in (uid, new_owner_id);

  return new_owner_id;
end;
$$;

create or replace function public.leave_workspace(target_workspace_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  member_role public.workspace_role;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;

  select role into member_role
  from public.workspace_members
  where workspace_id = target_workspace_id and user_id = uid
  for update;

  if member_role is null then raise exception 'Workspace membership not found' using errcode = 'P0002'; end if;
  if member_role = 'owner' then
    raise exception 'Transfer or delete the workspace before leaving' using errcode = '42501';
  end if;

  delete from public.workspace_members
  where workspace_id = target_workspace_id and user_id = uid;
  return target_workspace_id;
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if exists (
    select 1 from public.workspaces
    where owner_id = uid and not is_personal
  ) then
    raise exception 'Transfer or delete owned workspaces before deleting the account' using errcode = '42501';
  end if;

  delete from public.workspaces where owner_id = uid and is_personal;
  delete from public.workspace_members where user_id = uid;
  delete from auth.users where id = uid;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.revoke_workspace_invitation(uuid, uuid) from public;
revoke all on function public.transfer_workspace_ownership(uuid, uuid) from public;
revoke all on function public.leave_workspace(uuid) from public;
revoke all on function public.delete_own_account() from public;
grant execute on function public.revoke_workspace_invitation(uuid, uuid) to authenticated;
grant execute on function public.transfer_workspace_ownership(uuid, uuid) to authenticated;
grant execute on function public.leave_workspace(uuid) to authenticated;
grant execute on function public.delete_own_account() to authenticated;

-- Resolve and validate only NextTask board topics. The helper returns NULL for
-- malformed topics so authorization fails closed without UUID-cast errors.
create or replace function public.current_realtime_board_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  topic text := realtime.topic();
begin
  if topic ~ '^board:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    return split_part(topic, ':', 2)::uuid;
  end if;
  return null;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function public.current_realtime_board_id() from public;
grant execute on function public.current_realtime_board_id() to authenticated;

drop policy if exists "NextTask members can receive board presence" on realtime.messages;
create policy "NextTask members can receive board presence"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension = 'presence'
  and public.can_view_board(public.current_realtime_board_id())
);

drop policy if exists "NextTask members can publish board presence" on realtime.messages;
create policy "NextTask members can publish board presence"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension = 'presence'
  and public.can_view_board(public.current_realtime_board_id())
);
