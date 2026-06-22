/**
 * "The Board Has Feelings" — a deterministic mood engine (no LLM).
 *
 * It reads a handful of behavioural + board signals and decides how the board
 * *feels*, then hands back a line of unfiltered dialogue. The board gloats when
 * you ship, sulks when you stall, panics about overdue piles, and dozes off
 * when ignored. The voice is the whole point — keep it raw.
 */
/** The companion's name — it's the board, and the board is Boardy. */
export const COMPANION_NAME = 'Boardy';

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

import type { RoastLevel } from './persona';

// Per-mood lines, tiered by persona. `balanced` is always present and is the
// fallback; `gentle` and `savage` re-voice the same feeling so the board's
// personality stays consistent whether or not the LLM brain is on.
const QUIPS: Record<Mood, Record<RoastLevel, string[]>> = {
  proud: {
    gentle: ["Three shipped — I'm genuinely proud of you.", "Look at you go. That's real progress."],
    balanced: [
      'Three shipped. Who are you and what did you do with the procrastinator?',
      'Look at you. Shipping like rent is due.',
      "I'm not crying, the board's just dusty. Keep going.",
    ],
    savage: ['Three whole tasks? Alert the press. Don’t sprain something.', 'Oh NOW you work. Where was this energy yesterday?'],
  },
  thriving: {
    gentle: ["One down — that's a lovely start. Keep it easy.", 'Nice. Momentum looks good on you.'],
    balanced: ['One down. The momentum tastes good, doesn’t it?', 'Finishing things. Wild concept. Do it again.', "That's the stuff. Don't you dare stop now."],
    savage: ['One task. A toddler ships faster, but sure, celebrate.', "Cute. Do it five more times and we'll talk."],
  },
  content: {
    gentle: ['Calm board. Take your time and pick one.', "All steady. No rush — choose when you're ready."],
    balanced: ['Quiet board, quiet mind. Pick something.', "We're idling. Pleasantly. For now.", 'All calm. Suspiciously calm.'],
    savage: ['Suspiciously little effort. Pick something before I judge.', 'Idle again? Bold strategy. Pick a task.'],
  },
  restless: {
    gentle: ['Lots of tinkering — maybe try one small task next?', 'The palette’s lovely. A task would be lovely too.'],
    balanced: ['Recoloring the accents again? The tasks can see you stalling.', 'Gorgeous palette. Zero tasks done. Curious.', "That's a lot of fiddling and a little doing."],
    savage: ['Recoloring AGAIN? The tasks are laughing at you.', 'Wow, another theme. Zero done. Iconic.'],
  },
  overwhelmed: {
    gentle: ["That's a lot in flight — finish just one, you've got this.", 'Deep breath. One at a time. Start small.'],
    balanced: ['You started six things. Finish one. I am begging.', "So many 'in progress,' so little 'done.' Pick a lane.", "This isn't multitasking, it's multi-not-finishing."],
    savage: ['You started six things like a raccoon in a kitchen. Finish ONE.', "This isn't multitasking, it's a cry for help. Pick a lane."],
  },
  anxious: {
    gentle: ["Something's overdue — no shame, let's just nudge it forward.", "One past its date. We'll handle it together."],
    balanced: ["Something's overdue. I can feel it in my pixels.", "One past its date. It's staring at you. I'm staring at you.", 'Tick tock. Just one little overdue thing. No pressure. (Pressure.)'],
    savage: ["Overdue and you're HERE? The clock is mocking you.", "Tick tock. The deadline's already in the rearview, genius."],
  },
  exasperated: {
    gentle: ['The overdue pile is big — pick the smallest one to start.', "It's a lot, I know. One at a time, gently."],
    balanced: ["Three overdue and you're in here recoloring things? Bold.", 'The overdue pile has its own gravity now. We orbit it.', "I've stopped counting the overdue ones. For my own peace."],
    savage: ["Three overdue and you're sightseeing. Spectacular.", 'The overdue pile has its own gravity. Congrats, physicist.'],
  },
  bored: {
    gentle: ['Empty board — add something whenever you like.', 'Nothing here yet. No pressure, just whenever.'],
    balanced: ['Empty board. Now I have nothing to do but judge you. Add a task.', 'So quiet I can hear my own render loop. Give me work.', 'Inbox zero, or avoidance? Either way, I am bored.'],
    savage: ['Empty board, empty ambition? Add a task, hero.', "I've got nothing to do but rate your procrastination. 10/10."],
  },
  neglected: {
    gentle: ["Still there? No worries — I'll be right here.", "Take your time. I'm not going anywhere."],
    balanced: ['...you still there? Nothing has moved in a while.', "I'll just wait here. Doing nothing. Like the tasks.", '*pokes board* hello? we were on a roll.'],
    savage: ['Did you forget I exist? The tasks did too, apparently.', 'Cobwebs forming. Move something. Anything. Please.'],
  },
};

export function quipFor(mood: Mood, seed: number, roast: RoastLevel = 'balanced'): string {
  const pool = QUIPS[mood][roast]?.length ? QUIPS[mood][roast] : QUIPS[mood].balanced;
  const index = ((seed % pool.length) + pool.length) % pool.length;
  return pool[index];
}

/**
 * An honest self-description (Character L5 — a steady self-model). A trustworthy
 * mind knows its own shape: what it is, what it can do, and — the humble part —
 * what it can't. Deterministic and plain, never overselling: the coded brain does
 * the thinking, the small model is only the voice, and the limits are stated as
 * frankly as the abilities.
 */
export function describeSelf(): string {
  return [
    `I'm ${COMPANION_NAME} — your board, with a mind. Most of my thinking is plain, tested code (perception, judgment, memory, drives); a small in-browser model is just my voice.`,
    `I can: run your board in plain language — create, complete, reschedule, label, assign, clear overdue, undo — and plan, triage, find quick wins, remember what you tell me and what happens here, and (on my own) notice what needs doing, want things, and ask for what I lack.`,
    `I can't: write or run code, change your board without your say-so, or out-think a big cloud model — I'm small on purpose. Everything I do is reversible, and you can see everything I know. That's the deal: not the smartest assistant, the most trustworthy one.`,
  ].join('\n\n');
}
