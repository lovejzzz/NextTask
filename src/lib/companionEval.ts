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
  // create — many phrasings
  { text: 'add buy groceries', expect: 'create_task' },
  { text: 'create a task to email the designer', expect: 'create_task' },
  { text: 'new urgent task fix the login bug', expect: 'create_task' },
  { text: 'remind me to call mom tomorrow', expect: 'create_task' },
  { text: 'task: write the changelog', expect: 'create_task' },
  { text: 'add prep the deck by friday high priority', expect: 'create_task' },
  { text: 'i need to renew the domain', expect: 'create_task' },
  { text: 'i have to file taxes by next week', expect: 'create_task' },
  { text: 'gotta water the plants', expect: 'create_task' },
  { text: 'todo: refactor the parser', expect: 'create_task' },
  { text: 'jot down review the contract', expect: 'create_task' },
  { text: 'put call the bank on the board', expect: 'create_task' },
  { text: 'can you add a task to book flights', expect: 'create_task' },
  { text: "let's add update the readme", expect: 'create_task' },
  { text: 'i should email the investors tomorrow', expect: 'create_task' },
  { text: 'remember to call mom', expect: 'create_task' }, // reminder = task, not note
  // complete
  { text: 'complete the login bug', expect: 'complete_task' },
  { text: 'mark email sam as done', expect: 'complete_task' },
  { text: 'finish the release notes', expect: 'complete_task' },
  { text: 'the deck is done', expect: 'complete_task' },
  { text: 'move onboarding to done', expect: 'complete_task' },
  { text: 'done with the audit', expect: 'complete_task' },
  { text: 'wrap up the migration', expect: 'complete_task' },
  { text: 'knock out the standup notes', expect: 'complete_task' },
  { text: 'cross off buy milk', expect: 'complete_task' },
  { text: 'check off the survey', expect: 'complete_task' },
  { text: 'hey, finish the onboarding flow', expect: 'complete_task' },
  // delete
  { text: 'delete the old draft', expect: 'delete_task' },
  { text: 'remove the duplicate card', expect: 'delete_task' },
  { text: 'get rid of the spike', expect: 'delete_task' },
  { text: 'scrap the prototype', expect: 'delete_task' },
  { text: 'kill the legacy migration', expect: 'delete_task' },
  { text: 'cancel the offsite planning', expect: 'delete_task' },
  // priority
  { text: 'make the login bug high priority', expect: 'set_priority' },
  { text: 'set the deck to low', expect: 'set_priority' },
  { text: 'the launch email is urgent', expect: 'set_priority' },
  { text: 'bump the audit to high', expect: 'set_priority' },
  { text: 'the billing fix is critical', expect: 'set_priority' },
  { text: 'mark the readme as low priority', expect: 'set_priority' },
  // reschedule
  { text: 'move the deck to friday', expect: 'reschedule' },
  { text: 'reschedule the audit to tomorrow', expect: 'reschedule' },
  { text: 'the report is due monday', expect: 'reschedule' },
  { text: 'push the launch to next week', expect: 'reschedule' },
  { text: 'defer the cleanup to friday', expect: 'reschedule' },
  { text: 'bump the review to tomorrow', expect: 'reschedule' },
  { text: 'move the sync to in 3 days', expect: 'reschedule' },
  // bulk + undo
  { text: 'clear my overdue', expect: 'complete_overdue' },
  { text: 'complete all overdue', expect: 'complete_overdue' },
  { text: 'knock out the overdue ones', expect: 'complete_overdue' },
  { text: 'wipe out everything overdue', expect: 'complete_overdue' },
  { text: 'undo', expect: 'undo' },
  { text: 'undo that', expect: 'undo' },
  { text: 'nevermind', expect: 'undo' },
  { text: 'oops take that back', expect: 'undo' },
  // adaptive reasoning
  { text: 'what should I drop?', expect: 'triage' },
  { text: 'I have too much on my plate', expect: 'triage' },
  { text: 'what can I cut', expect: 'triage' },
  { text: 'help me declutter', expect: 'triage' },
  { text: "what's a quick win?", expect: 'quick_win' },
  { text: 'something easy', expect: 'quick_win' },
  { text: 'what can I knock out fast', expect: 'quick_win' },
  { text: 'give me a low-hanging fruit', expect: 'quick_win' },
  { text: "what's my biggest risk?", expect: 'risk' },
  { text: 'what should I worry about', expect: 'risk' },
  { text: "what's most urgent", expect: 'risk' },
  { text: "what's my biggest concern", expect: 'risk' },
  // blocked / context
  { text: "what's blocked?", expect: 'blocked' },
  { text: 'what am I waiting on', expect: 'blocked' },
  { text: 'any blockers?', expect: 'blocked' },
  // long-term notes
  { text: 'remember that the launch is friday', expect: 'remember' },
  { text: "I'm focusing on the redesign", expect: 'remember' },
  { text: 'fyi the client hates blue', expect: 'remember' },
  { text: 'note the staging server is flaky', expect: 'remember' },
  { text: 'my goal is ship v2', expect: 'remember' },
  { text: 'what do you remember about me', expect: 'recall' },
  { text: 'what did I tell you', expect: 'recall' },
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
  { text: 'how many have I shipped', expect: 'status' },
  // passthrough (open conversation → no intent)
  { text: 'you are mean to me', expect: null },
  { text: 'lol ok', expect: null },
  { text: 'i feel overwhelmed today', expect: null },
  { text: 'tell me a joke', expect: null },
  { text: 'thanks, you helped a lot', expect: null },
  { text: 'why is the sky blue', expect: null },
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
