import { describe, expect, it } from 'vitest';

import { dueLabel, dueTone, formatDateInput } from './dates';

// Build YYYY-MM-DD from LOCAL calendar components so fixtures align with how
// dueTone/dueLabel interpret dates (local midnight), independent of timezone.
function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const today = localDate(0);
const yesterday = localDate(-1);
const tomorrow = localDate(1);
const inTwoDays = localDate(2);
const nextMonth = localDate(40);

describe('formatDateInput', () => {
  it('formats a date using local calendar components', () => {
    expect(formatDateInput(new Date())).toBe(today);
  });
});

describe('dueTone', () => {
  it('is "none" with no due date', () => {
    expect(dueTone({ due_date: null, status: 'todo' })).toBe('none');
  });

  it('is "complete" for done tasks regardless of date', () => {
    expect(dueTone({ due_date: yesterday, status: 'done' })).toBe('complete');
  });

  it('is "overdue" when past and not done', () => {
    expect(dueTone({ due_date: yesterday, status: 'todo' })).toBe('overdue');
  });

  it('is "soon" within the next three days', () => {
    expect(dueTone({ due_date: inTwoDays, status: 'todo' })).toBe('soon');
  });

  it('is "future" when comfortably ahead', () => {
    expect(dueTone({ due_date: nextMonth, status: 'todo' })).toBe('future');
  });
});

describe('dueLabel', () => {
  it('shows "No date" when unset', () => {
    expect(dueLabel({ due_date: null, status: 'todo' })).toBe('No date');
  });

  it('shows "Overdue" for past, non-done tasks', () => {
    expect(dueLabel({ due_date: yesterday, status: 'todo' })).toBe('Overdue');
  });

  it('shows relative "Today" / "Tomorrow"', () => {
    expect(dueLabel({ due_date: today, status: 'todo' })).toBe('Today');
    expect(dueLabel({ due_date: tomorrow, status: 'todo' })).toBe('Tomorrow');
  });

  it('formats distant dates as "MMM d"', () => {
    expect(dueLabel({ due_date: nextMonth, status: 'todo' })).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});
