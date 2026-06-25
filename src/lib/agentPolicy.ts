/**
 * Orchestration policy for the agentic path — pure, so the routing is testable without a
 * model. One brain is active at a time (a small in-browser model, or a capable remote one
 * riding the same slot), so the decision is: should we spend a generation asking THIS brain
 * for a structured tool call on THIS turn?
 *
 *   • No brain ready        → never; the deterministic voice handles everything.
 *   • Capable remote brain  → always offer tools (cheap relative to its quality).
 *   • Small local model     → only when the message looks like it wants an action, to avoid
 *                             wasting a slow local generation (and to cut spurious proposals)
 *                             on chit-chat.
 *
 * Whatever the choice, the gate is still the real authority and every downstream failure
 * degrades to plain talk — this only decides whether it's worth *trying*.
 */
export type ToolBrainChoice = { attempt: boolean; reason: string };

// Verbs/phrasings that suggest the user wants something *done* to the board. Recall-biased:
// a false positive only costs one generation (the gate catches ungrounded calls); a false
// negative just means no proposal, and the deterministic/prose paths still answer.
const ACTION_HINT =
  /\b(finish|finished|complete[d]?|done with|wrap up|close|knock out|cross off|mark|drop|delete|remove|ditch|trash|reschedule|postpone|push (?:back|out|to)|defer|move|clear|cancel|tidy|clean up|sort out|deal with|take care of|handle)\b/i;

/** A cheap heuristic: does this message plausibly ask for a board action? Pure + tested. */
export function looksActionable(text: string): boolean {
  return ACTION_HINT.test(text);
}

/** Decide whether to attempt a structured tool-call proposal for this turn. */
export function chooseToolBrain(signals: { brainReady: boolean; isRemote: boolean; actionable: boolean }): ToolBrainChoice {
  if (!signals.brainReady) return { attempt: false, reason: 'no brain ready — deterministic voice only' };
  if (signals.isRemote) return { attempt: true, reason: 'capable remote brain — always offer tools' };
  if (signals.actionable) return { attempt: true, reason: 'local model + the message looks actionable' };
  return { attempt: false, reason: 'local model + chit-chat — just talk, skip the tool attempt' };
}
