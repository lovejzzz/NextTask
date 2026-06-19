// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  onAuthStateChange: vi.fn(),
  updateUser: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({ supabase: { auth: mocks } }));

import { useAnonymousSession } from './useAnonymousSession';

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

describe('useAnonymousSession edge cases', () => {
  it('creates a guest session on first launch when none exists', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signInAnonymously.mockResolvedValue({
      data: { user: { id: 'guest-1', email: null, is_anonymous: true } },
      error: null,
    });

    const { result } = renderHook(() => useAnonymousSession());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.userId).toBe('guest-1');
    expect(result.current.isAnonymous).toBe(true);
  });

  it('surfaces an error when anonymous sign-in fails (e.g. rate limited)', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signInAnonymously.mockResolvedValue({ data: { user: null }, error: new Error('rate limited') });

    const { result } = renderHook(() => useAnonymousSession());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('rate limited');
  });

  it('enters the error state when the existing session is invalid/expired', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: new Error('invalid token') });

    const { result } = renderHook(() => useAnonymousSession());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('invalid token');
  });

  it('reuses an existing authenticated session', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.com', is_anonymous: false } } },
      error: null,
    });

    const { result } = renderHook(() => useAnonymousSession());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.userId).toBe('u1');
    expect(result.current.isAnonymous).toBe(false);
  });

  it('short-circuits saveBoardToEmail when already recoverable with the same email', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.com', is_anonymous: false } } },
      error: null,
    });

    const { result } = renderHook(() => useAnonymousSession());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let message = '';
    await act(async () => {
      message = await result.current.saveBoardToEmail('A@B.com');
    });
    expect(message).toMatch(/already recoverable/i);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before calling Supabase', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: null, is_anonymous: true } } },
      error: null,
    });

    const { result } = renderHook(() => useAnonymousSession());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await expect(result.current.saveBoardToEmail('not-an-email')).rejects.toThrow(/valid email/i);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
