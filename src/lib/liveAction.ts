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

// ── Growing himself ────────────────────────────────────────────────────────────
//
// The deepest rung: the brain authors a NEW capability for itself — a named skill that
// composes audited primitives — and runs it through the EXISTING self-author gate
// (selfauthor.ts), the same authority that already admits skills learned from repeated
// user commands. The brain proposes; the gate validates every step through the real
// parser, demands a genuine (≥2-step) novel composition; the human says yes. We add only
// the tool that lets the brain *speak* a proposal — the judging machinery is reused, not
// rebuilt, so a self-authored skill is held to exactly the same bar as any other.

/** The tool the brain calls to give itself a new capability. */
export const SKILL_TOOL = {
  type: 'function',
  function: {
    name: 'propose_skill',
    description:
      'Propose a NEW named capability for yourself: a composition of at least two steps, ' +
      'where each step is a plain command you already understand (e.g. "plan my day", ' +
      "\"what's overdue\", \"what should I drop\"). It only sticks if the gate validates " +
      'every step and the human keeps it. Propose one only when you notice a routine worth crystallizing.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'a short, novel name for the skill' },
        steps: { type: 'array', items: { type: 'string' }, description: 'ordered plain-language commands' },
        rationale: { type: 'string', description: 'why this is worth having as one capability' },
      },
      required: ['name', 'steps'],
    },
  },
} as const;

/** A self-authored skill the brain asked for (the parsed tool-call args), or null. */
export function readSkill(args: Record<string, unknown>): { name: string; steps: string[]; rationale: string } | null {
  const name = typeof args.name === 'string' ? args.name : '';
  const steps = Array.isArray(args.steps) ? args.steps.filter((s): s is string => typeof s === 'string') : [];
  if (!name.trim() || steps.length === 0) return null;
  const rationale = typeof args.rationale === 'string' ? args.rationale : `I keep doing ${steps.join(' → ')} by hand.`;
  return { name, steps, rationale };
}

// ── Multi-step plans (rung 6) ────────────────────────────────────────────────────
//
// The brain composes several board actions into ONE reviewable sequence. This adds reach
// — a sequence reviewed together — but introduces no new authority: a plan is just actions,
// and every step is run through the SAME gateAction it would face alone, against the same
// board. The plan is admitted only if every step is admitted; the human accepts or rejects
// the whole sequence; each executed step stays individually reversible. A brain can't smuggle
// an invented task in by burying it in a list — one ungrounded step holds the entire plan.

/** A plan the model asked for: an ordered list of actions plus why the sequence hangs together. */
export type ProposedPlan = { steps: ProposedAction[]; rationale: string };

/** The tool the brain is offered to propose a sequence of board changes at once. */
export const PLAN_TOOL = {
  type: 'function',
  function: {
    name: 'propose_plan',
    description:
      'Propose an ORDERED sequence of at least two safe, reversible board actions for the human ' +
      'to accept or dismiss as one plan. Each step is shaped exactly like propose_board_action ' +
      '(kind + verbatim board title). Use this only when several changes belong together; for a ' +
      'single change use propose_board_action. Never invent a task in any step.',
    parameters: {
      type: 'object',
      properties: {
        rationale: { type: 'string', description: 'one line on why these steps belong together' },
        steps: {
          type: 'array',
          description: 'the ordered actions',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ACTION_KINDS, description: 'which action' },
              task: { type: 'string', description: 'exact existing board title (omit for clear_overdue)' },
              reason: { type: 'string', description: 'one short, honest justification' },
            },
            required: ['kind'],
          },
        },
      },
      required: ['steps'],
    },
  },
} as const;

/** Coerce loosely-typed tool-call args into a ProposedPlan, or null if unusable. */
export function readPlan(args: Record<string, unknown>): ProposedPlan | null {
  if (!Array.isArray(args.steps)) return null;
  const steps = args.steps
    .map((s) => (s && typeof s === 'object' ? readAction(s as Record<string, unknown>) : null))
    .filter((a): a is ProposedAction => a !== null);
  if (steps.length === 0) return null;
  const rationale = typeof args.rationale === 'string' ? args.rationale : 'a few changes that belong together';
  return { steps, rationale };
}

/** A gated plan: the per-step verdicts, and the resolved actions when (and only when) admitted. */
export type PlanGateResult = {
  admitted: boolean;
  reasons: string[];
  /** Per-step verdicts in order, each the full ActionGateResult from the shared gate. */
  steps: ActionGateResult[];
  /** Present only when admitted: every step's action, tasks normalized to exact board titles. */
  actions?: ProposedAction[];
};

/**
 * The admission gate for a plan. It introduces no new rule: it runs the EXISTING gateAction
 * on every step against the same board, and admits the plan only if it is a genuine sequence
 * (≥2 steps) AND every step is independently admitted. One ungrounded or irreversible step
 * holds the whole plan — the brain can't bury an invented task in a list. On admit, every
 * step's task is normalized to the board's exact title, exactly as a single action is.
 */
export function gatePlan(plan: ProposedPlan | null, board: ActionBoard): PlanGateResult {
  if (!plan || plan.steps.length === 0) return { admitted: false, reasons: ['no valid plan proposed'], steps: [] };
  const steps = plan.steps.map((step) => gateAction(step, board));
  const reasons: string[] = [];

  if (plan.steps.length < 2) reasons.push('a plan needs at least two steps; for one change, propose a single action');
  steps.forEach((s, i) => {
    if (!s.admitted) reasons.push(`step ${i + 1} held: ${s.reasons.join('; ')}`);
  });

  const admitted = plan.steps.length >= 2 && steps.every((s) => s.admitted);
  if (!admitted) return { admitted, reasons, steps };

  const actions = steps.map((s) => s.action!);
  reasons.unshift(`all ${actions.length} steps grounded and reversible`);
  return { admitted, reasons, steps, actions };
}

/** A first-person account of a plan verdict, for the chat + glass-box trail. */
export function explainPlan(plan: ProposedPlan, result: PlanGateResult): string {
  if (result.admitted) {
    const seq = result.actions!.map((a) => toProposal(a).undoLabel).join(' → ');
    return `Here's a plan — ${plan.rationale}: ${seq}. ${result.reasons[0]}. Accept the whole thing, or dismiss it.`;
  }
  return `I drafted a plan (${plan.rationale}), but the gate held it: ${result.reasons.join('; ')}. The whole plan waits until every step is clean.`;
}
