/**
 * The "plan-next" stage of Boardy's self-improvement loop — pure, deterministic
 * round bookkeeping. See docs/design/self-improvement-loop-plan.md.
 *
 * SAFETY NOTE (load-bearing — read before changing this file): this module
 * decides WHETHER to keep offering another round. It NEVER decides to execute
 * anything, and it must never gain that power. Every round's plan still needs
 * its OWN fresh human Accept click — there is no "skip the click" branch here,
 * anywhere, for any reason.
 *
 * Three independently-designed, adversarially-verified candidates for this loop
 * were generated and reviewed before this was written. All three tried, in some
 * form, to let a "reversible + local" action skip consent on later rounds by
 * riding agency.ts's decideAutonomy/'auto' tier. The adversarial review found
 * that tier has NO actual connection to any board ActionKind in this codebase
 * today (it only governs reminders and self-authored skills) — so using it here
 * would not be "riding an existing rule", it would be INVENTING a new execution
 * bypass for board mutations, dressed up as reuse. This module deliberately does
 * not do that: it only ever produces a stop/continue signal and round bookkeeping
 * data. Turning "continue" into an executed action is still, 100%, the existing
 * agentReply → consent-card → accept() → executeProposed chain, untouched.
 *
 * Round history is held in memory for the current chat session only (a useRef in
 * App.tsx), not persisted — deliberate: a stop condition that resets each session
 * can't quietly calcify into "Boardy refuses to ever try again."
 */
import { pursuitGoalMet, type Pursuit, type PursuitReview } from './pursuit';
import type { OutcomeReview } from './reviewOutcome';

/** What happened in one round: a review when something executed, or null when
 *  the round's plan was dismissed or held by the gate — itself a real signal
 *  (a pursuit that keeps getting declined isn't improving, either). */
export type RoundResult = { review: OutcomeReview | null; pursuitAfter: PursuitReview | null };

export type LoopStopReason = 'goal_met' | 'no_improvement' | 'max_rounds' | null;

export const DEFAULT_MAX_ROUNDS = 5;
export const DRY_WINDOW = 3;

/**
 * Should Boardy offer another round, or has this chain run its course?
 * - goal_met: the active pursuit's metric reached its floor (order/self only).
 * - no_improvement: DRY_WINDOW consecutive rounds with no clean pass (loop-until-dry).
 * - max_rounds: a hard, unconditional cap — never bypassable by any verdict.
 * - null: keep going.
 * Pure; history is whatever the caller has accumulated this session.
 */
export function nextStopReason(
  history: RoundResult[],
  pursuit: Pursuit | null,
  maxRounds: number = DEFAULT_MAX_ROUNDS,
): LoopStopReason {
  if (history.length >= maxRounds) return 'max_rounds';
  const last = history.at(-1);
  if (pursuit && last?.pursuitAfter && pursuitGoalMet(pursuit, last.pursuitAfter)) return 'goal_met';
  const recent = history.slice(-DRY_WINDOW);
  if (recent.length === DRY_WINDOW && recent.every((r) => r.review?.verdict !== 'pass')) return 'no_improvement';
  return null;
}

/** A first-person line closing out the chain — honest, never apologetic for stopping. */
export function describeStop(reason: LoopStopReason): string {
  switch (reason) {
    case 'goal_met':
      return "That settles it — the goal's met. I'll stand down on this one.";
    case 'no_improvement':
      return "I've tried a few rounds and nothing's landing — I'll hold off rather than keep guessing. Ask me again if you want another pass.";
    case 'max_rounds':
      return "That's five rounds — I'll pause here regardless of how it's going. Ask me again whenever you want to keep at it.";
    default:
      return '';
  }
}
