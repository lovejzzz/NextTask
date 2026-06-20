import { describe, expect, it } from 'vitest';

import { addNote, formatNotes, parseRememberable, type CompanionNote } from './companionNotes';

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

describe('formatNotes', () => {
  it('joins notes for the prompt and is empty when there are none', () => {
    expect(formatNotes([])).toBe('');
    expect(formatNotes([{ text: 'A', at: 1 }, { text: 'B', at: 2 }])).toBe('A; B');
  });
});
