import { describe, expect, it, vi } from 'vitest';

import { fetchWithClockSkewRetry } from './auth.js';

describe('fetchWithClockSkewRetry', () => {
  it('retries the specific transient Supabase clock-skew rejection once', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ message: 'JWT issued at future' }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ data: [] }));
    const pause = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWithClockSkewRetry('https://project.supabase.co/rest/v1/tasks', undefined, fetcher, pause);

    expect(response.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledWith(1_000);
  });

  it('does not retry unrelated Supabase failures', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ message: 'permission denied' }, { status: 403 }));
    const pause = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWithClockSkewRetry('https://project.supabase.co/rest/v1/tasks', undefined, fetcher, pause);

    expect(response.status).toBe(403);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(pause).not.toHaveBeenCalled();
  });
});
