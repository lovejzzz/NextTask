import { describe, expect, it } from 'vitest';

import { buildApiHeaders, readApiResponse } from './api';

describe('buildApiHeaders', () => {
  it('adds local date context, preserves caller headers, and protects the authenticated bearer token', () => {
    const localNoon = new Date(2026, 7, 17, 12, 0, 0);
    const headers = buildApiHeaders(
      'trusted-token',
      { Accept: 'application/json', Authorization: 'Bearer untrusted-override' },
      localNoon,
    );

    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('authorization')).toBe('Bearer trusted-token');
    expect(headers.get('x-nexttask-today')).toBe('2026-08-17');
  });
});

describe('readApiResponse', () => {
  it('reads successful envelopes and 204 responses', async () => {
    const response = new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(readApiResponse<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
    await expect(readApiResponse<void>(new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });

  it('preserves API messages and gives useful fallbacks for non-JSON failures', async () => {
    const apiError = new Response(JSON.stringify({ error: { message: 'Title is required' } }), { status: 400 });
    await expect(readApiResponse(apiError)).rejects.toThrow('Title is required');

    const gatewayError = new Response('<html>Gateway timeout</html>', { status: 504 });
    await expect(readApiResponse(gatewayError)).rejects.toThrow('Request failed (504)');
  });

  it('rejects malformed successful envelopes instead of returning undefined', async () => {
    await expect(readApiResponse(new Response('{}', { status: 200 }))).rejects.toThrow('invalid response');
  });
});
