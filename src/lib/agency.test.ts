import { describe, expect, it } from 'vitest';

import { autonomyReason, decideAutonomy, describeAudit, markUndone, recordAudit, type AuditEntry } from './agency';

describe('graduated autonomy — autonomy scales with blast radius', () => {
  it('lets him act on a reversible, board-local capability', () => {
    expect(decideAutonomy({ reversibility: 'reversible', outwardFacing: false })).toBe('auto');
  });
  it('makes him ask first when irreversible or outward-facing', () => {
    expect(decideAutonomy({ reversibility: 'irreversible', outwardFacing: false })).toBe('confirm');
    expect(decideAutonomy({ reversibility: 'reversible', outwardFacing: true })).toBe('confirm');
  });
  it('explains the decision in the open', () => {
    expect(autonomyReason({ reversibility: 'reversible', outwardFacing: false })).toContain('you can undo');
    expect(autonomyReason({ reversibility: 'reversible', outwardFacing: true })).toContain('outside the board');
    expect(autonomyReason({ reversibility: 'irreversible', outwardFacing: false })).toContain("can't be undone");
  });
});

describe('audit log — every action in the open', () => {
  it('appends and renders newest-first, flagging undone actions', () => {
    let log: AuditEntry[] = [];
    log = recordAudit(log, { at: 1, capability: 'reminder', summary: 'Set a reminder to call the bank', autonomy: 'auto' });
    log = recordAudit(log, { at: 2, capability: 'reminder', summary: 'Set a reminder to pay rent', autonomy: 'auto' });
    log = markUndone(log, 1);
    expect(log).toHaveLength(2);
    const lines = describeAudit(log);
    expect(lines[0]).toBe('Set a reminder to pay rent');
    expect(lines[1]).toContain('(undone)');
  });
});
