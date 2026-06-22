/**
 * The board's history — Boardy's episodic memory, his body's record of its own life.
 *
 * Snapshot reconstruction (recall.ts reading current task state) answers "what is
 * true now", but it can't answer "what happened": an edit buries a ship, only the
 * latest of three reschedules survives, and a created-then-deleted task vanishes
 * without a trace. Those are *events*, and events need an append-only log.
 *
 * Crucially this is still the reconstructive paradigm, one level deeper: an event
 * is an immutable *fact about something that happened to the shared artifact*
 * ("on the 18th, 'Launch' moved todo→done"), not a belief about current state that
 * can drift. A past fact can't rot — it happened. So the log is part of the board's
 * body (its lived history), not a private diary of interpretations. See MEMORY.md.
 *
 * Append-only, deterministic, no LLM. The app records an event on each real board
 * mutation; recall.ts reconstructs episodic memory from the log.
 */
export type BoardEventKind =
  | 'created' // a task was added
  | 'moved' // status advanced (todo → in_progress → in_review)
  | 'completed' // moved into done
  | 'rescheduled' // due date changed
  | 'reprioritized' // priority changed
  | 'dropped'; // task deleted

export type BoardEvent = {
  id: string;
  at: number; // epoch ms — when it happened
  kind: BoardEventKind;
  taskId: string;
  title: string; // the title at the time, so history reads even after the task is gone
  detail?: string; // e.g. "todo → done", "to 2026-06-26", "normal → high"
};

const CAP = 500; // a generous backstop; history is summarized, not replayed in full

/** Build an event (deterministic id from when + what, so identical calls dedupe). */
export function boardEvent(kind: BoardEventKind, task: { id: string; title: string }, detail?: string, at: number = Date.now()): BoardEvent {
  return { id: `${at}-${kind}-${task.id}`, at, kind, taskId: task.id, title: task.title, detail };
}

/** Append an event to the log (append-only; keeps the most recent within the cap). */
export function recordEvent(log: BoardEvent[], event: BoardEvent): BoardEvent[] {
  if (log.some((e) => e.id === event.id)) return log; // idempotent
  return [...log, event].slice(-CAP);
}

const DAY = 86_400_000;

/** The board's *trajectory* — not a snapshot, but where it's heading. */
export type BoardTrend = 'worsening' | 'recovering' | 'steady';

/**
 * Read the trend from history: over the recent window, is work landing faster
 * than it's leaving (worsening), leaving faster than landing (recovering), or
 * holding steady? This is the difference between seeing the board's *shape* and
 * sensing its *direction* — drowning vs digging out look identical in a snapshot.
 */
export function boardTrend(events: BoardEvent[], now: number = Date.now(), windowDays = 7): BoardTrend {
  const since = now - windowDays * DAY;
  let landing = 0; // work arriving
  let leaving = 0; // work resolved
  for (const event of events) {
    if (event.at < since || event.at > now) continue;
    if (event.kind === 'created') landing += 1;
    else if (event.kind === 'completed' || event.kind === 'dropped') leaving += 1;
  }
  const net = landing - leaving; // positive → the pile is growing
  if (net >= 2) return 'worsening';
  if (net <= -2) return 'recovering';
  return 'steady';
}

/** A short trajectory note to append to a board read — empty when steady (no noise). */
export function trendNote(trend: BoardTrend): string {
  if (trend === 'worsening') return ' And it’s been getting heavier lately — more landing than leaving.';
  if (trend === 'recovering') return ' And you’re digging out — clearing faster than new work arrives. Nice.';
  return '';
}

type TaskSnapshot = { id: string; title: string; status: string; due_date: string | null; priority: string };

/**
 * Derive events by *observing* the board's state transitions — diff two snapshots
 * and emit what changed, regardless of what caused it (drag, chat command, card
 * edit). This is the reconstructive stance applied to recording: the history is
 * read off the world's actual changes, not stitched together by instrumenting
 * every mutation call site. One change can yield several events (moved + rescheduled).
 */
export function deriveEvents(prev: TaskSnapshot[], next: TaskSnapshot[], now: number = Date.now()): BoardEvent[] {
  const before = new Map(prev.map((t) => [t.id, t]));
  const after = new Map(next.map((t) => [t.id, t]));
  const events: BoardEvent[] = [];

  for (const task of next) if (!before.has(task.id)) events.push(boardEvent('created', task, undefined, now));
  for (const task of prev) if (!after.has(task.id)) events.push(boardEvent('dropped', task, undefined, now));

  for (const task of next) {
    const was = before.get(task.id);
    if (!was) continue;
    if (was.status !== task.status) {
      events.push(
        task.status === 'done'
          ? boardEvent('completed', task, `${was.status} → done`, now)
          : boardEvent('moved', task, `${was.status} → ${task.status}`, now),
      );
    }
    if ((was.due_date ?? null) !== (task.due_date ?? null)) {
      events.push(boardEvent('rescheduled', task, task.due_date ? `to ${task.due_date}` : 'cleared the due date', now));
    }
    if (was.priority !== task.priority) {
      events.push(boardEvent('reprioritized', task, `${was.priority} → ${task.priority}`, now));
    }
  }
  return events;
}
