import { describe, expect, it, vi } from 'vitest';

import {
  authHeaders,
  buildChatCompletionBody,
  chatCompletionsUrl,
  createRemoteGenerate,
  decodeRemoteId,
  encodeRemoteId,
  isRemoteId,
  parseChatCompletion,
  type RemoteBrainConfig,
} from './brainProviders';

const cfg: RemoteBrainConfig = { endpoint: 'http://localhost:11434/v1', model: 'llama3.1:8b' };

describe('remote brain id encoding (rides the existing model slot)', () => {
  it('round-trips a config through an opaque model id', () => {
    const id = encodeRemoteId(cfg);
    expect(isRemoteId(id)).toBe(true);
    expect(decodeRemoteId(id)).toEqual(cfg);
  });
  it('treats an in-browser model id as not-remote', () => {
    expect(isRemoteId('onnx-community/Qwen3-0.6B-ONNX')).toBe(false);
    expect(decodeRemoteId('onnx-community/Qwen3-0.6B-ONNX')).toBeNull();
  });
});

describe('OpenAI-compatible request shaping (pure)', () => {
  it('builds the chat/completions url, trailing-slash and suffix safe', () => {
    expect(chatCompletionsUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1/chat/completions');
    expect(chatCompletionsUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1/chat/completions');
    expect(chatCompletionsUrl('https://api.x.ai/v1/chat/completions')).toBe('https://api.x.ai/v1/chat/completions');
  });
  it('builds a request body with roles, model, and sane defaults', () => {
    const body = buildChatCompletionBody([{ role: 'user', content: 'hi' }], 'm', {});
    expect(body).toMatchObject({ model: 'm', stream: false, messages: [{ role: 'user', content: 'hi' }] });
    expect(body.max_tokens).toBeGreaterThan(0);
  });
  it('only sends an Authorization header when a key is present', () => {
    expect(authHeaders()).not.toHaveProperty('Authorization');
    expect(authHeaders('sk-x').Authorization).toBe('Bearer sk-x');
  });
  it('parses content from message or text shape, defensively', () => {
    expect(parseChatCompletion({ choices: [{ message: { content: 'hello' } }] })).toBe('hello');
    expect(parseChatCompletion({ choices: [{ text: 'legacy' }] })).toBe('legacy');
    expect(parseChatCompletion({})).toBe('');
    expect(parseChatCompletion(null)).toBe('');
  });
});

describe('createRemoteGenerate', () => {
  it('posts to the endpoint and returns the parsed reply', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '  the answer  ' } }] }),
    } as Response);
    const generate = createRemoteGenerate(cfg, fetchImpl as unknown as typeof fetch);
    const seen: string[] = [];
    const out = await generate([{ role: 'user', content: 'q' }], (t) => seen.push(t));
    expect(out).toBe('the answer');
    expect(seen).toEqual(['the answer']); // emits once for the streaming UI path
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', expect.objectContaining({ method: 'POST' }));
  });

  it('throws on a failed request so the caller falls back to the deterministic voice', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    const generate = createRemoteGenerate(cfg, fetchImpl as unknown as typeof fetch);
    await expect(generate([{ role: 'user', content: 'q' }])).rejects.toThrow();
  });
});
