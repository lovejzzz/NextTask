import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VercelRequest, VercelResponse } from '../../../api/_shared/vercel.js';

const mocks = vi.hoisted(() => ({
  requireBoard: vi.fn(),
  hydrateBoard: vi.fn(),
  recordActivityBestEffort: vi.fn(),
}));
vi.mock('../../../api/_shared/workspace.js', () => ({ requireBoard: mocks.requireBoard }));
vi.mock('../../../api/_shared/data.js', () => ({
  hydrateBoard: mocks.hydrateBoard,
  recordActivityBestEffort: mocks.recordActivityBestEffort,
}));

import handler from '../../../api/bootstrap/demo.js';

const emptyBoard = { tasks: [], teamMembers: [], labels: [] };
const previousFallback = process.env.ALLOW_RESET_RPC_FALLBACK;

beforeEach(() => {
  mocks.requireBoard.mockReset();
  mocks.hydrateBoard.mockReset().mockResolvedValue(emptyBoard);
  delete process.env.ALLOW_RESET_RPC_FALLBACK;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (previousFallback === undefined) delete process.env.ALLOW_RESET_RPC_FALLBACK;
  else process.env.ALLOW_RESET_RPC_FALLBACK = previousFallback;
});

describe('reset board', () => {
  it('uses the transactional RPC without issuing sequential deletes', async () => {
    const supabase = resetClient(null);
    mocks.requireBoard.mockResolvedValue({ supabase, user: { id: 'user-id' }, board: { id: 'board-id' } });
    const { req, res, state } = requestAndResponse();

    await handler(req, res);

    expect(supabase.rpc).toHaveBeenCalledWith('reset_board', { target_board_id: 'board-id' });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(state.status).toBe(200);
  });

  it('fails closed when the production RPC is missing', async () => {
    const supabase = resetClient({ code: 'PGRST202', message: 'Function not found' });
    mocks.requireBoard.mockResolvedValue({ supabase, user: { id: 'user-id' }, board: { id: 'board-id' } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { req, res, state } = requestAndResponse();

    await handler(req, res);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(state.status).toBe(500);
    expect(state.body).toEqual({ error: { code: 'server_error', message: 'Something went wrong. Please try again.' } });
  });

  it('keeps the sequential path behind the explicit local-only fallback', async () => {
    process.env.ALLOW_RESET_RPC_FALLBACK = 'true';
    const supabase = resetClient({ code: 'PGRST202', message: 'Function not found' });
    mocks.requireBoard.mockResolvedValue({ supabase, user: { id: 'user-id' }, board: { id: 'board-id' } });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { req, res, state } = requestAndResponse();

    await handler(req, res);

    expect(supabase.from).toHaveBeenCalledTimes(3);
    expect(state.status).toBe(200);
    expect(warning).toHaveBeenCalledOnce();
  });
});

function resetClient(rpcError: { code: string; message: string } | null) {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const supabase = {
    rpc: vi.fn().mockResolvedValue({ error: rpcError }),
    from: vi.fn().mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) }),
  };
  return supabase as unknown as SupabaseClient & typeof supabase;
}

function requestAndResponse() {
  const state: { status?: number; body?: unknown } = {};
  const req = {
    method: 'POST',
    url: '/api/bootstrap/reset',
    query: { mode: 'reset' },
    headers: {},
    socket: {},
  } as unknown as VercelRequest;
  const res = {
    status(code: number) {
      state.status = code;
      return this;
    },
    json(value: unknown) {
      state.body = value;
      return this;
    },
    end() {
      return this;
    },
    setHeader() {
      return this;
    },
  } as unknown as VercelResponse;
  return { req, res, state };
}
