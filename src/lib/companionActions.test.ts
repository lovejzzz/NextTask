import { describe, expect, it } from 'vitest';

import { parseIntent } from './companionActions';

const NOW = new Date(2026, 5, 20, 9); // Sat Jun 20 2026

describe('parseIntent — create task', () => {
  it('creates from a bare "add" command', () => {
    expect(parseIntent('add buy groceries', NOW)).toEqual({
      kind: 'create_task',
      title: 'Buy groceries',
      priority: 'normal',
      due_date: null,
    });
  });

  it('handles "add a task to ..." phrasing', () => {
    const intent = parseIntent('add a task to email the designer', NOW);
    expect(intent).toMatchObject({ kind: 'create_task', title: 'Email the designer' });
  });

  it('extracts high priority and strips the phrase from the title', () => {
    const intent = parseIntent('create urgent task fix the login bug', NOW);
    expect(intent).toMatchObject({ kind: 'create_task', priority: 'high' });
    expect((intent as { title: string }).title.toLowerCase()).not.toContain('urgent');
    expect((intent as { title: string }).title).toContain('Fix the login bug');
  });

  it('parses "today" and "tomorrow" due dates', () => {
    expect(parseIntent('add ship the build today', NOW)).toMatchObject({ due_date: '2026-06-20', title: 'Ship the build' });
    expect(parseIntent('remind me to call mom tomorrow', NOW)).toMatchObject({ due_date: '2026-06-21', title: 'Call mom' });
  });

  it('parses a weekday due date into the upcoming occurrence', () => {
    const intent = parseIntent('add prep the deck by friday', NOW) as { due_date: string; title: string };
    expect(new Date(`${intent.due_date}T00:00:00`).getDay()).toBe(5); // Friday
    expect(intent.due_date > '2026-06-20').toBe(true);
    expect(intent.title).toBe('Prep the deck');
  });

  it('supports the "task:" shorthand', () => {
    expect(parseIntent('task: write the changelog', NOW)).toMatchObject({ title: 'Write the changelog' });
  });

  it('returns null when there is no title left', () => {
    expect(parseIntent('add a task', NOW)).toBeNull();
  });
});

describe('parseIntent — questions', () => {
  it('recognizes "what\'s next"', () => {
    expect(parseIntent("what's next?", NOW)).toEqual({ kind: 'whats_next' });
    expect(parseIntent('next', NOW)).toEqual({ kind: 'whats_next' });
  });

  it('recognizes overdue and status questions', () => {
    expect(parseIntent('what is overdue?', NOW)).toEqual({ kind: 'overdue' });
    expect(parseIntent('how am I doing', NOW)).toEqual({ kind: 'status' });
  });
});

describe('parseIntent — passthrough', () => {
  it('returns null for open conversation', () => {
    expect(parseIntent('you are mean to me', NOW)).toBeNull();
    expect(parseIntent('lol', NOW)).toBeNull();
  });
});
