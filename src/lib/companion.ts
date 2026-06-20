/**
 * "The Board Has Feelings" — a deterministic mood engine (no LLM).
 *
 * It reads a handful of behavioural + board signals and decides how the board
 * *feels*, then hands back a line of unfiltered dialogue. The board gloats when
 * you ship, sulks when you stall, panics about overdue piles, and dozes off
 * when ignored. The voice is the whole point — keep it raw.
 */
export type Mood =
  | 'proud'
  | 'thriving'
  | 'content'
  | 'restless'
  | 'overwhelmed'
  | 'anxious'
  | 'exasperated'
  | 'bored'
  | 'neglected';

export type CompanionSignals = {
  active: number; // non-done tasks
  overdue: number; // active tasks past their due date
  inProgress: number; // tasks in the "in progress" column
  shippedToday: number; // tasks moved to done today
  fidgets: number; // cosmetic / no-op actions since the last real progress
  idleMs: number; // time since the last meaningful action
};

export const IDLE_THRESHOLD_MS = 75_000;
const FIDGET_THRESHOLD = 3;

/**
 * Decide the board's mood. First matching rule wins, so the order encodes
 * priority: neglect and emptiness override everything, then celebration, then
 * the various flavours of stress, then quiet contentment.
 */
export function readMood(signals: CompanionSignals): Mood {
  if (signals.active > 0 && signals.idleMs >= IDLE_THRESHOLD_MS) return 'neglected';
  if (signals.active === 0) return 'bored';
  if (signals.shippedToday >= 3) return 'proud';
  if (signals.overdue >= 3) return 'exasperated';
  if (signals.overdue >= 1) return 'anxious';
  if (signals.inProgress >= 4) return 'overwhelmed';
  if (signals.fidgets >= FIDGET_THRESHOLD) return 'restless';
  if (signals.shippedToday >= 1) return 'thriving';
  return 'content';
}

const QUIPS: Record<Mood, string[]> = {
  proud: [
    'Three shipped. Who are you and what did you do with the procrastinator?',
    'Look at you. Shipping like rent is due.',
    "I'm not crying, the board's just dusty. Keep going.",
  ],
  thriving: [
    'One down. The momentum tastes good, doesn’t it?',
    'Finishing things. Wild concept. Do it again.',
    "That's the stuff. Don't you dare stop now.",
  ],
  content: [
    'Quiet board, quiet mind. Pick something.',
    "We're idling. Pleasantly. For now.",
    'All calm. Suspiciously calm.',
  ],
  restless: [
    'Recoloring the accents again? The tasks can see you stalling.',
    "Gorgeous palette. Zero tasks done. Curious.",
    "That's a lot of fiddling and a little doing.",
  ],
  overwhelmed: [
    'You started six things. Finish one. I am begging.',
    "So many 'in progress,' so little 'done.' Pick a lane.",
    "This isn't multitasking, it's multi-not-finishing.",
  ],
  anxious: [
    "Something's overdue. I can feel it in my pixels.",
    "One past its date. It's staring at you. I'm staring at you.",
    'Tick tock. Just one little overdue thing. No pressure. (Pressure.)',
  ],
  exasperated: [
    "Three overdue and you're in here recoloring things? Bold.",
    'The overdue pile has its own gravity now. We orbit it.',
    "I've stopped counting the overdue ones. For my own peace.",
  ],
  bored: [
    'Empty board. Now I have nothing to do but judge you. Add a task.',
    'So quiet I can hear my own render loop. Give me work.',
    'Inbox zero, or avoidance? Either way, I am bored.',
  ],
  neglected: [
    '...you still there? Nothing has moved in a while.',
    "I'll just wait here. Doing nothing. Like the tasks.",
    '*pokes board* hello? we were on a roll.',
  ],
};

export function quipFor(mood: Mood, seed: number): string {
  const pool = QUIPS[mood];
  const index = ((seed % pool.length) + pool.length) % pool.length;
  return pool[index];
}
