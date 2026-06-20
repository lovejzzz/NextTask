/**
 * The standard. A corpus of realistic utterances with their expected
 * interpretation, plus a scorer. This pins the companion's comprehension to a
 * measurable bar that CI enforces — raising the bar means broadening the parser,
 * not hand-waving "it feels smart".
 */
import { parseIntent, type CompanionIntent } from './companionActions';

export type EvalCase = { text: string; expect: CompanionIntent['kind'] | null };

// Fixed "now" so weekday/date phrases are deterministic.
export const EVAL_NOW = new Date(2026, 5, 20, 9); // Sat Jun 20 2026

export const EVAL_CORPUS: EvalCase[] = [
  // create
  { text: 'add buy groceries', expect: 'create_task' },
  { text: 'create a task to email the designer', expect: 'create_task' },
  { text: 'new urgent task fix the login bug', expect: 'create_task' },
  { text: 'remind me to call mom tomorrow', expect: 'create_task' },
  { text: 'task: write the changelog', expect: 'create_task' },
  { text: 'add prep the deck by friday high priority', expect: 'create_task' },
  // complete
  { text: 'complete the login bug', expect: 'complete_task' },
  { text: 'mark email sam as done', expect: 'complete_task' },
  { text: 'finish the release notes', expect: 'complete_task' },
  { text: 'the deck is done', expect: 'complete_task' },
  { text: 'move onboarding to done', expect: 'complete_task' },
  { text: 'done with the audit', expect: 'complete_task' },
  // delete
  { text: 'delete the old draft', expect: 'delete_task' },
  { text: 'remove the duplicate card', expect: 'delete_task' },
  { text: 'get rid of the spike', expect: 'delete_task' },
  // priority
  { text: 'make the login bug high priority', expect: 'set_priority' },
  { text: 'set the deck to low', expect: 'set_priority' },
  { text: 'the launch email is urgent', expect: 'set_priority' },
  // reschedule
  { text: 'move the deck to friday', expect: 'reschedule' },
  { text: 'reschedule the audit to tomorrow', expect: 'reschedule' },
  { text: 'the report is due monday', expect: 'reschedule' },
  // bulk + undo
  { text: 'clear my overdue', expect: 'complete_overdue' },
  { text: 'complete all overdue', expect: 'complete_overdue' },
  { text: 'knock out the overdue ones', expect: 'complete_overdue' },
  { text: 'undo', expect: 'undo' },
  { text: 'undo that', expect: 'undo' },
  { text: 'nevermind', expect: 'undo' },
  // questions
  { text: "what's next?", expect: 'whats_next' },
  { text: 'next', expect: 'whats_next' },
  { text: 'what should I work on', expect: 'whats_next' },
  { text: 'plan my day', expect: 'plan' },
  { text: "what's the plan", expect: 'plan' },
  { text: 'what is overdue?', expect: 'overdue' },
  { text: 'anything late?', expect: 'overdue' },
  { text: 'how am I doing', expect: 'status' },
  { text: 'my streak', expect: 'status' },
  // passthrough (open conversation → no intent)
  { text: 'you are mean to me', expect: null },
  { text: 'lol ok', expect: null },
  { text: 'i feel overwhelmed today', expect: null },
  { text: 'tell me a joke', expect: null },
];

export function scoreCorpus(corpus: EvalCase[] = EVAL_CORPUS): {
  total: number;
  correct: number;
  accuracy: number;
  misses: EvalCase[];
} {
  const misses: EvalCase[] = [];
  let correct = 0;
  for (const item of corpus) {
    const got = parseIntent(item.text, EVAL_NOW)?.kind ?? null;
    if (got === item.expect) correct += 1;
    else misses.push(item);
  }
  return { total: corpus.length, correct, accuracy: correct / corpus.length, misses };
}
