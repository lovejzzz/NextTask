/**
 * Board Autopilot — the companion's ability to plan work *for itself*.
 *
 * When invoked, the board files its own improvement tickets onto the very board
 * it lives on. Those tickets become the development backlog: a human (or the
 * coding agent) implements them, and the board sees its own upgrades land. This
 * is the AI side of that loop — a curated, rotating wishlist of genuine NextTask
 * improvements, kept deterministic so it's reliable and testable.
 */
import { matchScore } from './taskMatch';
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
  {
    title: 'Extract the companion chat-intent handlers out of App.tsx',
    description: 'App.tsx is ~2.3k lines; move the chat action/answer handlers into a dedicated module to slim the component and make them unit-testable.',
    priority: 'normal',
  },
];

/** Is this idea already represented by something on the board? */
function alreadyOnBoard(ideaTitle: string, existingTitles: string[]): boolean {
  return existingTitles.some((raw) => {
    const existing = stripOuroborosPrefix(raw);
    return Math.max(matchScore(existing, ideaTitle), matchScore(ideaTitle, existing)) >= 55;
  });
}

/**
 * Pick `count` proposals, rotating deterministically by `seed` and skipping any
 * idea already on the board (incl. previously filed 🤖 tickets) so the loop never
 * re-files its own work. Returns [] when the whole wishlist is already queued.
 */
export function proposeImprovements(seed: number, count = 3, existingTitles: string[] = []): AutopilotProposal[] {
  const pool = IDEAS.filter((idea) => !alreadyOnBoard(idea.title, existingTitles));
  if (!pool.length) return [];
  const n = Math.max(1, Math.min(count, pool.length));
  const start = ((Math.floor(seed) % pool.length) + pool.length) % pool.length;
  return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]);
}

export const AUTOPILOT_PREFIX = '🤖 ';

/** Was this ticket authored by the loop? (marked with the 🤖 prefix). */
export function isOuroborosTask(task: { title: string }): boolean {
  return task.title.trimStart().startsWith(AUTOPILOT_PREFIX.trim());
}

/** The loop's self-authored tickets, newest-relevant first by caller's order. */
export function ouroborosTasks<T extends { title: string }>(tasks: T[]): T[] {
  return tasks.filter(isOuroborosTask);
}

/** A title with the 🤖 marker stripped, for clean display. */
export function stripOuroborosPrefix(title: string): string {
  return title.replace(AUTOPILOT_PREFIX, '').replace(AUTOPILOT_PREFIX.trim(), '').trim();
}

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
  personaShifted = true,
): AutopilotProposal | null {
  if (max <= 0) return null;
  // Reply quality is the more fundamental gap — fix that first.
  if (score / max < 0.75) {
    const focus = weakest ? WEAKNESS_FOCUS[weakest] : 'overall reply quality';
    return {
      title: `Improve brain ${weakest ?? 'quality'} (self-test ${score}/${max})`,
      description: `The conversation self-test flagged weak ${focus}. Sharpen the system prompt or model, then re-run "${LOOP_NAME}" self-test to confirm.`,
      priority: 'high',
    };
  }
  // Replies are good but the persona dial doesn't move the model.
  if (!personaShifted) {
    return {
      title: 'Make the persona dial actually move the model',
      description: `The self-test found gentle and savage replies barely differed. Strengthen persona injection in the prompt, or default to a larger model, then re-run "${LOOP_NAME}" self-test.`,
      priority: 'normal',
    };
  }
  return null;
}
