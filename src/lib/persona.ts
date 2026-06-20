/**
 * The companion's personality dial. Two inputs shape its voice:
 *  - roast level: a user-chosen tone (gentle ↔ savage)
 *  - warmth: an earned bond that grows the more you ship and cools if you vanish
 * Together they produce the persona instruction injected into the LLM prompt.
 */
import { daysBetween, type CompanionMemory } from './companionMemory';

export type RoastLevel = 'gentle' | 'balanced' | 'savage';
export const ROAST_LEVELS: RoastLevel[] = ['gentle', 'balanced', 'savage'];

export function nextRoast(level: RoastLevel): RoastLevel {
  const index = ROAST_LEVELS.indexOf(level);
  return ROAST_LEVELS[(index + 1) % ROAST_LEVELS.length];
}

export type Warmth = 0 | 1 | 2 | 3 | 4 | 5;

/** Bond grows ~1 level per 5 lifetime ships, cooling by 1 after a few days away. */
export function warmthFromMemory(mem: CompanionMemory, now: number = Date.now()): Warmth {
  let score = Math.min(5, Math.floor(mem.totalShipped / 5));
  if (daysBetween(mem.lastSeen, now) >= 3) score -= 1;
  return Math.max(0, Math.min(5, score)) as Warmth;
}

const ROAST_TONE: Record<RoastLevel, string> = {
  gentle: 'Be warm, encouraging, and gentle; tease only very lightly.',
  balanced: 'Be witty and a little sassy, but ultimately on their side.',
  savage: 'Be bitingly sarcastic and roast their procrastination — while secretly rooting for them.',
};

export function personaInstruction(level: RoastLevel, warmth: Warmth): string {
  const bond =
    warmth <= 1
      ? 'You barely know this person yet; keep a little distance.'
      : warmth >= 4
        ? 'You know this person well and are quietly fond of them; let warmth show through the snark.'
        : "You're still getting to know this person.";
  return `${ROAST_TONE[level]} ${bond}`;
}
