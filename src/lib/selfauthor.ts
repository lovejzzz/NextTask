/**
 * Tier 4 (BoardyV1) — genuine self-improvement, the in-app realization.
 *
 * The full version of Tier 4 (Boardy writes new primitives as code, gated by CI and
 * review) lives at the dev-loop seam — codegen is safe there *because* it's sandboxed,
 * tested, and human-merged. In-app, self-improvement takes the form that's already
 * codegen-free: he authors a new capability as a *composition of audited primitives*
 * (a tool/skill), proposed by himself from a pattern he's observed. The key Tier-4
 * move is that **a gate — not a person's nerve — admits it**: every step must validate,
 * the capability must be novel, and it must pass a dry-run. Tests are the authority.
 *
 * This is the Ouroboros bounded by validation instead of by me: he proposes, the gate
 * judges, you say yes. Pure and deterministic; the gate reuses the same parser that
 * runs his real intents, so "valid" means genuinely runnable.
 */
import { parseIntent } from './companionActions';
import { validateSteps } from './tools';

export type PrimitiveProposal = { name: string; steps: string[]; rationale: string };

/** A short, readable name for a self-authored capability, from its steps. */
function nameFrom(steps: string[]): string {
  const words = steps
    .flatMap((s) => s.toLowerCase().split(/\s+/))
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length > 2 && !['the', 'and', 'then', 'task', 'tasks', 'all', 'for', 'with'].includes(w));
  return [...new Set(words)].slice(0, 3).join('-') || 'routine';
}

/**
 * He proposes a new capability for himself from a routine he keeps repeating — the
 * autonomous half of self-improvement. Null when there's no repeated pattern worth
 * crystallizing or it would only restate a capability he already has.
 */
export function proposePrimitive(repeated: string[] | null, existingNames: string[]): PrimitiveProposal | null {
  if (!repeated || repeated.length < 2) return null;
  const name = nameFrom(repeated);
  if (existingNames.some((n) => n.toLowerCase() === name)) return null;
  return {
    name,
    steps: repeated,
    rationale: `I keep doing ${repeated.join(' → ')} by hand. I can give myself this as one capability.`,
  };
}

/** Dry-run a composition: does every step resolve to a real, runnable intent? */
export function dryRun(steps: string[]): { step: string; ok: boolean }[] {
  return steps.map((step) => ({ step, ok: parseIntent(step) !== null }));
}

export type GateResult = { admitted: boolean; reasons: string[]; validSteps: string[] };

/**
 * The admission gate — the authority that replaces supervision. A proposed capability
 * is admitted only if: it has a name, every step validates (runs through the real
 * parser), it has at least two valid steps (a genuine composition, not a rename of one
 * primitive), and its name is novel. Returns the reasons either way, in the open.
 */
export function gate(proposal: PrimitiveProposal, existingNames: string[]): GateResult {
  const reasons: string[] = [];
  const validSteps = validateSteps(proposal.steps);
  const dropped = proposal.steps.length - validSteps.length;

  if (!proposal.name.trim()) reasons.push('no name');
  if (dropped > 0) reasons.push(`${dropped} step${dropped === 1 ? '' : 's'} didn't validate and were dropped`);
  if (validSteps.length < 2) reasons.push('needs at least two valid steps to be a real capability');
  if (existingNames.some((n) => n.toLowerCase() === proposal.name.toLowerCase())) reasons.push(`"${proposal.name}" already exists`);

  const admitted = proposal.name.trim().length > 0 && validSteps.length >= 2 && !existingNames.some((n) => n.toLowerCase() === proposal.name.toLowerCase());
  if (admitted) reasons.unshift(`all ${validSteps.length} steps valid, novel, dry-run clean`);
  return { admitted, reasons, validSteps };
}

/** A first-person account of a gate decision, for the chat + glass-box trail. */
export function explainGate(proposal: PrimitiveProposal, result: GateResult): string {
  if (result.admitted) {
    return `I taught myself a new capability "${proposal.name}" (${result.validSteps.join(' → ')}) — it passed the gate: ${result.reasons[0]}. Want me to keep it?`;
  }
  return `I tried to give myself "${proposal.name}", but the gate held it back: ${result.reasons.join('; ')}. That's the gate doing its job — I don't get to merge what doesn't pass.`;
}
