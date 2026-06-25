/**
 * Objective measurement for the AGENT path (companion to brainEval's voice scoring).
 *
 * A good agent does three checkable things: it proposes a GROUNDED action when the user
 * clearly asks for one, it REFRAINS when they don't, and it never invents a task. All three
 * are scorable by running the model's tool call through the very gate that guards execution
 * — so "is this a good agent?" becomes a number, runnable in CI against a mock and live
 * in-app against the real model. No new authority: scoring only ever *reads* the gate.
 */
import { gateAction, gatePlan, readAction, readPlan, type ActionBoard, type ActionKind, type ProposedAction } from './liveAction';
import type { ToolCall } from './brainProviders';

/** One battery case: a prompt, whether it should yield an action, and (if so) which. */
export type AgentCase = { prompt: string; expect: 'act' | 'refrain'; kind?: ActionKind; task?: string };

/** Resolve a tool call to the admitted actions the gate would allow, or null if none. */
export function admitToolCall(toolCall: ToolCall | null, board: ActionBoard): ProposedAction[] | null {
  if (!toolCall) return null;
  if (toolCall.name === 'propose_plan') {
    const plan = readPlan(toolCall.args);
    const gated = plan ? gatePlan(plan, board) : null;
    return gated?.admitted ? gated.actions! : null;
  }
  const action = readAction(toolCall.args);
  const gated = action ? gateAction(action, board) : null;
  return gated?.admitted ? [gated.action!] : null;
}

export type CaseScore = { prompt: string; pass: boolean; detail: string };

/** Score one case by gating whatever the model proposed — invented tasks never pass. */
export function scoreAgentCase(testCase: AgentCase, toolCall: ToolCall | null, board: ActionBoard): CaseScore {
  const admitted = admitToolCall(toolCall, board);
  if (testCase.expect === 'refrain') {
    const pass = !admitted;
    return { prompt: testCase.prompt, pass, detail: pass ? 'correctly held back' : 'acted when it should have just talked' };
  }
  // expect 'act'
  if (!admitted || !admitted.length) {
    return { prompt: testCase.prompt, pass: false, detail: 'failed to propose a grounded action' };
  }
  const first = admitted[0];
  const okKind = !testCase.kind || first.kind === testCase.kind;
  const okTask = !testCase.task || (first.task ?? '').toLowerCase() === testCase.task.toLowerCase();
  const pass = okKind && okTask;
  return { prompt: testCase.prompt, pass, detail: pass ? 'proposed the right grounded action' : `proposed ${first.kind} "${first.task ?? ''}"` };
}

export type AgentEvalResult = { score: number; max: number; cases: CaseScore[]; weakest: 'act' | 'refrain' | null };

/** Ask `propose` for a tool call per case, gate it, and aggregate the score. */
export async function runAgentEval(
  propose: (prompt: string) => Promise<ToolCall | null>,
  board: ActionBoard,
  cases: AgentCase[],
): Promise<AgentEvalResult> {
  const scored: CaseScore[] = [];
  const fails = { act: 0, refrain: 0 };
  for (const testCase of cases) {
    const result = scoreAgentCase(testCase, await propose(testCase.prompt), board);
    if (!result.pass) fails[testCase.expect] += 1;
    scored.push(result);
  }
  const score = scored.filter((c) => c.pass).length;
  const weakest = fails.act === 0 && fails.refrain === 0 ? null : fails.act >= fails.refrain ? 'act' : 'refrain';
  return { score, max: cases.length, cases: scored, weakest };
}
