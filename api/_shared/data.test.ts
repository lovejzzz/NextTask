import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { getTaskOrThrow, recordActivityBestEffort, relationChanges } from './data.js';

describe('relationChanges', () => {
  it('only adds and removes changed relation ids', () => {
    expect(relationChanges(['member-a', 'member-b'], ['member-b', 'member-c'])).toEqual({
      added: ['member-c'],
      removed: ['member-a'],
    });
    expect(relationChanges(['member-a'], ['member-a'])).toEqual({ added: [], removed: [] });
  });
});

describe('recordActivityBestEffort', () => {
  it('logs activity failures without rejecting the primary mutation', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'activity table unavailable' } });
    const supabase = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      recordActivityBestEffort(supabase, 'user-id', 'board-id', 'task-id', 'comment_added', 'Commented'),
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});

describe('getTaskOrThrow', () => {
  function clientReturning(data: unknown, error: { code: string; message: string } | null) {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data, error }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    return { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
  }

  it('returns not_found only when the task is absent', async () => {
    const client = clientReturning(null, { code: 'PGRST116', message: 'No rows' });

    await expect(getTaskOrThrow(client, 'user-id', 'task-id')).rejects.toMatchObject({
      code: 'not_found',
      status: 404,
    });
  });

  it('keeps database failures distinct from a missing task', async () => {
    const client = clientReturning(null, { code: '08006', message: 'Connection unavailable' });

    await expect(getTaskOrThrow(client, 'user-id', 'task-id')).rejects.toMatchObject({
      code: 'server_error',
      status: 500,
    });
  });
});
