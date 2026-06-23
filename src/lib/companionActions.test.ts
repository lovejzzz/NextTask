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
    expect(parseIntent('add call mom tomorrow', NOW)).toMatchObject({ due_date: '2026-06-21', title: 'Call mom' });
    // "remind me to …" is now the Tier 3 reminder capability, not a silent task.
    expect(parseIntent('remind me to call mom tomorrow', NOW)).toMatchObject({ kind: 'remind' });
  });

  it('parses a weekday due date into the upcoming occurrence', () => {
    const intent = parseIntent('add prep the deck by friday', NOW) as { due_date: string; title: string };
    expect(new Date(`${intent.due_date}T00:00:00`).getDay()).toBe(5); // Friday
    expect(intent.due_date > '2026-06-20').toBe(true);
    expect(intent.title).toBe('Prep the deck');
  });

  it('strips a lingering "task to" so the title is clean, not "To call the bank"', () => {
    const intent = parseIntent('add a high priority task to call the bank friday', NOW);
    expect(intent).toMatchObject({ kind: 'create_task', title: 'Call the bank', priority: 'high' });
    expect((intent as { due_date: string }).due_date > '2026-06-20').toBe(true);
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

  it('recognizes a whole-board gestalt question, distinct from status', () => {
    expect(parseIntent("how's my board looking?", NOW)).toEqual({ kind: 'board_shape' });
    expect(parseIntent('how does the board look', NOW)).toEqual({ kind: 'board_shape' });
    expect(parseIntent('read the room', NOW)).toEqual({ kind: 'board_shape' });
    expect(parseIntent('give me the big picture', NOW)).toEqual({ kind: 'board_shape' });
    expect(parseIntent('how am I doing', NOW)).toEqual({ kind: 'status' }); // still status
  });

  it('recognizes a request for an honest self-description, distinct from neighbors', () => {
    expect(parseIntent('what can you do?', NOW)).toEqual({ kind: 'self_describe' });
    expect(parseIntent('what are you?', NOW)).toEqual({ kind: 'self_describe' });
    expect(parseIntent('who are you', NOW)).toEqual({ kind: 'self_describe' });
    expect(parseIntent('what are your limits', NOW)).toEqual({ kind: 'self_describe' });
    // must NOT steal these neighbors
    expect(parseIntent('what are you working on for yourself', NOW)).toEqual({ kind: 'ouroboros_backlog' });
    expect(parseIntent('what do you want to do', NOW)).toEqual({ kind: 'self_intent' });
  });

  it('recognizes the Tier 3 reminder capability and its listing', () => {
    expect(parseIntent('remind me to call the bank in 30 minutes', NOW)).toEqual({
      kind: 'remind',
      text: 'remind me to call the bank in 30 minutes',
    });
    expect(parseIntent('what are my reminders', NOW)).toEqual({ kind: 'list_reminders' });
    // a normal task question is not a reminder
    expect(parseIntent("what's next", NOW)).toEqual({ kind: 'whats_next' });
  });

  it('recognizes the Tier 4 self-improvement request', () => {
    expect(parseIntent('improve yourself', NOW)).toEqual({ kind: 'self_improve' });
    expect(parseIntent('write yourself a tool', NOW)).toEqual({ kind: 'self_improve' });
    // distinct from describing himself or recounting growth
    expect(parseIntent('what are you?', NOW)).toEqual({ kind: 'self_describe' });
  });

  it('recognizes a request for taught knowledge, distinct from self-growth', () => {
    expect(parseIntent('what do you know about WIP limits?', NOW)).toEqual({ kind: 'knowledge', topic: 'wip limits' });
    expect(parseIntent('what have you learned about kanban', NOW)).toEqual({ kind: 'knowledge', topic: 'kanban' });
    // "what have you learned" with no topic is about his own growth, not taught knowledge
    expect(parseIntent('what have you learned', NOW)).toEqual({ kind: 'self_growth' });
    // "about me" stays his memory of you, not taught knowledge
    expect(parseIntent('what do you know about me', NOW)).toEqual({ kind: 'recall' });
  });

  it('recognizes a request to reflect on patterns, distinct from the board read', () => {
    expect(parseIntent('what have you noticed?', NOW)).toEqual({ kind: 'reflect' });
    expect(parseIntent('notice any patterns', NOW)).toEqual({ kind: 'reflect' });
    expect(parseIntent('what do you notice about how i work', NOW)).toEqual({ kind: 'reflect' });
    // must NOT steal the current-state board read
    expect(parseIntent("how's my board", NOW)).toEqual({ kind: 'board_shape' });
  });

  it('recognizes a request to recount his growth, distinct from self-description', () => {
    expect(parseIntent('how have you grown?', NOW)).toEqual({ kind: 'self_growth' });
    expect(parseIntent('what have you learned', NOW)).toEqual({ kind: 'self_growth' });
    expect(parseIntent('how have you changed', NOW)).toEqual({ kind: 'self_growth' });
    expect(parseIntent('are you getting better', NOW)).toEqual({ kind: 'self_growth' });
    // must NOT steal the plain self-description
    expect(parseIntent('what are you?', NOW)).toEqual({ kind: 'self_describe' });
  });

  it('recognizes a request to consult his own wants', () => {
    expect(parseIntent('what do you want to do?', NOW)).toEqual({ kind: 'self_intent' });
    expect(parseIntent("what's on your mind", NOW)).toEqual({ kind: 'self_intent' });
    expect(parseIntent('what would you do', NOW)).toEqual({ kind: 'self_intent' });
    // still distinct from recalling stored memory
    expect(parseIntent('what do you remember', NOW)).toEqual({ kind: 'recall' });
  });

  it('recognizes an episodic recap request', () => {
    expect(parseIntent('what happened today?', NOW)).toEqual({ kind: 'recap' });
    expect(parseIntent('what have I been up to', NOW)).toEqual({ kind: 'recap' });
    expect(parseIntent('catch me up', NOW)).toEqual({ kind: 'recap' });
    expect(parseIntent('what did I get done', NOW)).toEqual({ kind: 'recap' });
  });

  it('recognizes targeted recall of a single remembered fact', () => {
    expect(parseIntent("what's my deadline?", NOW)).toEqual({ kind: 'recall_fact', topic: 'deadline' });
    expect(parseIntent('when is my deadline', NOW)).toEqual({ kind: 'recall_fact', topic: 'deadline' });
    expect(parseIntent('what is my goal', NOW)).toEqual({ kind: 'recall_fact', topic: 'goal' });
    expect(parseIntent('what are my priorities', NOW)).toEqual({ kind: 'recall_fact', topic: 'priority' });
    expect(parseIntent('what am I focusing on', NOW)).toEqual({ kind: 'recall_fact', topic: 'focus' });
  });
});

describe('parseIntent — robustness (synonyms, pleasantries, dates)', () => {
  it('strips leading pleasantries before parsing', () => {
    expect(parseIntent('can you add a task to book flights', NOW)).toMatchObject({ kind: 'create_task', title: 'Book flights' });
    expect(parseIntent('hey, finish the onboarding flow', NOW)).toMatchObject({ kind: 'complete_task' });
  });

  it('understands past-tense completion ("I finished X")', () => {
    expect(parseIntent('i finished the report', NOW)).toEqual({ kind: 'complete_task', query: 'the report' });
    expect(parseIntent('completed the login bug', NOW)).toEqual({ kind: 'complete_task', query: 'the login bug' });
    expect(parseIntent('i just finished onboarding', NOW)).toEqual({ kind: 'complete_task', query: 'onboarding' });
    // still not confused with intent to create ("i need to finish X")
    expect(parseIntent('i need to finish the report', NOW)).toMatchObject({ kind: 'create_task' });
  });

  it('understands casual create verbs', () => {
    expect(parseIntent('i need to renew the domain', NOW)).toMatchObject({ kind: 'create_task', title: 'Renew the domain' });
    expect(parseIntent('gotta water the plants', NOW)).toMatchObject({ kind: 'create_task', title: 'Water the plants' });
    expect(parseIntent('put call the bank on the board', NOW)).toMatchObject({ kind: 'create_task', title: 'Call the bank' });
  });

  it('maps critical/important to high priority', () => {
    expect(parseIntent('the billing fix is critical', NOW)).toMatchObject({ kind: 'set_priority', priority: 'high' });
    expect(parseIntent('bump the audit to high', NOW)).toMatchObject({ kind: 'set_priority', priority: 'high' });
  });

  it('parses "next week" and "in N days" due dates', () => {
    expect(parseIntent('push the launch to next week', NOW)).toMatchObject({ kind: 'reschedule', due_date: '2026-06-27' });
    expect(parseIntent('move the sync to in 3 days', NOW)).toMatchObject({ kind: 'reschedule', due_date: '2026-06-23' });
  });
});

describe('parseIntent — passthrough', () => {
  it('returns null for open conversation', () => {
    expect(parseIntent('you are mean to me', NOW)).toBeNull();
    expect(parseIntent('lol', NOW)).toBeNull();
  });
});
