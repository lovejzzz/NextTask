/**
 * The Autonomous Growth Model — how Boardy grows *himself*. See GROWTH.md.
 *
 * Until now growth was supervised: the dev loop read his code, found his gaps, and
 * wrote the fix. Honest, but not autonomous — he never noticed his own limits. This
 * module is the inversion. From his *own* lived experience he senses where he falls
 * short, and responds — within his primitives where he safely can, by *asking* where
 * he can't. The autonomy boundary is exactly the safety boundary:
 *
 *   - A gap he can close with skills he already has → he closes it himself.
 *   - A gap that needs a NEW primitive → he can't write code (no codegen, ever), so
 *     he *articulates* the missing ability as a request the dev loop fulfills.
 *
 * He finds the gap; a human builds the primitive. Growth becomes Boardy-directed and
 * human-assisted, instead of human-directed. Deterministic, append-only, no LLM in
 * the loop — wanting and asking are free, every resulting action stays consent-gated
 * and reversible (a filed request is just an undoable ticket).
 */
import type { Drive, Intention } from './drives';

/** A shortfall Boardy noticed in himself, read off lived experience. */
export type GrowthSignal =
  // The human kept asking for something he couldn't do — a real missing ability.
  | { kind: 'capability_gap'; ability: string; example: string; count: number }
  // A routine he keeps repeating by hand — worth crystallizing into one skill.
  | { kind: 'repetition'; steps: string[] }
  // A standing pursuit that slipped — his own direction needs a correction.
  | { kind: 'drift'; goal: string };

/**
 * His response to a signal. `by: 'self'` is a move he makes within his existing
 * primitives (no new code); `by: 'ask'` is a move that needs a new primitive he
 * can't build, so he files a request instead of faking or seizing the ability.
 */
export type GrowthMove =
  | { by: 'self'; act: 'compose_tool'; steps: string[]; summary: string }
  | { by: 'self'; act: 'refocus'; summary: string }
  | { by: 'ask'; act: 'request_primitive'; ability: string; summary: string };

/** What he can look back on to sense his gaps — all things he already records. */
export type GrowthExperience = {
  unmet: string[]; // utterances that parsed to no intent (a capability gap, maybe)
  repeated?: string[] | null; // a command sequence he keeps repeating (from skills.ts)
  slippedGoal?: string | null; // a standing pursuit that reviewPursuit flagged 'slipped'
};

// Lead words that carry no capability — strip them so the *verb* of an ask clusters.
const FILLER = new Set([
  'hey', 'hi', 'please', 'pls', 'can', 'could', 'would', 'will', 'you', 'just', 'um',
  'so', 'okay', 'ok', 'i', 'id', 'want', 'wanna', 'need', 'lets', 'let', 'to', 'the',
  'a', 'an', 'my', 'me', 'for', 'do', 'go', 'and', 'then', 'now', 'maybe', 'like', 'gonna',
]);

/** The capability an unmet ask is reaching for — its lead verb, wording-independent. */
export function gapKey(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/['’`]/g, '') // keep contractions whole: "I'd" → "id" (filler), not a stray "d"
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return tokens.find((t) => !FILLER.has(t)) ?? '';
}

/**
 * Aggregate unmet asks into capability gaps. One typo isn't a gap; the *same* kind
 * of ask, unmet again and again, is. Only verbs asked at least `minCount` times
 * surface — so he grows toward what you actually keep needing, not noise.
 */
export type CapabilityGap = Extract<GrowthSignal, { kind: 'capability_gap' }>;

export function senseCapabilityGaps(unmet: string[], minCount = 2): CapabilityGap[] {
  const groups = new Map<string, string[]>();
  for (const raw of unmet) {
    const key = gapKey(raw);
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(raw.trim());
  }
  const signals: CapabilityGap[] = [];
  for (const [ability, examples] of groups) {
    if (examples.length < minCount) continue;
    signals.push({ kind: 'capability_gap', ability, example: examples[examples.length - 1], count: examples.length });
  }
  return signals.sort((a, b) => b.count - a.count);
}

/**
 * Everything Boardy currently senses he's short on, strongest first. Capability
 * gaps lead (they're the human's recurring unmet need), then a routine he could
 * crystallize, then his own drift. Empty when he's keeping up — no gap is a fine
 * state, not a void to fill.
 */
export function senseGaps(experience: GrowthExperience, minCount = 2): GrowthSignal[] {
  const signals: GrowthSignal[] = senseCapabilityGaps(experience.unmet, minCount);
  if (experience.repeated && experience.repeated.length) signals.push({ kind: 'repetition', steps: experience.repeated });
  if (experience.slippedGoal) signals.push({ kind: 'drift', goal: experience.slippedGoal });
  return signals;
}

/** The bounded, safe move that answers a signal — self where he can, ask where he can't. */
export function respond(signal: GrowthSignal): GrowthMove {
  switch (signal.kind) {
    case 'repetition':
      return {
        by: 'self',
        act: 'compose_tool',
        steps: signal.steps,
        summary: `I keep doing ${signal.steps.join(' → ')} by hand — I can save it as one skill and stop repeating myself.`,
      };
    case 'drift':
      return {
        by: 'self',
        act: 'refocus',
        summary: `I set out to ${signal.goal} but I've slipped. I should drop that and recommit to what's actually pulling at me now.`,
      };
    case 'capability_gap':
      return {
        by: 'ask',
        act: 'request_primitive',
        ability: signal.ability,
        summary: `You've asked me to "${signal.example}" ${signal.count} times and I couldn't. I can't build that myself, but I can ask for it.`,
      };
  }
}

/**
 * Turn a "needs a new primitive" gap into an Intention, so it rides the *existing*
 * resource-request channel (drives → resourceRequestTicket → a real 🤖 ticket the
 * dev loop picks up). This is the seam where autonomous noticing meets human-built
 * capability — the honest hand-off, reusing the asking machinery he already has.
 */
export function growthRequestIntention(signal: Extract<GrowthSignal, { kind: 'capability_gap' }>): Intention {
  const drive: Drive = 'growth';
  return {
    drive,
    kind: 'request_resource',
    intensity: Math.min(1, 0.5 + signal.count * 0.1),
    summary: `Add the ability to "${signal.ability}" — you've asked ${signal.count} times and I have no way to do it.`,
    rationale: `Recurring unmet ask (e.g. "${signal.example}"). I'd rather ask for the primitive to be built than fake it or drop it silently.`,
  };
}

/** The single strongest gap he should act on now, or null when he's keeping up. */
export function strongestGap(experience: GrowthExperience, minCount = 2): GrowthSignal | null {
  return senseGaps(experience, minCount)[0] ?? null;
}

// ── The growth ledger: his developmental autobiography, glass-box ──────────────

/** One recorded step of growth: what he noticed, and what he did about it. */
export type GrowthEntry = { at: number; signal: GrowthSignal; move: GrowthMove };

const LEDGER_CAP = 100;

/** Append a growth step, de-duplicating an identical signal+move so it logs once. */
export function recordGrowth(ledger: GrowthEntry[], signal: GrowthSignal, move: GrowthMove, at: number = Date.now()): GrowthEntry[] {
  const sig = JSON.stringify(signal);
  const mv = JSON.stringify(move);
  if (ledger.some((e) => JSON.stringify(e.signal) === sig && JSON.stringify(e.move) === mv)) return ledger;
  return [...ledger, { at, signal, move }].slice(-LEDGER_CAP);
}

/**
 * An honest, first-person account of how he's grown — counted off the ledger, not
 * asserted. This is the report card writing itself: he can say what changed in him
 * because there's a recorded trail behind every claim. Empty string when he hasn't
 * grown yet (no inflation).
 */
export function growthSummary(ledger: GrowthEntry[]): string {
  if (!ledger.length) return '';
  let tools = 0;
  let asks = 0;
  let refocus = 0;
  for (const entry of ledger) {
    if (entry.move.act === 'compose_tool') tools += 1;
    else if (entry.move.act === 'request_primitive') asks += 1;
    else if (entry.move.act === 'refocus') refocus += 1;
  }
  const parts: string[] = [];
  if (tools) parts.push(`crystallized ${tools} routine${tools === 1 ? '' : 's'} into skills`);
  if (asks) parts.push(`asked for ${asks} new abilit${asks === 1 ? 'y' : 'ies'} I was missing`);
  if (refocus) parts.push(`refocused ${refocus} time${refocus === 1 ? '' : 's'} when I'd drifted`);
  if (!parts.length) return '';
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  return `I've grown ${ledger.length} time${ledger.length === 1 ? '' : 's'} on my own: I ${list}.`;
}
