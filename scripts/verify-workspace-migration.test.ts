import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../supabase/migrations/004_workspace_collaboration.sql', import.meta.url), 'utf8').toLowerCase();

describe('workspace collaboration migration', () => {
  it('backfills every legacy data table before requiring board_id', () => {
    for (const table of ['tasks', 'team_members', 'labels', 'task_assignees', 'task_labels', 'comments', 'activity_events']) {
      expect(sql).toContain(`alter table public.${table} alter column board_id set not null`);
    }
    expect(sql.indexOf("raise exception 'workspace migration could not map every legacy row to a board'")).toBeLessThan(
      sql.indexOf('alter table public.tasks alter column board_id set not null'),
    );
  });

  it('enforces roles, invitation secrecy, immutable attribution, and board relations', () => {
    expect(sql).toContain("workspace_role as enum ('owner', 'editor', 'viewer')");
    expect(sql).toContain("extensions.digest(raw_token, 'sha256')");
    expect(sql).toContain('on conflict (workspace_id, user_id) do update');
    expect(sql).not.toContain('set role = excluded.role');
    expect(sql).toContain('creator attribution cannot be changed');
    expect(sql).toContain('task_assignees_task_board_fkey');
    expect(sql).toContain('owner_id = user_id');
  });

  it('publishes full realtime rows and installs a durable authenticated limiter', () => {
    expect(sql).toContain('replica identity full');
    expect(sql).toContain('alter publication supabase_realtime add table');
    expect(sql).toContain('create table if not exists public.api_rate_limits');
    expect(sql).toContain('create or replace function public.consume_api_rate_limit');
    expect(sql).toContain('revoke all on public.api_rate_limits from anon, authenticated');
  });
});
