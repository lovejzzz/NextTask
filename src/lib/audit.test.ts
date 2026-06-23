import { describe, expect, it } from 'vitest';

import { runSelfAudit, summarizeAudit } from './audit';

/**
 * The automated audit. This single test is the CI gate that keeps the audit alive: if
 * any invariant Boardy is supposed to hold ever regresses, this fails — naming the
 * exact property that broke, so the regression is caught at the source, not in use.
 */
describe('Boardy self-audit (automated invariants)', () => {
  const report = runSelfAudit();

  it('passes every invariant', () => {
    // Per-check assertions so a failure names the broken property, not just a count.
    for (const check of report.checks) {
      expect(check.pass, `${check.name} — ${check.detail}`).toBe(true);
    }
    expect(report.ok).toBe(true);
  });

  it('covers the classes of bug the manual audit found', () => {
    const names = report.checks.map((c) => c.name).join(' | ');
    expect(names).toMatch(/intent routing/);
    expect(names).toMatch(/reminder time/);
    expect(names).toMatch(/quarantine/);
    expect(names).toMatch(/prompt stays under budget/);
    expect(report.total).toBeGreaterThanOrEqual(7);
  });

  it('summarizes cleanly when healthy', () => {
    expect(summarizeAudit(report)).toContain('Self-audit clean');
  });
});
