/**
 * Tier 3 (BoardyV1) — real agency. The framework that lets Boardy *act*, not just ask.
 *
 * He has always sensed what he can't do and filed a request (the growth model). Agency
 * is the seam where a request becomes an action — bounded by the invariant that has held
 * all along: autonomy scales with blast radius. A capability declares how reversible it
 * is and whether it reaches outside the board; from that, the policy decides whether he
 * may act on his own (with an undo + an audit entry) or must ask first.
 *
 * In-app capabilities (reminders) are wired now; external ones (calendar, mail, repos)
 * plug into the same Capability interface with their scope provisioned by the user
 * (OAuth) — the framework is identical, only the handler and the consent escalate. Pure
 * and deterministic here; the act itself lives in the handler. Untrusted input that any
 * capability touches must pass through quarantine.ts first.
 */

/** Can the action be cleanly undone, and does it reach outside the board? */
export type Reversibility = 'reversible' | 'irreversible';

export type Capability<Args = unknown, Result = unknown> = {
  name: string;
  scope: string; // human-readable: what it can touch
  reversibility: Reversibility;
  outwardFacing: boolean; // does it have an effect beyond this board?
  run: (args: Args) => CapabilityOutcome<Result> | Promise<CapabilityOutcome<Result>>;
};

export type CapabilityOutcome<Result = unknown> = {
  ok: boolean;
  summary: string; // first-person, what happened (or why not)
  result?: Result;
  undo?: () => void | Promise<void>; // present iff the effect can be reversed
};

/** Whether Boardy may act unprompted, or must get a yes first. */
export type Autonomy = 'auto' | 'confirm';

/**
 * Graduated autonomy — the generalization of the Desk's consent gate. A reversible,
 * board-local action earns autonomy (it still logs an audit entry and offers undo);
 * anything irreversible or outward-facing requires an explicit confirmation first.
 * This is how "propose, don't impose" scales from suggestions to actions.
 */
export function decideAutonomy(capability: Pick<Capability, 'reversibility' | 'outwardFacing'>): Autonomy {
  return capability.reversibility === 'reversible' && !capability.outwardFacing ? 'auto' : 'confirm';
}

/** A short, human-readable reason for the autonomy decision (for the glass-box log). */
export function autonomyReason(capability: Pick<Capability, 'reversibility' | 'outwardFacing'>): string {
  if (capability.outwardFacing) return 'reaches outside the board — I ask first';
  if (capability.reversibility === 'irreversible') return "can't be undone — I ask first";
  return 'reversible and board-local — I can do it, and you can undo it';
}

// ── The audit log: every action Boardy takes, in the open ──────────────────────

export type AuditEntry = {
  at: number;
  capability: string;
  summary: string;
  autonomy: Autonomy; // did he act on his own, or with a confirmation
  undone?: boolean;
};

const AUDIT_CAP = 200;

/** Append an action to the audit trail (append-only, capped). */
export function recordAudit(log: AuditEntry[], entry: AuditEntry): AuditEntry[] {
  return [...log, entry].slice(-AUDIT_CAP);
}

/** Mark the most recent matching action as undone (for the glass-box trail). */
export function markUndone(log: AuditEntry[], at: number): AuditEntry[] {
  return log.map((entry) => (entry.at === at ? { ...entry, undone: true } : entry));
}

/** Plain-text account of what he's done, newest first — for the Mind panel. */
export function describeAudit(log: AuditEntry[], limit = 8): string[] {
  return log
    .slice(-limit)
    .reverse()
    .map((e) => `${e.summary}${e.undone ? ' (undone)' : ''}`);
}
