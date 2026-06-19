-- Atomic task reorder.
--
-- Replaces the API's sequential "select + update + insert-activity per item" loop
-- with a single transactional function. Because a plpgsql function runs in one
-- transaction, any raised exception rolls back the entire batch — so a partial
-- failure can never leave positions inconsistent.
--
-- Security model: SECURITY INVOKER (the default) so the caller's RLS still
-- applies — the function cannot reach another user's rows. `set search_path = ''`
-- hardens against search_path injection, so every object is schema-qualified.
-- An explicit ownership check makes a cross-user or missing id fail the whole
-- batch loudly rather than silently no-op.
--
-- Rollback:
--   drop function if exists public.reorder_tasks(jsonb);
--   drop function if exists public.status_label(public.task_status);

create or replace function public.status_label(s public.task_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'todo' then 'To Do'
    when 'in_progress' then 'In Progress'
    when 'in_review' then 'In Review'
    when 'done' then 'Done'
  end;
$$;

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
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if jsonb_typeof(updates) is distinct from 'array' or jsonb_array_length(updates) = 0 then
    raise exception 'No updates provided' using errcode = '22023';
  end if;

  -- Reject duplicate task ids within a single batch (a client bug that would
  -- otherwise apply two conflicting positions to the same task).
  if (select count(*) from jsonb_array_elements(updates)) is distinct from
     (select count(distinct (value->>'id')) from jsonb_array_elements(updates) as value) then
    raise exception 'Duplicate task id in reorder batch' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(updates) as value
  loop
    v_id := (item->>'id')::uuid;
    v_status := (item->>'status')::public.task_status;
    v_position := (item->>'position')::integer;

    if v_position < 0 then
      raise exception 'Invalid position % for task %', v_position, v_id using errcode = '22023';
    end if;

    -- Ownership check (and capture previous status). RLS already hides other
    -- users' rows, so a foreign or missing id surfaces here and aborts the batch.
    select status into v_prev_status
    from public.tasks
    where id = v_id and user_id = uid;

    if not found then
      raise exception 'Task % not found for current user', v_id using errcode = 'P0002';
    end if;

    update public.tasks
    set status = v_status, position = v_position
    where id = v_id and user_id = uid;

    -- Record a move event only when the status actually changes.
    if v_prev_status is distinct from v_status then
      insert into public.activity_events (task_id, user_id, type, message, metadata)
      values (
        v_id,
        uid,
        'task_moved',
        'Moved from ' || public.status_label(v_prev_status) || ' to ' || public.status_label(v_status),
        jsonb_build_object('from', v_prev_status, 'to', v_status)
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.status_label(public.task_status) to authenticated;
grant execute on function public.reorder_tasks(jsonb) to authenticated;
