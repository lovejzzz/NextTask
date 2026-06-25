import { describe, expect, it, vi } from 'vitest';

import {
  authHeaders,
  buildChatCompletionBody,
  buildToolCallMessages,
  chatCompletionsUrl,
  createLocalToolCall,
  createRemoteGenerate,
  decodeRemoteId,
  describeToolsForPrompt,
  encodeRemoteId,
  extractFirstJsonObject,
  isRemoteId,
  looksLikeToolCall,
  parseChatCompletion,
  parseJsonToolCall,
  type RemoteBrainConfig,
} from './brainProviders';
import { BOARD_ACTION_TOOL, PLAN_TOOL, gateAction, readAction } from './liveAction';

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

describe('in-browser tool calling (the local agentic path)', () => {
  describe('extractFirstJsonObject', () => {
    it('pulls a balanced object out of surrounding prose', () => {
      expect(extractFirstJsonObject('Sure! {"a":1} done')).toBe('{"a":1}');
    });
    it('handles nested braces and braces inside strings', () => {
      expect(extractFirstJsonObject('x {"a":{"b":2},"s":"has } brace"} y')).toBe('{"a":{"b":2},"s":"has } brace"}');
    });
    it('returns null when there is no object or it is unbalanced', () => {
      expect(extractFirstJsonObject('no json here')).toBeNull();
      expect(extractFirstJsonObject('{"a": 1 (cut off')).toBeNull();
    });
  });

  describe('parseJsonToolCall', () => {
    it('parses the asked-for {name, arguments} shape', () => {
      expect(parseJsonToolCall('{"name":"propose_board_action","arguments":{"kind":"complete_task","task":"Email Sam"}}')).toEqual({
        name: 'propose_board_action',
        args: { kind: 'complete_task', task: 'Email Sam' },
      });
    });
    it('unwraps a Markdown code fence and ignores prose around it', () => {
      const reply = 'Okay, here:\n```json\n{"name":"propose_board_action","arguments":{"kind":"clear_overdue"}}\n```\nThat one.';
      expect(parseJsonToolCall(reply)).toEqual({ name: 'propose_board_action', args: { kind: 'clear_overdue' } });
    });
    it('accepts tool/args aliases and a name with flat args', () => {
      expect(parseJsonToolCall('{"tool":"propose_board_action","args":{"kind":"drop_task","task":"X"}}')).toEqual({
        name: 'propose_board_action',
        args: { kind: 'drop_task', task: 'X' },
      });
      expect(parseJsonToolCall('{"name":"propose_board_action","kind":"complete_task","task":"X"}')).toEqual({
        name: 'propose_board_action',
        args: { kind: 'complete_task', task: 'X' },
      });
    });
    it('infers the tool from bare args (gate still validates)', () => {
      expect(parseJsonToolCall('{"kind":"complete_task","task":"X"}')?.name).toBe('propose_board_action');
      expect(parseJsonToolCall('{"steps":[{"kind":"complete_task","task":"X"}]}')?.name).toBe('propose_plan');
    });
    it('returns null on prose or malformed JSON, so it falls back to plain text', () => {
      expect(parseJsonToolCall('Three overdue — pick one.')).toBeNull();
      expect(parseJsonToolCall('{"name": "x", oops}')).toBeNull();
      expect(parseJsonToolCall('{"hello":"world"}')).toBeNull(); // no name, no inferable shape
    });
  });

  describe('looksLikeToolCall (streaming hygiene)', () => {
    it('fires when the stream opens like a tool call', () => {
      expect(looksLikeToolCall('{')).toBe(true);
      expect(looksLikeToolCall('  {"name"')).toBe(true);
      expect(looksLikeToolCall('```json\n{')).toBe(true);
      expect(looksLikeToolCall('"name": "propose')).toBe(true);
    });
    it('stays quiet on prose, even prose with a brace mid-sentence', () => {
      expect(looksLikeToolCall('Three overdue — pick one.')).toBe(false);
      expect(looksLikeToolCall('Use the {placeholder} like so.')).toBe(false);
      expect(looksLikeToolCall('')).toBe(false);
    });
  });

  describe('describeToolsForPrompt / buildToolCallMessages', () => {
    it('lists the tool names and required args', () => {
      const text = describeToolsForPrompt([BOARD_ACTION_TOOL, PLAN_TOOL]);
      expect(text).toContain('propose_board_action');
      expect(text).toContain('propose_plan');
      expect(text).toMatch(/required: kind/);
    });
    it('appends a JSON instruction without mutating the caller messages', () => {
      const messages = [{ role: 'user' as const, content: 'finish the email task' }];
      const out = buildToolCallMessages(messages, [BOARD_ACTION_TOOL]);
      expect(messages).toHaveLength(1); // original untouched
      expect(out).toHaveLength(2);
      expect(out[1].role).toBe('system');
      expect(out[1].content).toMatch(/single JSON object/i);
      expect(out[1].content).toContain('propose_board_action');
    });

    it('includes a worked example of acting AND of declining to act', () => {
      const out = buildToolCallMessages([{ role: 'user' as const, content: 'hi' }], [BOARD_ACTION_TOOL]);
      const text = out[1].content;
      expect(text).toMatch(/Examples:/);
      expect(text).toMatch(/complete_task/); // the act-example shows the exact JSON shape
      expect(text).toMatch(/no JSON|just reply in prose/i); // the decline-example
    });
  });

  describe('createLocalToolCall', () => {
    it('parses a JSON tool call the local model emitted', async () => {
      const generate = async () => '{"name":"propose_board_action","arguments":{"kind":"clear_overdue"}}';
      const result = await createLocalToolCall(generate)([{ role: 'user', content: 'clear overdue' }], [BOARD_ACTION_TOOL]);
      expect(result.toolCall).toEqual({ name: 'propose_board_action', args: { kind: 'clear_overdue' } });
    });
    it('returns prose as text with no tool call when the model just talks', async () => {
      const generate = async () => 'Nothing pressing — go get a coffee.';
      const result = await createLocalToolCall(generate)([{ role: 'user', content: 'hi' }], [BOARD_ACTION_TOOL]);
      expect(result.toolCall).toBeNull();
      expect(result.text).toBe('Nothing pressing — go get a coffee.');
    });

    it('invokes the model exactly once — its prose can be reused without a second generation', async () => {
      const generate = vi.fn(async () => 'Nothing pressing — go get a coffee.');
      await createLocalToolCall(generate)([{ role: 'user', content: 'hi' }], [BOARD_ACTION_TOOL]);
      expect(generate).toHaveBeenCalledTimes(1);
    });
  });

  // The point of the whole rung: a local model's text becomes a structured intention
  // that the SAME gate admits only when grounded — no new authority, just a new path.
  describe('end to end: local JSON → the existing action gate', () => {
    const board = { titles: ['Email Sam', 'Polish the drawer'], overdue: 0 };
    it('admits a grounded action proposed as JSON by the in-browser model', async () => {
      const generate = async () => 'Sure: {"name":"propose_board_action","arguments":{"kind":"complete_task","task":"Email Sam"}}';
      const { toolCall } = await createLocalToolCall(generate)([{ role: 'user', content: 'done with the email' }], [BOARD_ACTION_TOOL]);
      const gated = gateAction(readAction(toolCall!.args), board);
      expect(gated.admitted).toBe(true);
      expect(gated.action?.task).toBe('Email Sam'); // normalized to the exact board title
    });
    it('rejects an invented task even when the JSON is well-formed', async () => {
      const generate = async () => '{"name":"propose_board_action","arguments":{"kind":"complete_task","task":"Buy a yacht"}}';
      const { toolCall } = await createLocalToolCall(generate)([{ role: 'user', content: 'x' }], [BOARD_ACTION_TOOL]);
      const gated = gateAction(readAction(toolCall!.args), board);
      expect(gated.admitted).toBe(false);
      expect(gated.reasons.join(' ')).toMatch(/not a task on the board/);
    });
  });
});
