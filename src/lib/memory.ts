/**
 * Boardy's unified memory — one model for everything he knows.
 *
 * Today his memory is four disconnected stores (facts, command history, streaks,
 * skills), each a different shape, none aware of the others, all using hard FIFO
 * caps that drop old items regardless of how much they matter. This replaces that
 * with a single associative store where every memory — whatever its kind — shares
 * one shape and one retrieval path.
 *
 * Three properties make it more like a mind than a list:
 *   1. Salience + reinforcement + decay. Each memory has intrinsic importance and
 *      a strength that *rises every time it's used* and *fades when it isn't*, so
 *      forgetting is graceful (trivia evaporates, things that matter persist)
 *      instead of a blunt "keep the last N". (Activation/decay is the old ACT-R
 *      idea; spaced repetition is the same instinct.)
 *   2. Unified scored retrieval — relevance × importance × recency — across all
 *      kinds at once. (The recency·importance·relevance blend is from Stanford's
 *      "Generative Agents", 2023; we compute it deterministically, no LLM.)
 *   3. Consolidation — repeated episodes condense into durable semantic patterns,
 *      and near-duplicates merge, so memory *compounds* rather than just piling up.
 *
 * What's actually distinctive here isn't any single mechanism (all borrowed and
 * cited) — it's the *contract*: this memory is glass-box. Every item is plain
 * readable text with explicit provenance and confidence; nothing lives in an
 * opaque embedding; the human can see, correct, pin, or delete anything; and all
 * cognition (encode / retrieve / decay / consolidate) is deterministic and
 * testable, with the LLM kept to the voice (see BRAIN.md). See MEMORY.md.
 */
import { matchScore } from './taskMatch';

export type MemoryKind =
  | 'episodic' // something that happened (a command, a ship, an event)
  | 'semantic' // a fact about the user or the world ("deadline is Friday")
  | 'procedural' // how to do something (a skill / routine)
  | 'relational'; // the relationship itself (streaks, history, rapport)

export type MemorySource =
  | 'user-told' // the human said it outright — high confidence
  | 'observed' // Boardy saw it happen — solid
  | 'inferred'; // Boardy concluded it — hold humbly, lower confidence

export type MemoryItem = {
  id: string;
  kind: MemoryKind;
  text: string; // human-readable and editable — the glass-box guarantee
  source: MemorySource;
  importance: number; // 0..1 intrinsic weight (a deadline > a stray comment)
  confidence: number; // 0..1 — how sure he is it's true
  createdAt: number; // epoch ms
  lastSeenAt: number; // epoch ms of last reinforcement
  uses: number; // times reinforced — frequency resists forgetting
  pinned?: boolean; // user-locked: never decays, never auto-forgotten
  links?: string[]; // associations: task ids, or other memory ids
};

export type MemoryStore = MemoryItem[];

export type MemoryDraft = {
  kind: MemoryKind;
  text: string;
  source?: MemorySource;
  importance?: number;
  confidence?: number;
  links?: string[];
  pinned?: boolean;
};

const DAY_MS = 86_400_000;
const HALF_LIFE_DAYS = 14; // a memory left alone loses half its recency every ~2 weeks
const USE_BONUS = 0.12; // each reinforcement buys a little resistance to decay
const FORGET_FLOOR = 0.05; // below this effective strength, trivia is forgotten
const SAFETY_CAP = 200; // backstop so the store can't grow without bound

// Default confidence by how the memory was acquired — feeds humble recall.
const SOURCE_CONFIDENCE: Record<MemorySource, number> = { 'user-told': 0.95, observed: 0.8, inferred: 0.55 };

/** Normalize text for identity + dedup (not for display). */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[\s,;:.!?]+$/g, '')
    .replace(/\s{2,}/g, ' ');
}

function makeId(kind: MemoryKind, text: string): string {
  return `${kind}:${normalize(text).replace(/[^a-z0-9]+/g, '-').slice(0, 48)}`;
}

/** Days since a memory was last reinforced. */
function ageDays(item: MemoryItem, now: number): number {
  return Math.max(0, (now - item.lastSeenAt) / DAY_MS);
}

/**
 * Effective strength in [0,1]: exponential recency decay, lifted by how often the
 * memory has been used. Pinned memories are always fully strong. This is what
 * makes a thing said once and never again fade, while a thing returned to often
 * stays sharp.
 */
export function strength(item: MemoryItem, now: number = Date.now()): number {
  if (item.pinned) return 1;
  const recency = 0.5 ** (ageDays(item, now) / HALF_LIFE_DAYS);
  // Reinforcement counts *repeats* — the first encoding isn't a repeat.
  const reinforced = recency + Math.min(0.4, Math.log1p(Math.max(0, item.uses - 1)) * USE_BONUS);
  return Math.max(0, Math.min(1, reinforced));
}

/**
 * Encode a memory. If an identical one already exists, *reinforce* it (strengthen,
 * refresh, keep the strongest importance/confidence) rather than duplicate —
 * repetition should deepen a memory, not clutter the store.
 */
export function remember(store: MemoryStore, draft: MemoryDraft, now: number = Date.now()): MemoryStore {
  const text = draft.text.trim();
  if (!text) return store;
  const id = makeId(draft.kind, text);
  const source = draft.source ?? 'observed';
  const existing = store.find((item) => item.id === id);
  if (existing) {
    return store.map((item) =>
      item.id === id
        ? {
            ...item,
            lastSeenAt: now,
            uses: item.uses + 1,
            importance: Math.max(item.importance, draft.importance ?? item.importance),
            confidence: Math.max(item.confidence, draft.confidence ?? SOURCE_CONFIDENCE[source]),
            links: draft.links ? Array.from(new Set([...(item.links ?? []), ...draft.links])) : item.links,
            pinned: item.pinned || draft.pinned,
          }
        : item,
    );
  }
  const item: MemoryItem = {
    id,
    kind: draft.kind,
    text,
    source,
    importance: draft.importance ?? (draft.kind === 'episodic' ? 0.3 : 0.55),
    confidence: draft.confidence ?? SOURCE_CONFIDENCE[source],
    createdAt: now,
    lastSeenAt: now,
    uses: 1,
    pinned: draft.pinned,
    links: draft.links,
  };
  return [...store, item];
}

/** Strengthen a specific memory by use (e.g. it was just retrieved and acted on). */
export function reinforce(store: MemoryStore, id: string, now: number = Date.now()): MemoryStore {
  return store.map((item) => (item.id === id ? { ...item, uses: item.uses + 1, lastSeenAt: now } : item));
}

export type Scored = { item: MemoryItem; score: number };

// Retrieval weights when a query is present vs. ambient (no query) recall.
const W_REL = 0.5;
const W_IMP = 0.3;
const W_REC = 0.2;

/**
 * Retrieve the top-k most relevant memories for a query (or, with no query, the
 * most salient ones right now). Score blends how well it matches, how much it
 * matters, and how fresh/reinforced it is — one ranking across every kind.
 * Pure: retrieval-induced reinforcement is the caller's choice via `reinforce`.
 */
export function retrieve(
  store: MemoryStore,
  query = '',
  now: number = Date.now(),
  k = 5,
  kinds?: MemoryKind[],
): Scored[] {
  const q = query.trim();
  const pool = kinds ? store.filter((item) => kinds.includes(item.kind)) : store;
  const scored = pool.map((item) => {
    const rec = strength(item, now);
    if (!q) return { item, rel: 1, score: item.importance * 0.6 + rec * 0.4 };
    const rel = matchScore(item.text, q) / 100; // 0..1
    return { item, rel, score: rel * W_REL + item.importance * W_IMP + rec * W_REC };
  });
  return scored
    .filter((entry) => (q ? entry.rel > 0 : entry.score > 0)) // a real query needs real relevance
    .sort((a, b) => b.score - a.score || b.item.lastSeenAt - a.item.lastSeenAt)
    .slice(0, k)
    .map(({ item, score }) => ({ item, score }));
}

/**
 * Graceful forgetting. Drop only the genuinely trivial-and-neglected: never the
 * pinned, the important, or the well-used. A safety cap evicts the weakest first
 * if the store somehow balloons. This replaces blunt FIFO caps.
 */
export function decay(store: MemoryStore, now: number = Date.now()): MemoryStore {
  const kept = store.filter((item) => {
    if (item.pinned) return true;
    if (item.uses >= 3 || item.importance >= 0.7) return true;
    return item.importance * strength(item, now) >= FORGET_FLOOR;
  });
  if (kept.length <= SAFETY_CAP) return kept;
  return [...kept]
    .sort((a, b) => b.importance * strength(b, now) - a.importance * strength(a, now))
    .slice(0, SAFETY_CAP);
}

const MERGE_THRESHOLD = 80; // matchScore at/above which two memories are "the same thing" (substring containment or better)
const PROMOTE_AFTER = 3; // an episode seen this many times becomes a durable pattern

/**
 * Consolidation — what turns a log into a memory. Two moves:
 *   • Merge near-duplicate memories of the same kind into the stronger one
 *     (summing reinforcement), so paraphrases of one fact collapse to one.
 *   • Promote repetition: an episodic thing that keeps happening is condensed
 *     into a durable *semantic* pattern ("Often: clear overdue"), with importance
 *     scaled by how often it recurs. Episodic dust → lasting knowledge.
 */
export function consolidate(store: MemoryStore, now: number = Date.now()): MemoryStore {
  // 1. Merge near-duplicates within a kind.
  const merged: MemoryItem[] = [];
  for (const item of store) {
    const twin = merged.find(
      (m) => m.kind === item.kind && Math.max(matchScore(m.text, item.text), matchScore(item.text, m.text)) >= MERGE_THRESHOLD,
    );
    if (twin) {
      twin.uses += item.uses;
      twin.importance = Math.max(twin.importance, item.importance);
      twin.confidence = Math.max(twin.confidence, item.confidence);
      twin.lastSeenAt = Math.max(twin.lastSeenAt, item.lastSeenAt);
      twin.pinned = twin.pinned || item.pinned;
      twin.links = item.links ? Array.from(new Set([...(twin.links ?? []), ...item.links])) : twin.links;
    } else {
      merged.push({ ...item });
    }
  }

  // 2. Promote frequently-repeated episodes into semantic patterns.
  let result = merged;
  for (const item of merged) {
    if (item.kind !== 'episodic' || item.uses < PROMOTE_AFTER) continue;
    result = remember(
      result,
      {
        kind: 'semantic',
        text: `Often: ${item.text}`,
        source: 'inferred',
        importance: Math.min(0.8, 0.4 + item.uses * 0.05),
        confidence: Math.min(0.9, 0.5 + item.uses * 0.05),
      },
      now,
    );
  }
  return result;
}

/** Glass-box: a plain, inspectable listing of what he knows, strongest first. */
export function inspect(store: MemoryStore, now: number = Date.now()): string[] {
  return [...store]
    .sort((a, b) => b.importance * strength(b, now) - a.importance * strength(a, now))
    .map((item) => {
      const conf = item.confidence < 0.7 ? ' (unsure)' : '';
      const pin = item.pinned ? ' 📌' : '';
      return `[${item.kind}] ${item.text}${conf}${pin}`;
    });
}
