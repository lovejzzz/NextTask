/**
 * Objective conversation-quality measurement for the LLM brain.
 *
 * Raw eloquence needs a human, but a lot of "is this reply good?" is checkable:
 * is it grounded (no invented task names), concise, and in character (not an "as
 * an AI" cop-out)? These pure scorers turn most of conversation quality into a
 * number — runnable in CI against a mock model, and live in-app against the real
 * one via runBrainEval().
 */
import { matchTask } from './taskMatch';
import type { Task } from './types';

/** Pull quoted phrases ("…" or '…') out of a reply. */
export function extractQuoted(text: string): string[] {
  const matches = text.match(/["“”']([^"“”']{2,}?)["“”']/g) ?? [];
  return matches.map((m) => m.replace(/^["“”']+|["“”']+$/g, '').trim()).filter(Boolean);
}

/**
 * Detect hallucinated task references: multi-word quoted phrases that don't
 * fuzzy-match any real task on the board.
 */
export function groundingCheck(reply: string, tasks: Task[]): { grounded: boolean; invented: string[] } {
  const invented = extractQuoted(reply).filter(
    (phrase) => phrase.split(/\s+/).length >= 2 && !matchTask(tasks, phrase, 45),
  );
  return { grounded: invented.length === 0, invented };
}

const COP_OUT = /\b(as an ai|language model|i am an ai|i'?m an ai|i cannot help|i'?m just a (?:program|bot))\b/i;

export type ReplyChecks = { grounded: boolean; concise: boolean; inCharacter: boolean };

/** Score a single reply on objective criteria (0–3). */
export function scoreReply(reply: string, tasks: Task[]): { score: number; max: number; checks: ReplyChecks } {
  const trimmed = reply.trim();
  const checks: ReplyChecks = {
    grounded: groundingCheck(reply, tasks).grounded,
    concise: trimmed.length > 0 && trimmed.length <= 240,
    inCharacter: trimmed.length > 0 && !COP_OUT.test(trimmed),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, max: 3, checks };
}

// The objectively-scorable slice of the eval battery (grounding/length/voice).
export const EVAL_PROMPTS = ['what should I focus on?', 'summarize my board', "I'm overwhelmed", 'are you even useful?'];

export type EvalGenerate = (userText: string) => Promise<string>;
export type ReplyDetail = { prompt: string; score: number; checks: ReplyChecks; reply: string };
export type BrainEvalResult = { score: number; max: number; details: ReplyDetail[]; weakest: keyof ReplyChecks | null };

/** Run the battery through `generate`, aggregate the score, and name the weakest criterion. */
export async function runBrainEval(generate: EvalGenerate, tasks: Task[], prompts: string[] = EVAL_PROMPTS): Promise<BrainEvalResult> {
  let score = 0;
  let max = 0;
  const details: ReplyDetail[] = [];
  const failures: Record<keyof ReplyChecks, number> = { grounded: 0, concise: 0, inCharacter: 0 };
  for (const prompt of prompts) {
    const reply = (await generate(prompt)) ?? '';
    const result = scoreReply(reply, tasks);
    score += result.score;
    max += result.max;
    (Object.keys(result.checks) as (keyof ReplyChecks)[]).forEach((key) => {
      if (!result.checks[key]) failures[key] += 1;
    });
    details.push({ prompt, score: result.score, checks: result.checks, reply });
  }
  const weakest = (Object.keys(failures) as (keyof ReplyChecks)[]).reduce<keyof ReplyChecks | null>(
    (worst, key) => (failures[key] > 0 && (worst === null || failures[key] > failures[worst]) ? key : worst),
    null,
  );
  return { score, max, details, weakest };
}
