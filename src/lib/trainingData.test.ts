import { describe, expect, it } from 'vitest';

import type { Learning } from './knowledge';
import type { Lesson } from './upbringing';
import {
  buildTrainingSet,
  decisionsToKto,
  exportFiles,
  knowledgeToSft,
  toJSONL,
  upbringingToSft,
  type Decision,
} from './trainingData';

const lessons: Lesson[] = [
  { id: 'honesty', principle: 'I tell the truth.', exemplar: { user: 'sure?', assistant: 'Honestly, no.' }, source: 's' },
  { id: 'no-ex', principle: 'I have no example.', source: 's' },
];
const learnings: Learning[] = [
  { id: 'wip', topic: 'WIP limits', insight: 'Cap work in progress.', source: { title: 't', url: 'https://x.test' }, learnedOn: '2026-06-23' },
];
const decisions: Decision[] = [
  { context: 'board: 3 overdue', completion: 'Let me clear your overdue tasks.', accepted: true, at: 1 },
  { context: 'board: calm', completion: "I'd like to file an upgrade.", accepted: false, at: 2 },
  { context: 'x', completion: '   ', accepted: true, at: 3 }, // blank → dropped
];

describe('SFT builders', () => {
  it('turns upbringing exemplars into system+user+assistant turns (skips example-less lessons)', () => {
    const sft = upbringingToSft(lessons);
    expect(sft).toHaveLength(1);
    expect(sft[0].messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant']);
    expect(sft[0].messages[0].content).toBe('I tell the truth.');
  });
  it('turns knowledge into a Q→insight turn', () => {
    const sft = knowledgeToSft(learnings);
    expect(sft[0].messages[0].content).toContain('WIP limits');
    expect(sft[0].messages[1].content).toBe('Cap work in progress.');
  });
});

describe('KTO from Desk decisions (unpaired accept/reject)', () => {
  it('labels accepted desirable and dismissed undesirable, dropping blanks', () => {
    const kto = decisionsToKto(decisions);
    expect(kto).toHaveLength(2);
    expect(kto[0]).toEqual({ prompt: 'board: 3 overdue', completion: 'Let me clear your overdue tasks.', label: true });
    expect(kto[1].label).toBe(false);
  });
});

describe('buildTrainingSet', () => {
  it('assembles all sources and reports an honest size summary', () => {
    const set = buildTrainingSet({ lessons, learnings, decisions });
    expect(set.sft).toHaveLength(2); // 1 upbringing + 1 knowledge
    expect(set.kto).toHaveLength(2);
    expect(set.summary).toContain('1 kept, 1 dismissed');
    expect(set.summary).toContain('grows as he lives'); // honest about being thin
  });
  it('exports two JSONL files with one object per line', () => {
    const files = exportFiles(buildTrainingSet({ lessons, learnings, decisions }));
    expect(files.map((f) => f.name)).toEqual(['boardy-sft.jsonl', 'boardy-kto.jsonl']);
    expect(files[0].content.split('\n')).toHaveLength(2);
    expect(() => JSON.parse(files[0].content.split('\n')[0])).not.toThrow();
  });
});

describe('toJSONL', () => {
  it('is one compact JSON object per line', () => {
    expect(toJSONL([{ a: 1 }, { b: 2 }])).toBe('{"a":1}\n{"b":2}');
  });
});
