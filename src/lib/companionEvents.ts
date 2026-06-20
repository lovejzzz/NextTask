/**
 * Proactive reactions: short lines the board blurts out the instant something
 * notable happens — you ship a task, hit a hat-trick, or add work. These are
 * rule-based (instant, reliable) even when the LLM brain is on, since they need
 * to land immediately on the event.
 */
export type CompanionEvent = 'shipped' | 'milestone' | 'goal' | 'created' | 'cleared';

const LINES: Record<CompanionEvent, string[]> = {
  shipped: [
    'One down. I felt that.',
    "Shipped. Don't let it go to your head. (Do.)",
    "That's the good stuff. Next one.",
  ],
  milestone: [
    'Three today?! Who ARE you.',
    "Hat trick. I'm telling the other boards.",
    'Three shipped. Certified Productive™.',
  ],
  goal: [
    "Daily goal: smashed. That's what I'm talking about.",
    "You hit your number. I'm framing this day.",
    'Goal met. Touch grass, champion. (Then come back.)',
  ],
  created: [
    "Noted. It's on me now — literally.",
    'Added. The pile grows; so does my faith in you.',
    "Fine, I'll hold that. Don't forget it exists.",
  ],
  cleared: [
    'Empty board. We did it. Now what do I do with myself?',
    'Nothing left. I feel weirdly proud and a little useless.',
    'All clear. Go outside. I mean it. (Come back though.)',
  ],
};

export function eventLine(kind: CompanionEvent, seed: number): string {
  const pool = LINES[kind];
  const index = ((seed % pool.length) + pool.length) % pool.length;
  return pool[index];
}
