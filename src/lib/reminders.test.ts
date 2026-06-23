import { describe, expect, it } from 'vitest';

import { describeReminders, dueReminders, parseReminder, type Reminder } from './reminders';

const NOW = new Date('2026-06-23T12:00:00').getTime();

describe('parseReminder', () => {
  it('parses an open-ended reminder', () => {
    expect(parseReminder('remind me to call the bank', NOW)).toEqual({ text: 'call the bank', dueAt: null });
  });
  it('parses relative times (minutes, hours, days)', () => {
    expect(parseReminder('remind me to stretch in 30 minutes', NOW)?.dueAt).toBe(NOW + 30 * 60_000);
    expect(parseReminder('remind me to call mom in 2 hours', NOW)?.dueAt).toBe(NOW + 2 * 3_600_000);
    expect(parseReminder('remind me to pay rent in 3 days', NOW)?.dueAt).toBe(NOW + 3 * 86_400_000);
  });
  it('strips the time phrase from the reminder text', () => {
    expect(parseReminder('remind me to submit the report in 1 hour', NOW)?.text).toBe('submit the report');
  });
  it('handles "tomorrow" as tomorrow morning', () => {
    const r = parseReminder('remind me to water the plants tomorrow', NOW);
    expect(r?.text).toBe('water the plants');
    expect(new Date(r!.dueAt!).getHours()).toBe(9);
  });
  it('parses an absolute "at" time and strips it from the text', () => {
    const r = parseReminder('remind me to call mom at 3pm', NOW);
    expect(r?.text).toBe('call mom');
    expect(new Date(r!.dueAt!).getHours()).toBe(15);
    const half = parseReminder('remind me to call mom at 3:30pm', NOW);
    expect(new Date(half!.dueAt!).getMinutes()).toBe(30);
  });
  it('parses a leading-position time (time before the task)', () => {
    const r = parseReminder('remind me in 30 minutes to stretch', NOW);
    expect(r?.text).toBe('stretch'); // no dangling "in 30 minutes" or "to"
    expect(r?.dueAt).toBe(NOW + 30 * 60_000);
  });
  it('parses "next week" and accepts the "set a reminder" phrasing', () => {
    expect(parseReminder('set a reminder to pay rent', NOW)?.text).toBe('pay rent');
    const nw = parseReminder('remind me to submit taxes next week', NOW);
    expect(nw?.text).toBe('submit taxes');
    expect(nw?.dueAt).toBeGreaterThan(NOW);
  });
  it('returns null for non-reminders, including "remind me <question>"', () => {
    expect(parseReminder("what's next", NOW)).toBeNull();
    expect(parseReminder('remind me to', NOW)).toBeNull();
    expect(parseReminder('remind me what is overdue', NOW)).toBeNull(); // a question, not a reminder
    expect(parseReminder('remind me when the launch is', NOW)).toBeNull();
  });
});

describe('dueReminders', () => {
  it('returns only past-due, unfired reminders', () => {
    const reminders: Reminder[] = [
      { id: '1', text: 'a', dueAt: NOW - 1000, createdAt: 0 },
      { id: '2', text: 'b', dueAt: NOW + 1000, createdAt: 0 },
      { id: '3', text: 'c', dueAt: NOW - 1000, createdAt: 0, firedAt: NOW },
      { id: '4', text: 'd', dueAt: null, createdAt: 0 },
    ];
    expect(dueReminders(reminders, NOW).map((r) => r.id)).toEqual(['1']);
  });
});

describe('describeReminders (glass-box)', () => {
  it('lists active reminders, skipping fired ones', () => {
    const reminders: Reminder[] = [
      { id: '1', text: 'call the bank', dueAt: null, createdAt: 0 },
      { id: '2', text: 'done thing', dueAt: NOW, createdAt: 0, firedAt: NOW },
    ];
    const lines = describeReminders(reminders);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('call the bank');
  });
});
