import { describe, expect, it } from 'vitest';

import { boardEvent, type BoardEvent } from './history';
import { reflect } from './reflect';

const DAY = 86_400_000;
// A fixed Tuesday noon, so day-of-week assertions are stable.
const NOW = new Date('2026-06-16T12:00:00').getTime();

function ev(kind: BoardEvent['kind'], id: string, detail: string | undefined, daysAgo: number): BoardEvent {
  return boardEvent(kind, { id, title: id }, detail, NOW - daysAgo * DAY);
}

describe('reflect — grounded patterns, or honest silence', () => {
  it('says nothing when history is too thin to read', () => {
    expect(reflect([ev('created', 't1', undefined, 1)], 30, NOW)).toEqual([]);
  });

  it('notices work that keeps slipping (reschedule-prone), with its evidence', () => {
    const events = [
      ev('rescheduled', 'Launch', 'to 2026-06-01', 9),
      ev('rescheduled', 'Launch', 'to 2026-06-08', 6),
      ev('rescheduled', 'Launch', 'to 2026-06-15', 3),
    ];
    const [r] = reflect(events, 30, NOW);
    expect(r.kind).toBe('reschedule_prone');
    expect(r.observation).toContain('"Launch"');
    expect(r.evidence).toBe('rescheduled 3 times');
  });

  it('does not flag a single reschedule as a pattern', () => {
    const events = [ev('rescheduled', 'Launch', 'to 2026-06-15', 2), ev('rescheduled', 'Other', 'to 2026-06-15', 2)];
    expect(reflect(events, 30, NOW).some((r) => r.kind === 'reschedule_prone')).toBe(false);
  });

  it('finds the stage where work piles up (not the to-do inbox)', () => {
    const events = [
      ev('created', 'a', undefined, 8),
      ev('created', 'b', undefined, 8),
      ev('moved', 'a', 'todo → in_review', 5),
      ev('moved', 'b', 'todo → in_review', 4),
    ];
    const r = reflect(events, 30, NOW).find((x) => x.kind === 'bottleneck_stage');
    expect(r?.observation).toContain('in review');
    expect(r?.evidence).toContain('2 tasks');
  });

  it('clears a stage once the task reaches done (no false bottleneck)', () => {
    const events = [
      ev('created', 'a', undefined, 8),
      ev('moved', 'a', 'todo → in_review', 5),
      ev('completed', 'a', 'in_review → done', 4),
      ev('created', 'b', undefined, 8),
      ev('moved', 'b', 'todo → in_review', 5),
    ];
    // Only 'b' is parked in review now → below the min-stuck bar of 2.
    expect(reflect(events, 30, NOW).some((r) => r.kind === 'bottleneck_stage')).toBe(false);
  });

  it('reads the shipping rhythm — the day the most work clears', () => {
    // 5 ships, four of them on Mondays (1 day before the Tuesday NOW, and weeks back).
    const events = [
      ev('completed', 'm1', 'x → done', 1),
      ev('completed', 'm2', 'x → done', 8),
      ev('completed', 'm3', 'x → done', 15),
      ev('completed', 'm4', 'x → done', 22),
      ev('completed', 'o1', 'x → done', 4),
    ];
    const r = reflect(events, 40, NOW).find((x) => x.kind === 'ship_tempo');
    expect(r?.observation).toContain('Monday');
    expect(r?.evidence).toContain('4 of 5');
  });

  it('notes follow-through only when more is dropped than shipped', () => {
    const events = [
      ev('dropped', 'd1', undefined, 5),
      ev('dropped', 'd2', undefined, 4),
      ev('dropped', 'd3', undefined, 3),
      ev('completed', 'c1', 'x → done', 2),
    ];
    const r = reflect(events, 30, NOW).find((x) => x.kind === 'follow_through');
    expect(r?.evidence).toBe('3 dropped vs 1 shipped');
  });

  it('caps reflections for restraint and orders by signal strength', () => {
    const events = [
      ev('rescheduled', 'Launch', 'a', 9),
      ev('rescheduled', 'Launch', 'b', 6),
      ev('rescheduled', 'Launch', 'c', 3),
      ev('rescheduled', 'Launch', 'd', 2),
      ev('created', 'a', undefined, 8),
      ev('created', 'b', undefined, 8),
      ev('moved', 'a', 'todo → in_review', 5),
      ev('moved', 'b', 'todo → in_review', 4),
    ];
    const out = reflect(events, 30, NOW, 1);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('reschedule_prone'); // weight 4 > bottleneck weight 2
  });
});
