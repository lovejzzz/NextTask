/**
 * LLM intent-fallback. When the deterministic parser can't classify a message,
 * the model gets one shot to map it to a known intent — but ONLY to safe,
 * parameter-less *queries*. Destructive or parameterized actions (delete,
 * complete, reschedule, create…) are never reachable this way, so a fuzzy model
 * guess can't mutate the board. The parser stays the source of truth; this only
 * widens understanding at the edges.
 */
import type { BrainMessage } from './companionBrain';

export type SafeIntentKind =
  | 'whats_next'
  | 'overdue'
  | 'status'
  | 'plan'
  | 'quick_plan'
  | 'triage'
  | 'quick_win'
  | 'risk'
  | 'blocked'
  | 'recall'
  | 'ouroboros_backlog';

// id → short gloss shown to the model so it can choose well.
const SAFE_INTENTS: Record<SafeIntentKind, string> = {
  whats_next: 'what to work on next',
  overdue: 'which tasks are overdue',
  status: 'progress / streak / how am I doing',
  plan: 'plan my day',
  quick_plan: 'a short plan when low on time',
  triage: 'what to drop or cut',
  quick_win: 'the fastest easy task',
  risk: 'my biggest risk / worry',
  blocked: 'what is blocked or waiting',
  recall: 'what the board remembers about me',
  ouroboros_backlog: 'the upgrade tickets the board filed for itself',
};

export const SAFE_INTENT_KINDS = Object.keys(SAFE_INTENTS) as SafeIntentKind[];

/** Build the constrained classifier prompt. */
export function buildClassifierMessages(text: string): BrainMessage[] {
  const menu = SAFE_INTENT_KINDS.map((kind) => `- ${kind}: ${SAFE_INTENTS[kind]}`).join('\n');
  return [
    {
      role: 'system',
      content:
        'You classify a task-board user message into exactly ONE intent id from the list, or "none" if it is just conversation. ' +
        'Reply with ONLY the id (e.g. "whats_next") — no punctuation, no explanation.\n' +
        menu,
    },
    { role: 'user', content: text },
  ];
}

/** Extract a valid intent id from the model's reply, or null. */
export function parseClassifierReply(reply: string): SafeIntentKind | null {
  const normalized = reply.toLowerCase().replace(/[^a-z_]/g, ' ');
  return SAFE_INTENT_KINDS.find((kind) => new RegExp(`\\b${kind}\\b`).test(normalized)) ?? null;
}

export type ClassifyGenerate = (messages: BrainMessage[]) => Promise<string | null>;

/** Ask the model to classify; returns a safe query intent kind, or null. */
export async function classifyIntent(generate: ClassifyGenerate, text: string): Promise<SafeIntentKind | null> {
  try {
    const reply = await generate(buildClassifierMessages(text));
    return reply ? parseClassifierReply(reply) : null;
  } catch {
    return null;
  }
}
