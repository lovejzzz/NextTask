-- Defense-in-depth constraints for writes made directly through Supabase.
-- The API validates these fields too, but RLS controls ownership rather than
-- payload size, so database constraints keep that protection at the boundary.

alter table public.tasks
  drop constraint if exists tasks_description_length_check,
  add constraint tasks_description_length_check check (char_length(description) <= 4000),
  drop constraint if exists tasks_position_nonnegative_check,
  add constraint tasks_position_nonnegative_check check (position >= 0);

alter table public.team_members
  drop constraint if exists team_members_avatar_url_length_check,
  add constraint team_members_avatar_url_length_check
    check (avatar_url is null or char_length(avatar_url) <= 2048);

alter table public.activity_events
  drop constraint if exists activity_events_message_length_check,
  add constraint activity_events_message_length_check check (char_length(trim(message)) between 1 and 500),
  drop constraint if exists activity_events_metadata_object_check,
  add constraint activity_events_metadata_object_check check (jsonb_typeof(metadata) = 'object');

-- Activity history is append-only through the application. Authenticated users
-- still need SELECT and INSERT because API handlers execute with their JWT, but
-- direct Supabase clients must not rewrite or erase existing events.
revoke update, delete on table public.activity_events from authenticated;
drop policy if exists "Users can update own activity events" on public.activity_events;
drop policy if exists "Users can delete own activity events" on public.activity_events;

-- Clear-board is one destructive transaction. SECURITY INVOKER keeps every
-- delete under the caller's RLS policies; search_path hardening prevents object
-- shadowing. Deleting tasks cascades links, comments, and activity first.
create or replace function public.reset_board()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  delete from public.tasks where user_id = uid;
  delete from public.team_members where user_id = uid;
  delete from public.labels where user_id = uid;
end;
$$;

grant execute on function public.reset_board() to authenticated;

-- Rollback:
-- alter table public.tasks drop constraint if exists tasks_description_length_check;
-- alter table public.tasks drop constraint if exists tasks_position_nonnegative_check;
-- alter table public.team_members drop constraint if exists team_members_avatar_url_length_check;
-- alter table public.activity_events drop constraint if exists activity_events_message_length_check;
-- alter table public.activity_events drop constraint if exists activity_events_metadata_object_check;
-- grant update, delete on table public.activity_events to authenticated;
-- recreate the update/delete policies from 001_init.sql if rolling back append-only history.
-- drop function if exists public.reset_board();
