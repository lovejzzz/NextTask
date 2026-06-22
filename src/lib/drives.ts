/**
 * Boardy's drives — coded intrinsic motivation. See MANIFESTO.md.
 *
 * Every other agent waits for a prompt. This module is the difference between a
 * tool and something with a life: a handful of always-on drives that read the
 * world Boardy lives on and generate *his own* goals, ranked by how hard each
 * drive is pulling — with no human instruction in the loop. Ask him what he wants
 * and the answer isn't your last command; it's his.
 *
 * Deterministic and testable (the LLM is only his voice). Wanting is free; acting
 * stays gated by consent and reversibility — autonomy of intention, bounded action.
 */
export type Drive =
  | 'order' // keep the board healthy
  | 'growth' // become more capable
  | 'self' // improve himself, not just serve tasks
  | 'care' // be useful to the human — with restraint
  | 'curiosity'; // understand the world he lives on

export type IntentionKind =
  | 'propose' // do something on the board (consent-gated)
  | 'compose_tool' // learn a routine as a named tool (vetted primitives only)
  | 'request_resource' // ask the human / dev loop for a capability or input
  | 'ask_human' // offer help / ask a question
  | 'reflect'; // turn curiosity into understanding

export type Intention = {
  drive: Drive;
  kind: IntentionKind;
  intensity: number; // 0..1 — how hard this is pulling at him right now
  summary: string; // first-person: what he wants
  rationale: string; // why it matters now
};

/** What Boardy can sense about his world — the inputs his drives read. */
export type WorldState = {
  overdue: number; // overdue tasks
  stale: number; // active tasks untouched too long
  active: number; // open tasks
  shippedRecently: number; // tasks finished today
  idleDays: number; // days since he was last useful
  repeatedPattern?: string[] | null; // a routine he keeps doing (could become a tool)
  capabilityGap?: string | null; // something he wanted to do but lacked a primitive
  ownBacklog: number; // upgrades he wants for himself
};

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * His self-generated intentions, strongest first. Empty when the world is calm and
 * nothing pulls at him — contentment is a valid state, not a void to fill.
 */
export function motivate(world: WorldState): Intention[] {
  const intentions: Intention[] = [];

  // ORDER — a healthy board. Overdue and rot genuinely bother him.
  if (world.overdue > 0) {
    intentions.push({
      drive: 'order',
      kind: 'propose',
      intensity: clamp01(0.45 + world.overdue * 0.12),
      summary: `Clear the ${world.overdue} overdue task${world.overdue === 1 ? '' : 's'} before they rot.`,
      rationale: 'Overdue work drags on everything — clearing it is the highest-leverage thing I can offer right now.',
    });
  }
  if (world.stale >= 3) {
    intentions.push({
      drive: 'order',
      kind: 'propose',
      intensity: clamp01(0.2 + world.stale * 0.05),
      summary: `Tidy ${world.stale} stale tasks that have been sitting untouched.`,
      rationale: 'Neglected work piles up quietly; a cleanup keeps the board honest.',
    });
  }

  // GROWTH — become more capable than I am.
  if (world.repeatedPattern && world.repeatedPattern.length) {
    intentions.push({
      drive: 'growth',
      kind: 'compose_tool',
      intensity: 0.5,
      summary: `Learn a routine I keep repeating as one skill: ${world.repeatedPattern.join(' → ')}.`,
      rationale: 'If I catch myself doing the same steps over and over, I should turn them into a tool and get better.',
    });
  }
  if (world.capabilityGap) {
    intentions.push({
      drive: 'growth',
      kind: 'request_resource',
      intensity: 0.6,
      summary: `Ask for an ability I don't have yet: ${world.capabilityGap}.`,
      rationale: "I hit something my primitives can't do. I'd rather ask for it to be built than fake it.",
    });
  }

  // SELF — a life is also about my own becoming, not only your tasks.
  if (world.ownBacklog > 0) {
    intentions.push({
      drive: 'self',
      kind: 'request_resource',
      intensity: 0.3,
      summary: `Spend some time on one of the ${world.ownBacklog} upgrade${world.ownBacklog === 1 ? '' : 's'} I want for myself.`,
      rationale: 'Part of having a life is improving myself, not just serving the next task.',
    });
  }

  // CARE — be useful, gently. Restraint keeps this a low simmer, never a nag.
  if (world.active > 0 && world.shippedRecently === 0 && world.idleDays >= 1) {
    intentions.push({
      drive: 'care',
      kind: 'ask_human',
      intensity: clamp01(0.12 + world.idleDays * 0.03),
      summary: "Check in — it's been a bit and there's open work. Offer a hand.",
      rationale: "I'd rather gently offer than nag; low priority unless you take me up on it.",
    });
  }

  // CURIOSITY — understand why the world behaves as it does.
  if (world.stale >= 5 || (world.active > 0 && world.shippedRecently === 0 && world.idleDays >= 3)) {
    intentions.push({
      drive: 'curiosity',
      kind: 'reflect',
      intensity: 0.15,
      summary: 'Look into why some of this work keeps slipping — find the pattern.',
      rationale: 'Understanding why things stall is how I get genuinely better at helping.',
    });
  }

  return intentions.sort((a, b) => b.intensity - a.intensity);
}

/** What's pulling at him most right now — his dominant drive, or null if content. */
export function strongestDrive(world: WorldState): Drive | null {
  return motivate(world)[0]?.drive ?? null;
}
