import { describe, expect, it } from 'vitest';

import { boardEvent, recordEvent, type BoardEvent } from './history';

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
