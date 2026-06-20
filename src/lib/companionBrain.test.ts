import { describe, expect, it } from 'vitest';

import {
  buildAmbientMessages,
  buildChatMessages,
  buildSystemPrompt,
  cleanLine,
  MODELS,
  modelLabel,
  nextModelId,
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

  it('trims history to the last 8 turns', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    const messages = buildChatMessages({ ...parts, history });
    expect(messages.length).toBe(1 + 8); // system + 8 turns
    expect(messages.at(-1)?.content).toBe('m19');
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
});

describe('cleanLine', () => {
  it('strips wrapping quotes and truncates very long output', () => {
    expect(cleanLine('"Ship something."')).toBe('Ship something.');
    expect(cleanLine('x'.repeat(300)).endsWith('…')).toBe(true);
  });
});
