/**
 * Proactive reactions: short lines the board blurts out the instant something
 * notable happens — you ship a task, hit a hat-trick, or add work. These are
 * rule-based (instant, reliable) even when the LLM brain is on, since they need
 * to land immediately on the event.
 */
export type CompanionEvent = 'shipped' | 'almost' | 'milestone' | 'goal' | 'created' | 'cleared' | 'streak_risk';

const LINES: Record<CompanionEvent, string[]> = {
  shipped: [
    'One down. I felt that.',
    "Shipped. Don't let it go to your head. (Do.)",
    "That's the good stuff. Next one.",
  ],
  almost: [
    'One more and you hit your goal. I can taste it.',
    "That's all but one. Don't you dare stop now.",
    'So close to your number. One more. Go.',
  ],
  streak_risk: [
    "Your streak's still alive — but the day's slipping. Ship one.",
    "Don't break the streak on my watch. One task. Any task.",
    'A streak this good would be a shame to drop today. Just one.',
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
