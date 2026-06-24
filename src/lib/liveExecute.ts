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
 * board immediately before the step runs, so the undo restores exactly what was there.
 *
 * Caveat, stated honestly: a dropped task is restored by re-creating it with its prior
 * content (title/status/priority/due date/description). The board content returns, but the
 * new card carries a fresh id — drop is reversible in substance, not in identity.
 */
export async function executePlan(actions: ProposedAction[]): Promise<PlanRun> {
  const undos: Undo[] = [];
  const ranLabels: string[] = [];

  for (const action of actions) {
    const { tasks } = await mockApi.getBoard();

    if (action.kind === 'clear_overdue') {
      const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status));
      const prev = overdue.map((t) => ({ id: t.id, status: t.status }));
      for (const t of overdue) await mockApi.updateTask(t.id, { status: 'done' });
      undos.push(async () => {
        for (const p of prev) await mockApi.updateTask(p.id, { status: p.status });
      });
      ranLabels.push(`clear overdue (${overdue.length})`);
      continue;
    }

    const target = tasks.find((t) => t.title === action.task);
    if (!target) continue; // gate already grounded this; defensive only

    if (action.kind === 'complete_task') {
      const prev = target.status;
      await mockApi.updateTask(target.id, { status: 'done' });
      undos.push(async () => void (await mockApi.updateTask(target.id, { status: prev })));
      ranLabels.push(`complete "${target.title}"`);
    } else if (action.kind === 'reschedule_task') {
      const prev = target.due_date;
      await mockApi.updateTask(target.id, { due_date: addDaysIso(1) });
      undos.push(async () => void (await mockApi.updateTask(target.id, { due_date: prev })));
      ranLabels.push(`reschedule "${target.title}"`);
    } else if (action.kind === 'drop_task') {
      const snap = { title: target.title, description: target.description, status: target.status, priority: target.priority, due_date: target.due_date };
      await mockApi.deleteTask(target.id);
      undos.push(async () => void (await mockApi.createTask(snap)));
      ranLabels.push(`drop "${target.title}"`);
    }
  }

  const undo: Undo = async () => {
    for (const u of [...undos].reverse()) await u();
  };
  return { ranLabels, undo };
}
