/**
 * liveAction (experimental) — Boardy's hand.
 *
 * The brain's authority used to stop at *understanding*: it could classify a message
 * into a safe, read-only query (see intentFallback), but it could never move the board.
 * Mutations belonged to the deterministic parser alone, so a fuzzy model guess could
 * never silently change your work.
 *
 * This module lets the brain *propose* a parameterized mutation — without breaking that
 * invariant. A proposed action is not an executed one. It must pass {@link gateAction}
 * (which, like the self-author gate, is the authority that replaces supervision), it is
 * surfaced as a {@link toProposal} card the human accepts or dismisses, and every kind
 * here maps to an already-audited, already-undoable primitive in the app. The brain
 * gains a hand; the gate and your "yes" still own the board.
 */

/** The safe, reversible mutations the brain may propose. Each maps to an audited primitive. */
export type ActionKind = 'complete_task' | 'reschedule_task' | 'drop_task' | 'clear_overdue';

/** A structured action the model asked for (the parsed tool-call arguments). */
export type ProposedAction = {
  kind: ActionKind;
  task?: string; // exact board title the action targets (omitted for clear_overdue)
  reason?: string; // the brain's one-line justification, shown on the card
};

type ActionSpec = {
  needsTask: boolean;
  /** The real, audited intent kind this proposal would route to on accept. */
  primitive: 'complete' | 'reschedule' | 'delete' | 'clear_overdue';
  /** How the undoable card reads, given the resolved exact title. */
  card: (title: string, reason?: string) => string;
  undo: (title: string) => string;
};

const ACTIONS: Record<ActionKind, ActionSpec> = {
  complete_task: {
    needsTask: true,
    primitive: 'complete',
    card: (t, r) => `Mark "${t}" done${r ? ` — ${r}` : ''}? You decide; it undoes.`,
    undo: (t) => `complete "${t}"`,
  },
  reschedule_task: {
    needsTask: true,
    primitive: 'reschedule',
    card: (t, r) => `Push "${t}" to a new day${r ? ` — ${r}` : ''}? Your call, and reversible.`,
    undo: (t) => `reschedule "${t}"`,
  },
  drop_task: {
    needsTask: true,
    primitive: 'delete',
    card: (t, r) => `Drop "${t}" off the board${r ? ` — ${r}` : ''}? Only if you say so — and you can undo.`,
    undo: (t) => `delete "${t}"`,
  },
  clear_overdue: {
    needsTask: false,
    primitive: 'clear_overdue',
    card: (_t, r) => `Clear the overdue pile${r ? ` — ${r}` : ''}? One yes, and it all undoes.`,
    undo: () => `clear overdue`,
  },
};

export const ACTION_KINDS = Object.keys(ACTIONS) as ActionKind[];

/** The OpenAI-compatible tool the brain is offered. One tool, a closed set of safe kinds. */
export const BOARD_ACTION_TOOL = {
  type: 'function',
  function: {
    name: 'propose_board_action',
    description:
      'Propose ONE safe, reversible change to the board for the human to accept or dismiss. ' +
      'Never invent a task: `task` must be copied verbatim from a title that exists on the board. ' +
      'Only propose when the conversation clearly calls for an action; otherwise just talk.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ACTION_KINDS, description: 'which action' },
        task: { type: 'string', description: 'exact existing board title (omit for clear_overdue)' },
        reason: { type: 'string', description: 'one short, honest justification' },
      },
      required: ['kind'],
    },
  },
} as const;

/** What the gate knows about the board it's protecting. */
export type ActionBoard = { titles: string[]; overdue: number };

export type ActionGateResult = {
  admitted: boolean;
  reasons: string[];
  /** Present only when admitted: the action with its task resolved to the EXACT board title. */
  action?: ProposedAction;
};

/** Coerce loosely-typed tool-call args into a ProposedAction, or null if unusable. */
export function readAction(args: Record<string, unknown>): ProposedAction | null {
  const kind = args.kind;
  if (typeof kind !== 'string' || !ACTION_KINDS.includes(kind as ActionKind)) return null;
  const action: ProposedAction = { kind: kind as ActionKind };
  if (typeof args.task === 'string') action.task = args.task;
  if (typeof args.reason === 'string') action.reason = args.reason;
  return action;
}

/**
 * The admission gate for actions. Admits a proposal only if its kind is known, its task
 * (when the kind needs one) names a title that ACTUALLY EXISTS on the board — enforcing
 * "never invent a task" at the action layer, exactly as the voice prompt enforces it for
 * words — and, for clear_overdue, there is actually something overdue to clear. Reasons
 * are returned either way, in the open. On admit, the task is normalized to the board's
 * exact title so what executes is never the model's paraphrase.
 */
export function gateAction(action: ProposedAction | null, board: ActionBoard): ActionGateResult {
  if (!action) return { admitted: false, reasons: ['no valid action proposed'] };
  const spec = ACTIONS[action.kind];
  const reasons: string[] = [];

  let resolvedTitle: string | undefined;
  if (spec.needsTask) {
    if (!action.task?.trim()) {
      reasons.push('action needs a task but none was named');
    } else {
      resolvedTitle = board.titles.find((t) => t.toLowerCase() === action.task!.trim().toLowerCase());
      if (!resolvedTitle) reasons.push(`"${action.task}" is not a task on the board — I won't invent one`);
    }
  }
  if (action.kind === 'clear_overdue' && board.overdue <= 0) reasons.push('nothing is overdue right now');

  const admitted = reasons.length === 0;
  if (!admitted) return { admitted, reasons };

  reasons.unshift(spec.needsTask ? `grounded in "${resolvedTitle}", reversible` : 'reversible, and there is overdue work');
  return { admitted, reasons, action: { ...action, task: resolvedTitle } };
}

/** An admitted action as the human-consent card + undo label the app already speaks. */
export function toProposal(action: ProposedAction): { primitive: ActionSpec['primitive']; summary: string; undoLabel: string } {
  const spec = ACTIONS[action.kind];
  const title = action.task ?? '';
  return { primitive: spec.primitive, summary: spec.card(title, action.reason), undoLabel: spec.undo(title) };
}
