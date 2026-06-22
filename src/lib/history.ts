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
