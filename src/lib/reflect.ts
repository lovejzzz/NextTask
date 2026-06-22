/**
 * Reflection — Boardy's higher-order cognition. See MEMORY.md.
 *
 * Perception (insights.ts) reads the board's shape *now*. Episodic memory (history.ts)
 * records what *happened*. Reflection is the layer above both: it reads the lived
 * history and synthesizes *patterns the person can't see in a snapshot* — the work
 * that keeps slipping, the stage where things pile up, the day they actually ship. The
 * developmental leap from a companion that answers what's in front of it to one that
 * notices how you work and reflects it back.
 *
 * Inspired by the reflection step in Stanford's Generative Agents (Park et al., 2023),
 * which synthesizes memories into higher-level insights — but where they prompt an LLM
 * to do it (and inherit its drift and opacity), Boardy reflects *deterministically*:
 * coded pattern detectors over the event log, each carrying the plain evidence behind
 * it. So a reflection is always grounded, inspectable, and honest about its basis —
 * and he stays quiet when the evidence is thin rather than inventing a pattern. The
 * board is his memory; reflection is the wisdom he reads out of it.
 */
import type { BoardEvent } from './history';

export type ReflectionKind = 'reschedule_prone' | 'bottleneck_stage' | 'ship_tempo' | 'follow_through';

export type Reflection = {
  kind: ReflectionKind;
  observation: string; // first-person, gentle, specific — what he noticed
  evidence: string; // the plain grounds for it, so the reflection is never a bare claim
  weight: number; // signal strength, for ordering and restraint
};

const DAY_MS = 86_400_000;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Human-readable name for a board status. */
function stageName(status: string): string {
  if (status === 'in_progress') return 'in progress';
  if (status === 'in_review') return 'in review';
  if (status === 'todo') return 'the to-do column';
  return status.replace(/_/g, ' ');
}

/** The destination status of a move/completion event ("todo → in_review" → "in_review"). */
function destinationOf(event: BoardEvent): string | null {
  const arrow = event.detail?.split('→');
  return arrow && arrow.length === 2 ? arrow[1].trim() : null;
}

/** Work that keeps slipping — the task rescheduled the most, if it crosses the bar. */
function rescheduleProne(events: BoardEvent[], minReschedules: number): Reflection | null {
  const counts = new Map<string, { title: string; n: number }>();
  for (const event of events) {
    if (event.kind !== 'rescheduled') continue;
    const seen = counts.get(event.taskId) ?? { title: event.title, n: 0 };
    counts.set(event.taskId, { title: event.title, n: seen.n + 1 });
  }
  let top: { title: string; n: number } | null = null;
  for (const value of counts.values()) if (!top || value.n > top.n) top = value;
  if (!top || top.n < minReschedules) return null;
  return {
    kind: 'reschedule_prone',
    observation: `"${top.title}" keeps slipping — when something gets rescheduled this often, it's usually too big or not really yours. Want to break it down, or let it go?`,
    evidence: `rescheduled ${top.n} times`,
    weight: top.n,
  };
}

/** A stage where work parks — the status the most tasks sit in without reaching done. */
function bottleneck(events: BoardEvent[], minStuck: number): Reflection | null {
  // Latest known status per task across its moves; tasks that reached done are clear.
  const latest = new Map<string, string>();
  const done = new Set<string>();
  for (const event of events) {
    if (event.kind === 'completed') {
      done.add(event.taskId);
      latest.delete(event.taskId);
    } else if (event.kind === 'dropped') {
      latest.delete(event.taskId);
      done.delete(event.taskId);
    } else if (event.kind === 'moved' || event.kind === 'created') {
      if (done.has(event.taskId)) continue;
      const dest = destinationOf(event) ?? (event.kind === 'created' ? 'todo' : null);
      if (dest && dest !== 'done') latest.set(event.taskId, dest);
    }
  }
  const byStage = new Map<string, number>();
  for (const status of latest.values()) byStage.set(status, (byStage.get(status) ?? 0) + 1);
  let topStage: string | null = null;
  let topN = 0;
  for (const [status, n] of byStage) {
    if (n > topN) {
      topStage = status;
      topN = n;
    }
  }
  // Only meaningful for a waiting stage (not the to-do inbox) with enough parked work.
  if (!topStage || topN < minStuck || topStage === 'todo') return null;
  return {
    kind: 'bottleneck_stage',
    observation: `Work tends to pile up ${stageName(topStage)} — a few things have parked there. That's usually the real bottleneck, not the to-do list.`,
    evidence: `${topN} tasks sitting ${stageName(topStage)}`,
    weight: topN,
  };
}

/** The rhythm of shipping — the day of the week the most work gets cleared. */
function tempo(events: BoardEvent[], minShips: number): Reflection | null {
  const byDay = new Array<number>(7).fill(0);
  let total = 0;
  for (const event of events) {
    if (event.kind !== 'completed') continue;
    byDay[new Date(event.at).getDay()] += 1;
    total += 1;
  }
  if (total < minShips) return null;
  let mode = 0;
  for (let d = 1; d < 7; d += 1) if (byDay[d] > byDay[mode]) mode = d;
  // Needs a real peak, not a flat spread: the top day must clearly lead.
  if (byDay[mode] < 3 || byDay[mode] < total * 0.4) return null;
  return {
    kind: 'ship_tempo',
    observation: `You clear the most on ${DAYS[mode]}s — that's your shipping day. Worth protecting it for the work that matters.`,
    evidence: `${byDay[mode]} of ${total} ships on ${DAYS[mode]}s`,
    weight: byDay[mode],
  };
}

/** Follow-through — when more gets dropped than finished, said plainly and without blame. */
function followThrough(events: BoardEvent[], minDropped: number): Reflection | null {
  let completed = 0;
  let dropped = 0;
  for (const event of events) {
    if (event.kind === 'completed') completed += 1;
    else if (event.kind === 'dropped') dropped += 1;
  }
  if (dropped < minDropped || dropped <= completed) return null;
  return {
    kind: 'follow_through',
    observation: `Lately more is getting dropped than finished — no judgment, but it can mean we're taking on more than fits. Want to be choosier about what gets on the board?`,
    evidence: `${dropped} dropped vs ${completed} shipped`,
    weight: dropped,
  };
}

/**
 * What Boardy has noticed about how you work — his grounded reflections, strongest
 * first, capped for restraint. Empty when the history is too thin to read honestly:
 * he reflects from evidence or not at all, never inventing a pattern to seem wise.
 */
export function reflect(events: BoardEvent[], windowDays = 30, now: number = Date.now(), limit = 3): Reflection[] {
  const recent = events.filter((event) => event.at >= now - windowDays * DAY_MS && event.at <= now);
  const reflections = [
    rescheduleProne(recent, 3),
    bottleneck(recent, 2),
    tempo(recent, 5),
    followThrough(recent, 3),
  ].filter((reflection): reflection is Reflection => reflection !== null);
  return reflections.sort((a, b) => b.weight - a.weight).slice(0, Math.max(0, limit));
}
