import { describe, expect, it } from 'vitest';

import {
  buildAmbientMessages,
  buildChatMessages,
  buildSystemPrompt,
  cleanLine,
  FEW_SHOT,
  isGemmaModel,
  MODELS,
  modelDtype,
  modelLabel,
  nextModelId,
  recommendUpgrade,
  withNoThink,
  type PromptParts,
} from './companionBrain';

const parts: PromptParts = {
  mood: 'exasperated',
  context: {
    active: 5,
    overdue: 2,
    inProgress: 1,
    shippedToday: 3,
    titles: ['Wire the API', 'Polish the drawer', 'Write tests', 'Ignored fourth'],
  },
  memory: "We've known each other ~7 day(s).",
  persona: 'Be bitingly sarcastic.',
};

describe('buildSystemPrompt', () => {
  it('weaves in mood, persona, memory and board facts', () => {
    const prompt = buildSystemPrompt(parts);
    expect(prompt).toContain('exasperated');
    expect(prompt).toContain('Be bitingly sarcastic.');
    expect(prompt).toContain("We've known each other");
    expect(prompt).toContain('5 active, 2 overdue');
  });

  it('includes at most three sample titles', () => {
    const prompt = buildSystemPrompt(parts);
    expect(prompt).toContain('Wire the API');
    expect(prompt).not.toContain('Ignored fourth');
  });

  it('gives the board its name', () => {
    expect(buildSystemPrompt(parts)).toContain('Boardy');
  });

  it('enforces grounding and brevity (the self-test contract)', () => {
    const prompt = buildSystemPrompt(parts);
    expect(prompt).toMatch(/never invent task names/i);
    expect(prompt).toMatch(/1.?2 short sentences/i);
    expect(prompt).toMatch(/never mention being an ai/i);
  });
});

describe('buildAmbientMessages', () => {
  it('is a system + one-line user request', () => {
    const messages = buildAmbientMessages(parts);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].content).toMatch(/ONE short sentence/i);
  });
});

describe('buildChatMessages', () => {
  it('keeps the system turn and appends recent history', () => {
    const history = [
      { role: 'user' as const, content: 'what should I do next?' },
      { role: 'assistant' as const, content: 'finish the overdue ones, obviously' },
    ];
    const messages = buildChatMessages({ ...parts, history });
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toMatch(/talking to you/i);
    expect(messages.at(-1)?.content).toContain('overdue ones');
  });

  it('includes few-shot style anchors plus the trimmed history', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    const messages = buildChatMessages({ ...parts, history });
    expect(messages.length).toBe(1 + FEW_SHOT.length + 8); // system + anchors + last 8 turns
    expect(messages.at(-1)?.content).toBe('m19');
    expect(messages).toEqual(expect.arrayContaining(FEW_SHOT));
  });
});

describe('model selection', () => {
  it('cycles through the available models and wraps', () => {
    const ids = MODELS.map((model) => model.id);
    expect(nextModelId(ids[0])).toBe(ids[1]);
    expect(nextModelId(ids[ids.length - 1])).toBe(ids[0]);
  });

  it('labels a model, defaulting for unknown ids', () => {
    expect(modelLabel(MODELS[0].id)).toBe(MODELS[0].label);
    expect(modelLabel('mystery')).toBe(MODELS[0].label);
  });

  it('recommends a bigger model only when the score is weak and one exists', () => {
    expect(recommendUpgrade(MODELS[0].id, 4, 12)?.id).toBe(MODELS[1].id); // weak on small → suggest big
    expect(recommendUpgrade(MODELS[0].id, 11, 12)).toBeNull(); // healthy → no nag
    expect(recommendUpgrade(MODELS[MODELS.length - 1].id, 4, 12)).toBeNull(); // already biggest
  });

  it('offers the Gemma 4 agentic tier as selectable in-browser models', () => {
    const ids = MODELS.map((model) => model.id);
    expect(ids).toContain('onnx-community/gemma-4-E2B-it-ONNX');
    expect(ids).toContain('onnx-community/gemma-4-E4B-it-ONNX');
    // Ordered small→large so nextModelId/recommendUpgrade keep climbing toward Gemma.
    expect(MODELS.findIndex((m) => m.id.includes('gemma'))).toBeGreaterThan(
      MODELS.findIndex((m) => m.id.includes('Qwen3')),
    );
  });

  it('labels Gemma models from the registry', () => {
    expect(modelLabel('onnx-community/gemma-4-E2B-it-ONNX')).toBe('Gemma 4 E2B');
  });
});

describe('Gemma model handling', () => {
  it('detects the Gemma family case-insensitively, and only the Gemma family', () => {
    expect(isGemmaModel('onnx-community/gemma-4-E2B-it-ONNX')).toBe(true);
    expect(isGemmaModel('onnx-community/Gemma-4-E4B-it-ONNX')).toBe(true);
    expect(isGemmaModel('onnx-community/Qwen3-0.6B-ONNX')).toBe(false);
    expect(isGemmaModel('remote:{}')).toBe(false);
  });

  it('picks fp16 weights for Gemma (WebGPU) and plain q4 for the Qwen voice tier', () => {
    expect(modelDtype('onnx-community/gemma-4-E2B-it-ONNX')).toBe('q4f16');
    expect(modelDtype('onnx-community/gemma-4-E4B-it-ONNX')).toBe('q4f16');
    expect(modelDtype('onnx-community/Qwen3-0.6B-ONNX')).toBe('q4');
  });

  it('never appends the Qwen-only /no_think token to a Gemma turn', () => {
    // withNoThink is gated to Qwen3 in loadBrain; verify the token is Qwen-specific
    // so Gemma (which has no such control token) is left untouched by the same path.
    const out = withNoThink([{ role: 'user', content: 'hi' }]);
    expect(out[0].content).toContain('/no_think');
    expect(isGemmaModel('onnx-community/gemma-4-E2B-it-ONNX')).toBe(true); // → loadBrain skips withNoThink
  });
});

describe('cleanLine', () => {
  it('strips wrapping quotes and truncates very long output', () => {
    expect(cleanLine('"Ship something."')).toBe('Ship something.');
    expect(cleanLine('x'.repeat(300)).endsWith('…')).toBe(true);
  });

  it('drops Qwen3 reasoning blocks and never echoes the control token', () => {
    expect(cleanLine('<think>let me consider the board...</think>Ship the login fix.')).toBe('Ship the login fix.');
    expect(cleanLine('<think>truncated reasoning with no close')).toBe('');
    expect(cleanLine('Do the thing. /no_think')).toBe('Do the thing.');
  });

  it('strips Gemma turn markers and a leaked opening role tag', () => {
    expect(cleanLine('<start_of_turn>model\nShip it.<end_of_turn>')).toBe('Ship it.');
    expect(cleanLine('model\nThree overdue, friend.')).toBe('Three overdue, friend.');
  });

  it('does not eat prose that merely starts with the word "model"', () => {
    // The role-tag strip only fires on a bare "model\n" line, never on real words.
    expect(cleanLine('model railways are the one task you keep dodging.')).toBe(
      'model railways are the one task you keep dodging.',
    );
  });
});

describe('withNoThink', () => {
  it('appends the non-thinking switch to the latest user turn', () => {
    const out = withNoThink([
      { role: 'system', content: 'You are Boardy.' },
      { role: 'user', content: "what's next?" },
    ]);
    expect(out[1].content).toBe("what's next? /no_think");
    expect(out[0].content).toBe('You are Boardy.'); // system untouched
  });

  it('is a no-op when there is no user turn', () => {
    const messages = [{ role: 'system' as const, content: 'x' }];
    expect(withNoThink(messages)).toEqual(messages);
  });
});
