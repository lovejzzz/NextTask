import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VercelRequest, VercelResponse } from '../../api/_shared/vercel.js';

const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock('../../api/_shared/auth.js', () => ({ requireUser: auth.requireUser }));

import labelHandler from '../../api/labels/[id].js';
import taskHandler from '../../api/tasks/[id].js';
import teamMemberHandler from '../../api/team-members/[id].js';

const resourceId = 'a40a3c72-2f47-45c4-8ab9-f56c1e5a1ea2';
const handlers = [
  ['task', taskHandler],
  ['label', labelHandler],
  ['team member', teamMemberHandler],
] as const;

beforeEach(() => {
  auth.requireUser.mockReset();
});

describe('destructive resource handlers', () => {
  for (const [resource, handler] of handlers) {
    it(`returns 404 when a ${resource} delete matches no owned row`, async () => {
      const supabase = deleteClient(null);
      auth.requireUser.mockResolvedValue({ supabase, user: { id: 'user-id' } });
      const { req, res, state } = requestAndResponse();

      await handler(req, res);

      expect(state.status).toBe(404);
      expect(state.body).toEqual({ error: { code: 'not_found', message: expect.stringContaining('not found') } });
    });

    it(`returns 204 only after deleting an owned ${resource}`, async () => {
      const supabase = deleteClient({ id: resourceId });
      auth.requireUser.mockResolvedValue({ supabase, user: { id: 'user-id' } });
      const { req, res, state } = requestAndResponse();

      await handler(req, res);

      expect(state.status).toBe(204);
      expect(state.ended).toBe(true);
    });
  }
});

function deleteClient(data: { id: string } | null) {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
}

function requestAndResponse() {
  const state: { status?: number; body?: unknown; ended: boolean } = { ended: false };
  const req = {
    method: 'DELETE',
    query: { id: resourceId },
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
      state.ended = true;
      return this;
    },
    setHeader() {
      return this;
    },
  } as unknown as VercelResponse;
  return { req, res, state };
}
