import { describe, expect, it } from 'vitest';

import { addDateOnlyDays, classifyDueDate, getRequestToday, isDateOnly } from './dateOnly.js';

describe('date-only API semantics', () => {
  it('uses a valid browser-local calendar date even when the server is on another UTC day', () => {
    const req = { headers: { 'x-nexttask-today': '2026-08-17' } };
    expect(getRequestToday(req, new Date('2026-08-18T02:00:00.000Z'))).toBe('2026-08-17');
  });

  it('falls back to the UTC server date for missing or invalid client context', () => {
    expect(getRequestToday({ headers: {} }, new Date('2026-08-18T02:00:00.000Z'))).toBe('2026-08-18');
    expect(
      getRequestToday({ headers: { 'x-nexttask-today': '2026-02-29' } }, new Date('2026-08-18T02:00:00.000Z')),
    ).toBe('2026-08-18');
  });

  it('handles leap years, month boundaries, and due buckets without timezone conversion', () => {
    expect(isDateOnly('2028-02-29')).toBe(true);
    expect(isDateOnly('2026-02-29')).toBe(false);
    expect(addDateOnlyDays('2028-02-28', 2)).toBe('2028-03-01');
    expect(classifyDueDate('2026-08-16', 'todo', '2026-08-17')).toBe('overdue');
    expect(classifyDueDate('2026-08-17', 'todo', '2026-08-17')).toBe('soon');
    expect(classifyDueDate('2026-08-20', 'todo', '2026-08-17')).toBe('soon');
    expect(classifyDueDate('2026-08-21', 'todo', '2026-08-17')).toBe('future');
    expect(classifyDueDate('2026-08-16', 'done', '2026-08-17')).toBe('complete');
  });
});
