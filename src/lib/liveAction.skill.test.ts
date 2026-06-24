import { describe, expect, it } from 'vitest';

import { SKILL_TOOL, readSkill } from './liveAction';
import { gate, explainGate } from './selfauthor';

/**
 * The brain improving the brain: a self-authored skill (proposed via the propose_skill
 * tool) is run through the EXISTING self-author gate — the same authority that admits
 * skills learned from repeated user commands. No special treatment: it earns its place
 * only if every step validates through the real parser and it's a genuine novel composition.
 */
describe('propose_skill tool', () => {
  it('parses a well-formed skill proposal', () => {
    const skill = readSkill({ name: 'Monday Reset', steps: ['plan my day', "what's overdue"], rationale: 'I do this every monday' });
    expect(skill).toEqual({ name: 'Monday Reset', steps: ['plan my day', "what's overdue"], rationale: 'I do this every monday' });
  });
  it('rejects an empty proposal', () => {
    expect(readSkill({ name: '', steps: [] })).toBeNull();
    expect(readSkill({ name: 'x', steps: 'not an array' })).toBeNull();
  });
  it('offers a steps array in its schema', () => {
    expect(SKILL_TOOL.function.parameters.properties.steps.type).toBe('array');
  });
});

describe('a brain-authored skill faces the real gate', () => {
  it('admits a genuine composition whose every step the parser understands', () => {
    const skill = readSkill({
      name: 'Monday Reset',
      steps: ['plan my day', "what's overdue", 'what should I drop', "what's my biggest risk"],
    })!;
    const result = gate(skill, []);
    expect(result.admitted).toBe(true);
    expect(result.validSteps).toHaveLength(4); // every step ran through the real parser
    expect(explainGate(skill, result)).toMatch(/taught myself a new capability "Monday Reset"/);
  });

  it('holds back a skill whose steps the parser cannot run', () => {
    const skill = readSkill({ name: 'Vibes', steps: ['meditate quietly', 'summon some investors'] })!;
    const result = gate(skill, []);
    expect(result.admitted).toBe(false);
    expect(explainGate(skill, result)).toMatch(/the gate held it back/);
  });

  it('holds back a skill whose name already exists', () => {
    const skill = readSkill({ name: 'Monday Reset', steps: ['plan my day', "what's overdue"] })!;
    expect(gate(skill, ['monday reset']).admitted).toBe(false);
  });
});
