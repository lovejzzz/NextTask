import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { addNote, findStaleFocus, formatNotes, parseRememberable, recallFact, type CompanionNote } from './companionNotes';

describe('parseRememberable', () => {
  it('captures explicit remember/note statements', () => {
    expect(parseRememberable('remember that the launch is friday')).toBe('The launch is friday');
    expect(parseRememberable('note the client hates blue')).toBe('The client hates blue');
    expect(parseRememberable('fyi I work best in the morning')).toBe('I work best in the morning');
  });

  it('captures focus/goal statements with context', () => {
    expect(parseRememberable("I'm focusing on the redesign")).toBe('Focusing on the redesign');
    expect(parseRememberable('my goal is ship v2')).toBe('Goal: Ship v2');
  });

  it('does not treat "remember to <do>" as a note (that is a task)', () => {
    expect(parseRememberable('remember to call mom')).toBeNull();
  });

  it('returns null for ordinary chatter', () => {
    expect(parseRememberable('you are funny')).toBeNull();
  });
});

describe('addNote', () => {
  it('appends and de-duplicates case-insensitively', () => {
    let notes: CompanionNote[] = [];
    notes = addNote(notes, 'Ship v2', 1);
    notes = addNote(notes, 'ship V2', 2); // dupe
    expect(notes).toHaveLength(1);
    expect(notes[0].at).toBe(2);
  });

  it('keeps only the most recent few', () => {
    let notes: CompanionNote[] = [];
    for (let i = 0; i < 12; i++) notes = addNote(notes, `fact ${i}`, i);
    expect(notes.length).toBeLessThanOrEqual(8);
    expect(notes.at(-1)?.text).toBe('fact 11');
  });
});

describe('recallFact', () => {
  const notes: CompanionNote[] = [
    { text: 'Deadline: Friday', at: 1 },
    { text: 'Focusing on the redesign', at: 2 },
    { text: 'Goal: Ship v2', at: 3 },
  ];

  it('answers a targeted question from stored facts', () => {
    expect(recallFact(notes, 'deadline')).toBe('Deadline: Friday');
    expect(recallFact(notes, 'focus')).toBe('Focusing on the redesign');
    expect(recallFact(notes, 'goal')).toBe('Goal: Ship v2');
  });

  it('returns null when he was never told (so the caller can admit it)', () => {
    expect(recallFact(notes, 'priority')).toBeNull();
    expect(recallFact([], 'deadline')).toBeNull();
  });

  it('prefers the most recent fact on a topic', () => {
    const updated: CompanionNote[] = [
      { text: 'Deadline: Friday', at: 1 },
      { text: 'Deadline: Monday', at: 2 },
    ];
    expect(recallFact(updated, 'deadline')).toBe('Deadline: Monday');
  });
});

describe('formatNotes', () => {
  it('joins notes for the prompt and is empty when there are none', () => {
    expect(formatNotes([])).toBe('');
    expect(formatNotes([{ text: 'A', at: 1 }, { text: 'B', at: 2 }])).toBe('A; B');
  });
});

describe('findStaleFocus (reconcile memory against the board)', () => {
  const focus: CompanionNote = { text: 'Focusing on the redesign', at: 1 };

  it('flags a focus note whose task has shipped', () => {
    const tasks = [makeTask({ title: 'Redesign the dashboard', status: 'done' })];
    const stale = findStaleFocus([focus], tasks);
    expect(stale).toHaveLength(1);
    expect(stale[0].subject).toMatch(/redesign/i);
  });

  it('does not flag it while the work is still active', () => {
    const tasks = [makeTask({ title: 'Redesign the dashboard', status: 'in_progress' })];
    expect(findStaleFocus([focus], tasks)).toEqual([]);
  });

  it('ignores notes that are not a focus, and focuses with no matching task', () => {
    expect(findStaleFocus([{ text: 'Deadline: Friday', at: 1 }], [makeTask({ status: 'done' })])).toEqual([]);
    expect(findStaleFocus([focus], [makeTask({ title: 'Unrelated thing', status: 'done' })])).toEqual([]);
  });
});
