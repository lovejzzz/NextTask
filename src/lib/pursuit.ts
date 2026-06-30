/**
 * Self-direction over time — Boardy's standing intention. See MANIFESTO step 5.
 *
 * His drives (drives.ts) generate wants fresh each moment, with no thread between
 * them: he can decide to steady the board on Monday and, by Friday, have no memory
 * he ever set out to. A *life* needs continuity — a goal he commits to, carries
 * across sessions, measures, and reflects on.
 *
 * A pursuit captures one of his intentions as a measurable commitment: what he's
 * trying to move, where it stood when he adopted it (the baseline), and when. Then
 * he can look back and say honestly whether he's making progress. Deterministic and
 * testable; the standing goal is an internal commitment (autonomy of intention),
 * not a board action — so it stays fully on the rails.
 */
import type { Drive, Intention, WorldState } from './drives';

export type PursuitMetric = 'order' | 'self' | 'throughput';

export type Pursuit = {
  goal: string; // first-person, human-readable
  drive: Drive;
  metric: PursuitMetric;
  baseline: number; // the metric's value when he committed
  adoptedAt: number; // epoch ms
  lastReviewedAt: number; // epoch ms
};

// For order/self, lower is better (less overdue/rot, smaller backlog). For
// throughput, higher is better (more shipped).
const LOWER_IS_BETTER: Record<PursuitMetric, boolean> = { order: true, self: true, throughput: false };

const GOAL_TEXT: Record<PursuitMetric, string> = {
  order: 'steady the board — fewer things overdue or rotting',
  self: 'make real progress on my own backlog',
  throughput: 'keep the work moving and shipping',
};

function metricValue(metric: PursuitMetric, world: WorldState): number {
  switch (metric) {
    case 'order':
      return world.overdue + world.stale;
    case 'self':
      return world.ownBacklog;
    case 'throughput':
      return world.shippedRecently;
  }
}

function metricFor(drive: Drive): PursuitMetric {
  if (drive === 'self') return 'self';
  if (drive === 'order') return 'order';
  return 'throughput'; // growth / care / curiosity → keep things moving
}

/** Commit to a standing intention: record what to move and where it stands now. */
export function adoptPursuit(intention: Intention, world: WorldState, now: number = Date.now()): Pursuit {
  const metric = metricFor(intention.drive);
  return { goal: GOAL_TEXT[metric], drive: intention.drive, metric, baseline: metricValue(metric, world), adoptedAt: now, lastReviewedAt: now };
}

export type PursuitReview = { direction: 'progress' | 'stalled' | 'slipped'; reflection: string; current: number };

function sinceLabel(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Look back honestly: is he moving his standing goal, stalled, or slipping? */
export function reviewPursuit(pursuit: Pursuit, world: WorldState, now: number = Date.now()): PursuitReview {
  const current = metricValue(pursuit.metric, world);
  const better = LOWER_IS_BETTER[pursuit.metric] ? current < pursuit.baseline : current > pursuit.baseline;
  const worse = LOWER_IS_BETTER[pursuit.metric] ? current > pursuit.baseline : current < pursuit.baseline;
  const days = Math.max(0, Math.floor((now - pursuit.adoptedAt) / 86_400_000));
  const direction = better ? 'progress' : worse ? 'slipped' : 'stalled';
  const head = `I set out to ${pursuit.goal} (${sinceLabel(days)}).`;
  const body =
    direction === 'progress'
      ? `It's moving the right way (${pursuit.baseline} → ${current}). I'll keep at it.`
      : direction === 'slipped'
        ? `It's gone the wrong way (${pursuit.baseline} → ${current}) — I should refocus there.`
        : `No real movement yet (still ${current}). I'm staying on it.`;
  return { direction, reflection: `${head} ${body}`, current };
}

/**
 * Has the pursuit's metric reached a natural "done" floor? Only meaningful for
 * lower-is-better metrics (order/self, where 0 is a real finish line); throughput
 * has no natural ceiling, so it never reports "met" here — only ongoing progress.
 * Used by the self-improvement loop's stop condition (loop.ts) to know when to
 * stop offering another round because the goal is actually satisfied, not just
 * nudged. Pure; `current` comes straight off the `PursuitReview` already computed.
 */
export function pursuitGoalMet(pursuit: Pursuit, review: PursuitReview): boolean {
  return LOWER_IS_BETTER[pursuit.metric] && review.current <= 0;
}
