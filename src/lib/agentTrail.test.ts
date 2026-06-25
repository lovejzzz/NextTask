import { describe, expect, it } from 'vitest';

import { formatTrailEntry, recordTrail, summarizeTrail, type TrailEntry } from './agentTrail';

const entry = (over: Partial<TrailEntry>): TrailEntry => ({ at: 1, phrase: 'do a thing', verdict: 'admitted', ...over });

describe('recordTrail', () => {
  it('appends without mutating the original', () => {
    const a: TrailEntry[] = [];
    const b = recordTrail(a, entry({ phrase: 'X' }));
    expect(a).toHaveLength(0);
    expect(b).toHaveLength(1);
  });

  it('caps the log at 50, keeping the most recent', () => {
    let log: TrailEntry[] = [];
    for (let i = 0; i < 60; i += 1) log = recordTrail(log, entry({ at: i, phrase: `e${i}` }));
    expect(log).toHaveLength(50);
    expect(log[0].phrase).toBe('e10');
    expect(log.at(-1)?.phrase).toBe('e59');
  });
});

describe('formatTrailEntry', () => {
  it('reads in the first person for each verdict', () => {
    expect(formatTrailEntry(entry({ verdict: 'admitted', phrase: 'complete "X"' }))).toMatch(/I proposed.*gate cleared.*complete "X"/);
    expect(formatTrailEntry(entry({ verdict: 'held', phrase: 'drop "Y"', detail: 'not on the board' }))).toMatch(/gate held it: drop "Y" — not on the board/);
    expect(formatTrailEntry(entry({ verdict: 'accepted', phrase: 'clear overdue' }))).toMatch(/you accepted: clear overdue/);
    expect(formatTrailEntry(entry({ verdict: 'dismissed', phrase: 'drop "Z"' }))).toMatch(/you dismissed: drop "Z"/);
  });
});

describe('summarizeTrail', () => {
  it('returns the most recent entries newest-first, within the limit', () => {
    const log = [entry({ at: 1, phrase: 'first' }), entry({ at: 2, phrase: 'second' }), entry({ at: 3, phrase: 'third' })];
    const out = summarizeTrail(log, 2);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('third');
    expect(out[1]).toContain('second');
  });
});
