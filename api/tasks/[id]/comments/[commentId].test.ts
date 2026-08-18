import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VercelRequest, VercelResponse } from '../../../_shared/vercel.js';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getTaskOrThrow: vi.fn(),
  recordActivityBestEffort: vi.fn(),
}));

vi.mock('../../../_shared/auth.js', () => ({ requireUser: mocks.requireUser }));
vi.mock('../../../_shared/data.js', () => ({
  getTaskOrThrow: mocks.getTaskOrThrow,
  recordActivityBestEffort: mocks.recordActivityBestEffort,
}));

import handler from './[commentId].js';

const taskId = '123e4567-e89b-42d3-a456-426614174000';
const commentId = '987fcdeb-51a2-43d7-8f9e-123456789abc';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTaskOrThrow.mockResolvedValue({ id: taskId });
  mocks.recordActivityBestEffort.mockResolvedValue(undefined);
});

describe('DELETE task comment', () => {
  it('returns not found and does not emit false deletion activity when no comment was deleted', async () => {
    const supabase = supabaseWithDeleteResult({ data: null, error: null });
    mocks.requireUser.mockResolvedValue({ supabase, user: { id: 'user-id' } });
    const { res, result } = response();

    await handler(request(), res);

    expect(result).toEqual({
      statusCode: 404,
      body: { error: { code: 'not_found', message: 'Comment not found' } },
    });
    expect(mocks.recordActivityBestEffort).not.toHaveBeenCalled();
  });

  it('returns no content after deleting an existing comment', async () => {
    const supabase = supabaseWithDeleteResult({ data: { id: commentId }, error: null });
    mocks.requireUser.mockResolvedValue({ supabase, user: { id: 'user-id' } });
    const { res, result } = response();

    await handler(request(), res);

    expect(result.statusCode).toBe(204);
    expect(mocks.recordActivityBestEffort).toHaveBeenCalledOnce();
  });
});

function request(): VercelRequest {
  return {
    method: 'DELETE',
    url: `/api/tasks/${taskId}/comments/${commentId}`,
    headers: {},
    query: { id: taskId, commentId },
    socket: {},
  };
}

function response() {
  const result = { statusCode: 0, body: undefined as unknown };
  const res: VercelResponse = {
    status(code) {
      result.statusCode = code;
      return res;
    },
    json(body) {
      result.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
    end(body) {
      result.body = body;
      return res;
    },
  };
  return { res, result };
}

function supabaseWithDeleteResult(result: { data: { id: string } | null; error: null }) {
  const chain = {
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return { from: vi.fn(() => chain) };
}
