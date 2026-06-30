/**
 * reviewOutcome — the audit step of Boardy's plan→execute→review→plan-next loop.
 * See docs/design/self-improvement-loop-plan.md for the design rationale (three
 * independent designs were adversarially verified before this was written; this
 * module is the one piece of the verified set that survived scoring critique
 * untouched — only the orchestration AROUND it was found unsafe, never this).
 *
 * Pure, deterministic, no LLM anywhere in the scoring path — the same family as
 * gateAction (closed-enum, per-kind rules) and scoreReply/scoreAgentCase
 * (objective checks → a score), not an LLM judge. It does NOT grade "was this a
 * good plan" (that's the rationale, vetted by the human at consent time) or
 * parse free text — only whether the board moved the way the ALREADY-GATED
 * ProposedAction said it would, on the exact titles the plan named. Never a
 * global "board got better" verdict, which would be unfalsifiable and gameable.
 */
import { computeInsights, type BoardInsights } from './insights';
import type { ActionKind, ProposedAction } from './liveAction';
import type { Task, TaskPriority, TaskStatus } from './types';

export type OutcomeSnapshot = {
  at: number; // epoch ms
  insights: BoardInsights; // board-wide, for clear_overdue's check
  byTitle: Record<string, { status: TaskStatus; priority: TaskPriority; due_date: string | null } | undefined>;
};

/** Snapshot only the titles a plan named, plus board-wide insights. Pure. */
export function snapshotBoard(tasks: Task[], targetTitles: string[], now: Date = new Date()): OutcomeSnapshot {
  const insights = computeInsights(tasks, now);
  const byTitle: OutcomeSnapshot['byTitle'] = {};
  for (const title of targetTitles) {
    const task = tasks.find((t) => t.title === title);
    byTitle[title] = task ? { status: task.status, priority: task.priority, due_date: task.due_date } : undefined;
  }
  return { at: now.getTime(), insights, byTitle };
}

/** The distinct titles a set of actions targets — what snapshotBoard needs captured. */
export function targetTitlesOf(actions: ProposedAction[]): string[] {
  return [...new Set(actions.map((a) => a.task).filter((t): t is string => !!t))];
}

type StepExpectation =
  | { metric: 'status'; title: string; want: TaskStatus }
  | { metric: 'absent'; title: string }
  | { metric: 'present'; title: string }
  | { metric: 'priority'; title: string; want: TaskPriority }
  | { metric: 'due_changed'; title: string }
  | { metric: 'overdue_down' };

// Exhaustive over ActionKind, no default case — the compiler flags this the moment
// a 7th ActionKind is added to liveAction.ts without updating it here too. Mirrors
// liveAction.ts's own ACTIONS: Record<ActionKind, ActionSpec> for the same reason.
function expectationFor(action: ProposedAction): StepExpectation {
  switch (action.kind) {
    case 'complete_task':
      return { metric: 'status', title: action.task!, want: 'done' };
    case 'drop_task':
      return { metric: 'absent', title: action.task! };
    case 'create_task':
      return { metric: 'present', title: action.task! };
    case 'set_priority':
      return { metric: 'priority', title: action.task!, want: action.priority! };
    case 'reschedule_task':
      return { metric: 'due_changed', title: action.task! };
    case 'clear_overdue':
      return { metric: 'overdue_down' };
  }
}

export type StepVerdict = { title: string | null; kind: ActionKind; matched: boolean; detail: string };

function checkStep(action: ProposedAction, before: OutcomeSnapshot, after: OutcomeSnapshot): StepVerdict {
  const exp = expectationFor(action);
  switch (exp.metric) {
    case 'status': {
      const got = after.byTitle[exp.title]?.status;
      const matched = got === exp.want;
      return {
        title: exp.title,
        kind: action.kind,
        matched,
        detail: matched ? `"${exp.title}" is now ${exp.want}` : `"${exp.title}" is ${got ?? 'missing'}, expected ${exp.want}`,
      };
    }
    case 'absent': {
      const matched = after.byTitle[exp.title] === undefined;
      return { title: exp.title, kind: action.kind, matched, detail: matched ? `"${exp.title}" is gone` : `"${exp.title}" is still on the board` };
    }
    case 'present': {
      const matched = after.byTitle[exp.title] !== undefined && before.byTitle[exp.title] === undefined;
      return { title: exp.title, kind: action.kind, matched, detail: matched ? `"${exp.title}" was added` : `"${exp.title}" was not found as new` };
    }
    case 'priority': {
      const got = after.byTitle[exp.title]?.priority;
      const matched = got === exp.want;
      return {
        title: exp.title,
        kind: action.kind,
        matched,
        detail: matched ? `"${exp.title}" priority is ${exp.want}` : `"${exp.title}" priority is ${got ?? 'missing'}, expected ${exp.want}`,
      };
    }
    case 'due_changed': {
      const b = before.byTitle[exp.title]?.due_date ?? null;
      const a = after.byTitle[exp.title]?.due_date ?? null;
      const matched = a !== b;
      return {
        title: exp.title,
        kind: action.kind,
        matched,
        detail: matched ? `"${exp.title}" due date moved (${b ?? 'none'} → ${a ?? 'none'})` : `"${exp.title}" due date unchanged`,
      };
    }
    case 'overdue_down': {
      const matched = after.insights.overdue < before.insights.overdue || before.insights.overdue === 0;
      return {
        title: null,
        kind: action.kind,
        matched,
        detail: matched ? `overdue ${before.insights.overdue} → ${after.insights.overdue}` : `overdue stayed at ${after.insights.overdue}`,
      };
    }
  }
}

export type OutcomeVerdict = 'pass' | 'partial' | 'fail';
export type OutcomeReview = { verdict: OutcomeVerdict; score: number; max: number; steps: StepVerdict[]; summary: string };

/**
 * Did an executed plan/action actually do what it said it would? Scores each step
 * against the SAME ActionKind the gate already admitted, on the exact title(s) it
 * named — never a global "the board got better" judgment. Pure, synchronous, no
 * I/O: a test fixture is two literal OutcomeSnapshot objects, exactly like
 * gateAction's tests need no model or store.
 */
export function reviewOutcome(actions: ProposedAction[], before: OutcomeSnapshot, after: OutcomeSnapshot): OutcomeReview {
  const steps = actions.map((a) => checkStep(a, before, after));
  const score = steps.filter((s) => s.matched).length;
  const max = steps.length;
  const verdict: OutcomeVerdict = max === 0 ? 'fail' : score === max ? 'pass' : score === 0 ? 'fail' : 'partial';
  const failed = steps.filter((s) => !s.matched).map((s) => s.detail);
  const summary =
    verdict === 'pass'
      ? `It worked — all ${max} step${max === 1 ? '' : 's'} landed as intended.`
      : verdict === 'fail'
        ? `It didn't take: ${failed.join('; ')}.`
        : `Partly landed (${score}/${max}): ${failed.join('; ')}.`;
  return { verdict, score, max, steps, summary };
}
