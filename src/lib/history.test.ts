import { describe, expect, it } from 'vitest';

import { boardEvent, deriveEvents, recordEvent, type BoardEvent } from './history';

const t = (id: string, o: Partial<{ title: string; status: string; due_date: string | null; priority: string }> = {}) => ({
  id,
  title: o.title ?? id,
  status: o.status ?? 'todo',
  due_date: o.due_date ?? null,
  priority: o.priority ?? 'normal',
});

describe('board history log', () => {
  it('appends events in order', () => {
    let log: BoardEvent[] = [];
    log = recordEvent(log, boardEvent('created', { id: '1', title: 'A' }, undefined, 1000));
    log = recordEvent(log, boardEvent('completed', { id: '1', title: 'A' }, 'todo → done', 2000));
    expect(log.map((e) => e.kind)).toEqual(['created', 'completed']);
  });

  it('is idempotent — the same event is not double-recorded', () => {
    const event = boardEvent('completed', { id: '1', title: 'A' }, undefined, 1000);
    const once = recordEvent([], event);
    expect(recordEvent(once, event)).toHaveLength(1);
  });

  it('snapshots the title so history survives the task being deleted', () => {
    const event = boardEvent('dropped', { id: '9', title: 'Spike' }, undefined, 1000);
    expect(event.title).toBe('Spike');
  });
});

describe('deriveEvents (observe board transitions by diffing)', () => {
  it('records a created task', () => {
    const events = deriveEvents([], [t('1')], 1000);
    expect(events.map((e) => e.kind)).toEqual(['created']);
  });

  it('records a dropped task and keeps its title', () => {
    const [event] = deriveEvents([t('1', { title: 'Spike' })], [], 1000);
    expect(event.kind).toBe('dropped');
    expect(event.title).toBe('Spike');
  });

  it('distinguishes completed from an ordinary move', () => {
    expect(deriveEvents([t('1', { status: 'in_review' })], [t('1', { status: 'done' })], 1000)[0].kind).toBe('completed');
    expect(deriveEvents([t('1', { status: 'todo' })], [t('1', { status: 'in_progress' })], 1000)[0].kind).toBe('moved');
  });

  it('records reschedules and reprioritizations with detail', () => {
    const resched = deriveEvents([t('1')], [t('1', { due_date: '2026-06-26' })], 1000)[0];
    expect(resched.kind).toBe('rescheduled');
    expect(resched.detail).toContain('2026-06-26');
    const repri = deriveEvents([t('1', { priority: 'normal' })], [t('1', { priority: 'high' })], 1000)[0];
    expect(repri.kind).toBe('reprioritized');
    expect(repri.detail).toContain('high');
  });

  it('emits several events when one change touches multiple fields', () => {
    const kinds = deriveEvents([t('1', { status: 'todo' })], [t('1', { status: 'done', due_date: '2026-07-01' })], 1000).map(
      (e) => e.kind,
    );
    expect(kinds).toContain('completed');
    expect(kinds).toContain('rescheduled');
  });

  it('records nothing when nothing changed', () => {
    expect(deriveEvents([t('1', { status: 'todo' })], [t('1', { status: 'todo' })], 1000)).toEqual([]);
  });
});
