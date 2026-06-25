/**
 * Rung 6, follow-through — an admitted plan actually moves the board, reversibly, as a
 * unit. This mirrors rung 4's single-action wiring (liveAction.execute.test.ts), but for a
 * sequence: it runs each gated step in order through the SAME real store the app uses
 * (mockApi over localStorage), capturing a precise inverse per step, and returns ONE undo
 * that reverses the whole plan in reverse order. The human accepted the sequence as a unit;
 * the sequence undoes as a unit.
 *
 * No new authority: only already-admitted actions (tasks normalized to exact board titles by
 * gatePlan) are ever passed here. The executor never resolves titles or invents work — it
 * only applies what the gate already cleared.
 */
import { mockApi } from './mockApi';
import type { ProposedAction } from './liveAction';

type Undo = () => Promise<void>;

/** The result of running a plan: the human-readable labels of what ran, and the unit undo. */
export type PlanRun = { ranLabels: string[]; undo: Undo };

/**
 * One reversible step: a thunk that performs its side effect and returns its own label +
 * inverse, or null to record nothing (a defensively-skipped step). Returning the label/undo
 * from the thunk lets a step compute them at run time (e.g. "clear overdue (3)").
 */
export type ReversibleStep = () => Promise<{ label: string; undo: Undo } | null>;

/**
 * Run a sequence of reversible steps in order, capturing each step's inverse as it runs, and
 * return ONE undo that reverses them all (reverse order). If a step throws, every step already
 * applied is rolled back (reverse order, best-effort) before the error is rethrown — a
 * half-applied plan never survives. Pure with respect to the store: each step encapsulates its
 * own side effect and returns its inverse, so the orchestrator is unit-tested with plain stubs
 * and reused by both the mockApi executor below and the app's mutation-backed wiring.
 */
export async function runReversibleSteps(steps: ReversibleStep[]): Promise<PlanRun> {
  const undos: Undo[] = [];
  const ranLabels: string[] = [];
  try {
    for (const step of steps) {
      const result = await step();
      if (!result) continue; // skipped — record nothing
      undos.push(result.undo);
      ranLabels.push(result.label);
    }
  } catch (err) {
    // Mid-sequence failure: reverse everything already applied, then rethrow.
    for (const undo of [...undos].reverse()) {
      try {
        await undo();
      } catch {
        // best-effort rollback — one failed inverse must not abort the rest
      }
    }
    throw err;
  }
  const undo: Undo = async () => {
    for (const u of [...undos].reverse()) await u();
  };
  return { ranLabels, undo };
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isOverdue(due: string | null, status: string): boolean {
  return !!due && new Date(due) < new Date() && status !== 'done';
}

/**
 * Execute an admitted plan's steps in order against the real store, returning a single undo
 * that reverses every step (in reverse order). Each step's inverse is captured from the live
 * board immediately before the step runs, so the undo restores exactly what was there. A
 * mid-plan failure rolls back what already ran (via {@link runReversibleSteps}).
 *
 * Caveat, stated honestly: a dropped task is restored by re-creating it with its prior
 * content (title/status/priority/due date/description). The board content returns, but the
 * new card carries a fresh id — drop is reversible in substance, not in identity.
 */
export async function executePlan(actions: ProposedAction[]): Promise<PlanRun> {
  return runReversibleSteps(
    actions.map((action) => async () => {
      const { tasks } = await mockApi.getBoard();

      if (action.kind === 'clear_overdue') {
        const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status));
        const prev = overdue.map((t) => ({ id: t.id, status: t.status }));
        for (const t of overdue) await mockApi.updateTask(t.id, { status: 'done' });
        return {
          label: `clear overdue (${overdue.length})`,
          undo: async () => {
            for (const p of prev) await mockApi.updateTask(p.id, { status: p.status });
          },
        };
      }

      if (action.kind === 'create_task') {
        const title = action.task?.trim();
        if (!title) return null;
        const created = await mockApi.createTask({ title, status: 'todo' });
        return { label: `add "${title}"`, undo: async () => void (await mockApi.deleteTask(created.id)) };
      }

      const target = tasks.find((t) => t.title === action.task);
      if (!target) return null; // gate already grounded this; defensive only

      if (action.kind === 'complete_task') {
        const prev = target.status;
        await mockApi.updateTask(target.id, { status: 'done' });
        return { label: `complete "${target.title}"`, undo: async () => void (await mockApi.updateTask(target.id, { status: prev })) };
      }
      if (action.kind === 'reschedule_task') {
        const prev = target.due_date;
        const due = action.due_date ?? addDaysIso(1);
        await mockApi.updateTask(target.id, { due_date: due });
        return { label: `reschedule "${target.title}"`, undo: async () => void (await mockApi.updateTask(target.id, { due_date: prev })) };
      }
      if (action.kind === 'set_priority' && action.priority) {
        const prev = target.priority;
        await mockApi.updateTask(target.id, { priority: action.priority });
        return { label: `reprioritize "${target.title}"`, undo: async () => void (await mockApi.updateTask(target.id, { priority: prev })) };
      }
      // drop_task
      const snap = { title: target.title, description: target.description, status: target.status, priority: target.priority, due_date: target.due_date };
      await mockApi.deleteTask(target.id);
      return { label: `drop "${target.title}"`, undo: async () => void (await mockApi.createTask(snap)) };
    }),
  );
}
