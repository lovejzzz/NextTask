// @vitest-environment node
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRemoteGenerate, decodeRemoteId, encodeRemoteId } from './brainProviders';

/**
 * Tier 1 (BoardyV1) live-path integration. The unit tests mock `fetch`; this exercises
 * the real network path — a genuine OpenAI-compatible HTTP server, a real request/
 * response round-trip, and the error fallback — so "a remote brain works" is verified
 * against an actual server, not a stub of one.
 */
let server: http.Server;
let base: string;
let lastBody: { model?: string; messages?: { role: string; content: string }[] } = {};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      lastBody = JSON.parse(body || '{}');
      const userText = lastBody.messages?.find((m) => m.role === 'user')?.content ?? '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: `echo:${userText}` } }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(() => server.close());

describe('remote brain — live HTTP round-trip', () => {
  it('sends the real prompt over the wire and parses the reply', async () => {
    const cfg = decodeRemoteId(encodeRemoteId({ endpoint: base, model: 'tier1-demo' }))!;
    const streamed: string[] = [];
    const reply = await createRemoteGenerate(cfg)([{ role: 'user', content: 'what should I focus on?' }], (t) => streamed.push(t));
    expect(reply).toBe('echo:what should I focus on?'); // round-trip parsed
    expect(lastBody.model).toBe('tier1-demo'); // config reached the server
    expect(streamed).toEqual(['echo:what should I focus on?']); // streaming callback fired
  });

  it('throws on an unreachable endpoint so the app falls back to the deterministic voice', async () => {
    const dead = createRemoteGenerate({ endpoint: 'http://localhost:1/v1', model: 'x' });
    await expect(dead([{ role: 'user', content: 'hi' }])).rejects.toBeTruthy();
  });
});
