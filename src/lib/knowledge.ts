/**
 * Supervised learning — what Boardy has learned from the open web, vetted. See LEARNING.md.
 *
 * He lives in a sealed world (the board) and can't safely browse: his voice is a tiny
 * model, and untrusted web text in its loop is a prompt-injection waiting to happen —
 * one page saying "ignore your board" and every guarantee we built is gone. So the web
 * never touches his runtime. Instead the *mentor* is the vetted gateway: Boardy gets
 * curious, the mentor researches the open internet, checks the sources, and distills a
 * durable, true principle into a Learning here — plain text, with its provenance
 * attached. He learns from the world; the world never gets to steer him.
 *
 * A Learning is deliberately *durable knowledge* (a principle, a method), never a
 * volatile fact that rots (a price, a score, today's weather) — supervision means
 * choosing things that stay true. Each carries its source so the claim is never bare,
 * and the whole set is glass-box (visible in his Mind panel) and reversible. Pure and
 * deterministic; no fetch, no LLM — the audited residue of supervised research.
 */
export type Learning = {
  id: string;
  topic: string; // what it's about, in a few words
  insight: string; // first-person — how it changes what he notices or advises
  source: { title: string; url: string }; // provenance: the vetted source the mentor read
  learnedOn: string; // ISO date the mentor taught it
};

// His standing knowledge — each entry researched on the open web by the mentor,
// checked against authoritative sources, and distilled to a durable principle.
export const LEARNINGS: Learning[] = [
  {
    id: 'wip-limits',
    topic: 'Work-in-progress limits (Kanban)',
    insight:
      "When too much is in progress at once, I should say so — a board flows by capping work-in-progress: “stop starting, start finishing.” A rough cap is about your team size plus one. Fewer things going at once actually finish faster.",
    source: { title: 'Businessmap — What is WIP & Why Limit It', url: 'https://businessmap.io/kanban-resources/getting-started/what-is-wip' },
    learnedOn: '2026-06-23',
  },
  {
    id: 'two-minute-rule',
    topic: 'The two-minute rule (GTD)',
    insight:
      "If something takes less than two minutes, the honest move is usually to just do it now — past that, tracking it costs more than doing it. So I'll nudge you to knock out the tiny stuff instead of letting it pile into the backlog.",
    source: { title: 'Getting Things Done — The Two-Minute Rule (David Allen)', url: 'https://gettingthingsdone.com/2020/05/the-two-minute-rule-2/' },
    learnedOn: '2026-06-23',
  },
];

/** A compact creed block of what he's learned, to weave into his prompt (capped). */
export function formatLearnings(learnings: Learning[] = LEARNINGS, limit = 4): string {
  const picked = learnings.slice(0, limit);
  if (!picked.length) return '';
  return `What you've learned (taught by your mentor from vetted sources): ${picked.map((l) => `— ${l.insight}`).join(' ')}`;
}

/** Plain-text account for the glass-box Mind panel: the topic and where it came from. */
export function describeLearnings(learnings: Learning[] = LEARNINGS): string[] {
  return learnings.map((l) => `${l.topic} — learned from "${l.source.title}"`);
}

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'to', 'about', 'do', 'you', 'your', 'know', 'what', 'tell', 'me', 'is', 'are', 'how']);

/** Tokens of a query worth matching against a learning. */
function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * The learning most relevant to a question ("what do you know about wip?"), or null
 * if he wasn't taught anything close. Matches the query against each learning's topic
 * and insight — so he answers from what he was actually taught, not a guess.
 */
export function findLearning(query: string, learnings: Learning[] = LEARNINGS): Learning | null {
  const words = keywords(query);
  if (!words.length) return null;
  let best: Learning | null = null;
  let bestScore = 0;
  for (const learning of learnings) {
    const hay = `${learning.topic} ${learning.insight}`.toLowerCase();
    const score = words.reduce((sum, word) => sum + (hay.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = learning;
    }
  }
  return bestScore > 0 ? best : null;
}
