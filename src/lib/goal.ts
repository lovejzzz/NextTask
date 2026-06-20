/**
 * Daily ship goal for the companion — a small target that the creature fills a
 * ring toward as you finish tasks, celebrating when you hit your number.
 */
export const GOAL_OPTIONS = [1, 3, 5, 8] as const;
export type Goal = (typeof GOAL_OPTIONS)[number];

export const DEFAULT_GOAL: Goal = 3;

export function nextGoal(current: number): Goal {
  const index = GOAL_OPTIONS.indexOf(current as Goal);
  return GOAL_OPTIONS[(index + 1) % GOAL_OPTIONS.length];
}

export function goalProgress(shipped: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(1, shipped / goal));
}
