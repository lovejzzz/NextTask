import { describe, expect, it } from 'vitest';

import { dryRun, explainGate, gate, proposePrimitive } from './selfauthor';

describe('proposePrimitive — autonomous authoring from a repeated pattern', () => {
  it('proposes a named capability from a repeated routine', () => {
    const p = proposePrimitive(['clear overdue', 'plan my day'], []);
    expect(p?.steps).toEqual(['clear overdue', 'plan my day']);
    expect(p?.name.length).toBeGreaterThan(0);
  });
  it('declines without a pattern or when it would restate an existing capability', () => {
    expect(proposePrimitive(null, [])).toBeNull();
    expect(proposePrimitive(['clear overdue'], [])).toBeNull(); // single step
    const p = proposePrimitive(['clear overdue', 'plan my day'], []);
    expect(proposePrimitive(['clear overdue', 'plan my day'], [p!.name])).toBeNull(); // already exists
  });
});

describe('dryRun — every step must resolve to a runnable intent', () => {
  it('marks valid and invalid steps', () => {
    expect(dryRun(['clear overdue', 'frobnicate the widgets'])).toEqual([
      { step: 'clear overdue', ok: true },
      { step: 'frobnicate the widgets', ok: false },
    ]);
  });
});

describe('gate — the authority that replaces supervision', () => {
  it('admits a valid, novel, multi-step composition', () => {
    const result = gate({ name: 'morning', steps: ['clear overdue', 'plan my day'], rationale: 'x' }, []);
    expect(result.admitted).toBe(true);
    expect(result.reasons[0]).toContain('valid, novel, dry-run clean');
  });
  it('rejects when steps do not validate down to a real composition', () => {
    const result = gate({ name: 'nonsense', steps: ['frobnicate the widgets', 'sing a song'], rationale: 'x' }, []);
    expect(result.admitted).toBe(false);
    expect(result.reasons.join(' ')).toContain('two valid steps');
  });
  it('rejects a name collision', () => {
    const result = gate({ name: 'morning', steps: ['clear overdue', 'plan my day'], rationale: 'x' }, ['morning']);
    expect(result.admitted).toBe(false);
    expect(result.reasons.join(' ')).toContain('already exists');
  });
  it('explains its decision in the first person, owning the gate', () => {
    const admitted = gate({ name: 'morning', steps: ['clear overdue', 'plan my day'], rationale: 'x' }, []);
    expect(explainGate({ name: 'morning', steps: ['clear overdue', 'plan my day'], rationale: 'x' }, admitted)).toContain('passed the gate');
    const held = gate({ name: 'x', steps: ['sing a song'], rationale: 'x' }, []);
    expect(explainGate({ name: 'x', steps: ['sing a song'], rationale: 'x' }, held)).toContain('gate held it back');
  });
});
