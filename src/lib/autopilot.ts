/**
 * Board Autopilot — the companion's ability to plan work *for itself*.
 *
 * When invoked, the board files its own improvement tickets onto the very board
 * it lives on. Those tickets become the development backlog: a human (or the
 * coding agent) implements them, and the board sees its own upgrades land. This
 * is the AI side of that loop — a curated, rotating wishlist of genuine NextTask
 * improvements, kept deterministic so it's reliable and testable.
 */
import type { TaskPriority } from './types';

export const LOOP_NAME = 'Ouroboros';

export type AutopilotProposal = { title: string; description: string; priority: TaskPriority };

// Real upgrades the board would want, drawn from RUBRIC.md / LAB.md backlogs.
const IDEAS: AutopilotProposal[] = [
  {
    title: 'Add an LLM intent-fallback for phrasings the parser misses',
    description: 'When the rule-based parser returns no intent, ask the local model to classify it, graded against the eval corpus.',
    priority: 'high',
  },
  {
    title: 'Multi-turn, self-correcting reasoning for the companion',
    description: 'Let the board revise its plan across turns ("given X is blocked, replan") instead of one-shot answers.',
    priority: 'normal',
  },
  {
    title: 'Let the companion create labels on the fly',
    description: 'When asked to tag a task with a label that does not exist yet, offer to create it with a sensible color.',
    priority: 'normal',
  },
  {
    title: 'Surface the brain self-test score in the Insights panel',
    description: 'Run the objective conversation eval and show grounding/concision/character over time.',
    priority: 'normal',
  },
  {
    title: 'Cache the LLM weights across sessions for instant load',
    description: 'Persist the model in the browser cache so the brain wakes up immediately on repeat visits.',
    priority: 'normal',
  },
  {
    title: 'Add task age / staleness to the focus ranking',
    description: 'Nudge tasks that have sat untouched too long up the priority list and into proactive lines.',
    priority: 'normal',
  },
  {
    title: 'A Zen / focus mode that hides everything but the spotlight',
    description: 'One keystroke to strip the UI down to the single most important task.',
    priority: 'low',
  },
  {
    title: 'Add ship-velocity (7-day average) to Insights',
    description: 'Track how many tasks ship per day on a rolling window to visualize momentum.',
    priority: 'low',
  },
];

/**
 * Pick `count` proposals, rotating deterministically by `seed` so repeated runs
 * walk through the whole backlog instead of repeating the same ideas.
 */
export function proposeImprovements(seed: number, count = 3): AutopilotProposal[] {
  const n = Math.max(1, Math.min(count, IDEAS.length));
  const start = ((Math.floor(seed) % IDEAS.length) + IDEAS.length) % IDEAS.length;
  return Array.from({ length: n }, (_, i) => IDEAS[(start + i) % IDEAS.length]);
}

export const AUTOPILOT_PREFIX = '🤖 ';

const WEAKNESS_FOCUS: Record<string, string> = {
  grounded: 'grounding — it referenced tasks that aren’t on the board',
  concise: 'concision — replies ran too long',
  inCharacter: 'staying in character — it broke the board persona',
};

/**
 * Turn a low self-test result into a fix ticket. This is Ouroboros closing on
 * itself: the AI measures its own conversation quality and files the repair.
 * Returns null when the score is healthy (≥ 75%).
 */
export function diagnoseFromSelfTest(
  score: number,
  max: number,
  weakest: 'grounded' | 'concise' | 'inCharacter' | null,
): AutopilotProposal | null {
  if (max <= 0 || score / max >= 0.75) return null;
  const focus = weakest ? WEAKNESS_FOCUS[weakest] : 'overall reply quality';
  return {
    title: `Improve brain ${weakest ?? 'quality'} (self-test ${score}/${max})`,
    description: `The conversation self-test flagged weak ${focus}. Sharpen the system prompt or model, then re-run "${LOOP_NAME}" self-test to confirm.`,
    priority: 'high',
  };
}
