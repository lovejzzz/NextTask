/**
 * Lets you boss the board around in plain language. A deterministic intent
 * parser (no LLM — reliable and testable) turns chat messages like
 * "add a high-priority task to email Sam by friday" into a structured action,
 * and recognizes a few questions the board can answer from its own data.
 * Anything it doesn't understand falls through to the LLM for open conversation.
 */
import { addDays } from 'date-fns';

import { formatDateInput } from './dates';
import { isExistentialQuestion } from './identity';
import { parseRememberable } from './companionNotes';
import type { TaskPriority } from './types';

export type CompanionIntent =
  | { kind: 'create_task'; title: string; priority: TaskPriority; due_date: string | null }
  | { kind: 'complete_task'; query: string }
  | { kind: 'delete_task'; query: string }
  | { kind: 'set_priority'; query: string; priority: TaskPriority }
  | { kind: 'reschedule'; query: string; due_date: string | null }
  | { kind: 'assign_task'; query: string; assignee: string }
  | { kind: 'label_task'; query: string; label: string }
  | { kind: 'complete_overdue' }
  | { kind: 'undo' }
  | { kind: 'remember'; note: string }
  | { kind: 'recall' }
  | { kind: 'recall_fact'; topic: string }
  | { kind: 'recap' }
  | { kind: 'self_intent' }
  | { kind: 'self_describe' }
  | { kind: 'self_growth' }
  | { kind: 'knowledge'; topic: string }
  | { kind: 'reflect' }
  | { kind: 'remind'; text: string }
  | { kind: 'list_reminders' }
  | { kind: 'self_improve' }
  | { kind: 'self_existential' }
  | { kind: 'plan' }
  | { kind: 'quick_plan' }
  | { kind: 'triage' }
  | { kind: 'quick_win' }
  | { kind: 'risk' }
  | { kind: 'blocked' }
  | { kind: 'ouroboros_backlog' }
  | { kind: 'whats_next' }
  | { kind: 'overdue' }
  | { kind: 'board_shape' }
  | { kind: 'status' };

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function upcomingWeekday(now: Date, target: number): Date {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = ((target - base.getDay() + 7) % 7) || 7; // never "today"
  return addDays(base, delta);
}

function resolveDue(text: string, now: Date): { dueDate: string | null; rest: string } {
  if (/\btoday\b/i.test(text)) return { dueDate: formatDateInput(now), rest: text.replace(/\btoday\b/i, ' ') };
  if (/\btonight\b/i.test(text)) return { dueDate: formatDateInput(now), rest: text.replace(/\btonight\b/i, ' ') };
  if (/\btomorrow\b/i.test(text)) return { dueDate: formatDateInput(addDays(now, 1)), rest: text.replace(/\btomorrow\b/i, ' ') };
  if (/\bnext week\b/i.test(text)) return { dueDate: formatDateInput(addDays(now, 7)), rest: text.replace(/\bnext week\b/i, ' ') };
  const inDays = text.match(/\bin\s+(\d{1,2})\s+days?\b/i);
  if (inDays) return { dueDate: formatDateInput(addDays(now, Number(inDays[1]))), rest: text.replace(inDays[0], ' ') };
  const match = text.match(/\b(?:by|on|next|due)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (match) {
    const date = upcomingWeekday(now, WEEKDAYS.indexOf(match[1].toLowerCase()));
    return { dueDate: formatDateInput(date), rest: text.replace(match[0], ' ') };
  }
  return { dueDate: null, rest: text };
}

const HIGH_WORDS = 'high[-\\s]?priority|top[-\\s]?priority|urgent|asap|critical|important';
const LOW_WORDS = 'low[-\\s]?priority|whenever|someday|sometime|eventually|no rush';

function priorityFromWord(word: string): TaskPriority {
  const w = word.toLowerCase();
  if (w === 'urgent' || w === 'critical' || w === 'important' || w === 'high') return 'high';
  if (w === 'low') return 'low';
  return 'normal';
}

function resolvePriority(text: string): { priority: TaskPriority; rest: string } {
  if (new RegExp(`\\b(${HIGH_WORDS})\\b`, 'i').test(text)) {
    return { priority: 'high', rest: text.replace(new RegExp(`\\b(${HIGH_WORDS})\\b`, 'gi'), ' ') };
  }
  if (new RegExp(`\\b(${LOW_WORDS})\\b`, 'i').test(text)) {
    return { priority: 'low', rest: text.replace(new RegExp(`\\b(${LOW_WORDS})\\b`, 'gi'), ' ') };
  }
  return { priority: 'normal', rest: text };
}

function cleanTitle(text: string): string {
  const title = text
    .replace(/\b(by|on|due|to)\s*$/i, ' ')
    .replace(/^\s*task\b[\s:]*/i, '') // strip a lingering "task" noun first ("urgent task X" → "X")
    .replace(/^\s*(?:to|that|a)\s+/i, '') // then strip leading filler ("task to call X" → "call X")
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\s,;:.!]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : '';
}

function cleanQuery(text: string): string {
  return text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\s,;:.!?]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseIntent(text: string, now: Date = new Date()): CompanionIntent | null {
  // Strip leading pleasantries so "can you add…", "hey, finish…" parse cleanly.
  const raw = text
    .trim()
    .replace(/^(?:hey|ok|okay|yo|so|um|please|pls|can you|could you|would you|will you|let'?s|i'd like (?:you )?to)[,\s]+/i, '')
    .trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (/^(?:undo|revert|nevermind|never mind|take that back|oops|undo that)\b/.test(lower)) {
    return { kind: 'undo' };
  }
  // Tier 3 capability: reminders. "what/show … reminders" lists; "remind me …" sets one.
  if (/\b(?:what (?:are|were) my reminders|show (?:me )?my reminders|list (?:my )?reminders|my reminders)\b/.test(lower)) {
    return { kind: 'list_reminders' };
  }
  // "remind me to/about X" sets a reminder; "remind me what/when/who/… X" is a question,
  // not a reminder — let those fall through to the right query handler.
  if (/^\s*(?:remind me(?!\s+(?:what|when|who|whom|where|why|which|whether|how)\b)|set (?:a |an )?reminder)\b/i.test(raw)) {
    return { kind: 'remind', text: raw };
  }
  // Tier 5: the deepest questions about his nature — answered with calibrated honesty.
  if (isExistentialQuestion(lower)) {
    return { kind: 'self_existential' };
  }
  // Tier 4: autonomous self-improvement — author a new capability through the gate.
  if (
    /\b(?:improve yourself|make yourself better|write yourself (?:a )?(?:tool|capability|skill)|give yourself (?:a )?(?:tool|capability|skill)|teach yourself something|level yourself up|can you (?:improve|upgrade) yourself)\b/.test(
      lower,
    )
  ) {
    return { kind: 'self_improve' };
  }
  // Knowledge his mentor taught him (supervised, from the open web) — "what do you
  // know/think about X", "what have you learned about X". Checked before `recall`
  // (his memory of *you*) and self_growth; the "about me/my…" form is left to recall.
  {
    const know = lower.match(
      /\b(?:what do you know about\s+(.+?)|what have you learned about\s+(.+?)|do you know (?:anything )?about\s+(.+?))[?.!]*$/,
    );
    const topic = (know?.[1] ?? know?.[2] ?? know?.[3] ?? '').trim();
    if (know && topic && !/^(?:me|my|myself)\b/.test(topic)) {
      return { kind: 'knowledge', topic };
    }
  }
  if (/\b(what do you (?:remember|know)(?: about me)?|what did i tell you|what'?s in your memory)\b/.test(lower)) {
    return { kind: 'recall' };
  }
  // Consult his life — what *he* wants, from his own drives (not your backlog).
  if (
    /\b(what do you want(?: to do)?|what'?s on your mind|what would you do|what do you feel like|anything you want to do|your (?:move|call)|what'?re you thinking)\b/.test(
      lower,
    )
  ) {
    return { kind: 'self_intent' };
  }
  // Episodic recap — "what happened", reconstructed from the board's history log.
  if (
    /\b(what (?:happened|changed|did i (?:do|get done|work on))|what have i been (?:up to|doing)|catch me up|recap|my recent (?:activity|history))\b/.test(
      lower,
    )
  ) {
    return { kind: 'recap' };
  }
  // Targeted recall of a single fact, e.g. "what's my deadline", "what am I focusing on".
  let factQ: RegExpMatchArray | null;
  if ((factQ = lower.match(/\bwhat(?:'?s| is| was| are)?\s+my\s+(deadline|focus|goal|priorit(?:y|ies))\b/))) {
    return { kind: 'recall_fact', topic: factQ[1].startsWith('priorit') ? 'priority' : factQ[1] };
  }
  if (/\bwhen(?:'?s| is| was)?\s+my\s+(?:deadline|due date)\b/.test(lower)) {
    return { kind: 'recall_fact', topic: 'deadline' };
  }
  if (/\bwhat am i (?:focusing|working) on\b/.test(lower)) {
    return { kind: 'recall_fact', topic: 'focus' };
  }
  const fact = parseRememberable(raw);
  if (fact) return { kind: 'remember', note: fact };
  if (
    /\b(?:clear|knock out|wipe)\b[^.]*\boverdue(?:\s+(?:ones|tasks|items|stuff))?\s*[?.!]*$/i.test(raw) ||
    /\b(?:complete|finish|close)\s+(?:all\s+|my\s+|the\s+|every\s+)?overdue(?:\s+(?:ones|tasks|items|stuff))?\s*[?.!]*$/i.test(raw)
  ) {
    return { kind: 'complete_overdue' };
  }
  if (
    /\b(quick plan|short on time|in a hurry|i (?:only )?have (?:an hour|a few|a little|some time|\d+\s?min(?:ute)?s?)|if i (?:only )?have (?:an hour|a few|some time|\d+\s?min(?:ute)?s?))\b/.test(
      lower,
    )
  ) {
    return { kind: 'quick_plan' };
  }
  if (/\b(plan (?:my )?day|what'?s the plan|game ?plan|plan for (?:today|the day))\b/.test(lower)) {
    return { kind: 'plan' };
  }
  if (/\b(what should i (?:drop|cut|skip|deprioriti[sz]e|ditch)|what can i (?:drop|cut)|too much on|declutter|trim (?:my|the))\b/.test(lower)) {
    return { kind: 'triage' };
  }
  if (
    /\b(quick win|easy win|something easy|low.?hanging|what can i (?:knock out|finish|do) (?:fast|quickly|in (?:an hour|a few|five|ten)))\b/.test(
      lower,
    )
  ) {
    return { kind: 'quick_win' };
  }
  if (/\b(biggest risk|what(?:'?s| is)? (?:my )?(?:biggest )?(?:risk|worry|concern)|what should i worry|most (?:urgent|pressing))\b/.test(lower)) {
    return { kind: 'risk' };
  }
  if (/\b(what'?s blocked|what am i (?:waiting|blocked) on|any blockers|what'?s stuck|am i blocked|what'?s on hold)\b/.test(lower)) {
    return { kind: 'blocked' };
  }
  if (/\b(your (?:own )?(?:backlog|tickets|queue|upgrades|wishlist)|what have you (?:queued|filed)|what are you (?:working on|building) for yourself|ouroboros (?:status|backlog|queue))\b/.test(lower)) {
    return { kind: 'ouroboros_backlog' };
  }
  // Honest self-description ("what are you / what can you do") — distinct from
  // "what are you working on" (ouroboros_backlog, above) and "what do you want"
  // (self_intent). The negative lookahead keeps activity questions out.
  // What he's noticed about how you work — higher-order patterns from his history,
  // distinct from the current-state board read (board_shape) and the event recap.
  if (
    /\b(?:what have you noticed|notice(?:d)? (?:anything|any patterns?)|any patterns?|what (?:do|have) you (?:notice|see|observe)|what'?s your (?:read|take) on (?:how i|me)|patterns? (?:in|about) (?:my|how i))\b/.test(
      lower,
    )
  ) {
    return { kind: 'reflect' };
  }
  // How he's grown / what he's learned about himself — answered from his growth ledger
  // (a real trail), distinct from "what are you" (self_describe) and "learned about X"
  // (knowledge, above). The negative lookahead keeps "learned about …" out.
  if (
    /\bhow have you (?:grown|changed|developed|improved)\b|\bwhat have you learned\b(?!\s+about)|\bhow are you (?:growing|developing)\b|\bare you getting better\b|\bhow'?s your (?:growth|progress|development)\b/.test(
      lower,
    )
  ) {
    return { kind: 'self_growth' };
  }
  if (
    /\bwhat can you do\b|\bwhat are you\b(?!\s+(?:working|building|doing|up to))|\bwho are you\b|\bhow do you work\b|\bwhat (?:are )?your (?:limits|abilities|capabilities)\b|\bhow do i use you\b/.test(
      lower,
    )
  ) {
    return { kind: 'self_describe' };
  }
  if (/\bwhat'?s next\b/.test(lower) || /^(?:next(?: up| task)?\??|what should i (?:do|work on)\??)$/.test(lower)) {
    return { kind: 'whats_next' };
  }
  if (/\b(overdue|late|behind)\b/.test(lower) && /\b(what|any|anything|show|list|i have|are|is)\b/.test(lower)) {
    return { kind: 'overdue' };
  }
  // Whole-board gestalt ("how's my board", "read the room") — distinct from the
  // numeric status report and checked first so "board" isn't read as progress.
  if (
    /\b(?:how(?:'?s| is| does)?\s+(?:my |the )?board\b|read the room|big picture|what shape (?:is|of)|board shape|the (?:overall|whole) (?:picture|board))/.test(
      lower,
    )
  ) {
    return { kind: 'board_shape' };
  }
  if (/\b(how am i doing|my (?:progress|stats|streak)|how'?s it going|status report|how many)\b/.test(lower)) {
    return { kind: 'status' };
  }

  // Complete / done.
  const completeMatch =
    raw.match(/^(?:complete|finish|close|wrap up|knock out|cross off|check off|ship)\s+(.+)/i) ||
    raw.match(/^(?:i\s+(?:just\s+)?)?(?:finished|completed)\s+(.+)/i) || // past tense: "I finished the report"
    raw.match(/^mark\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed|finished)$/i) ||
    raw.match(/^(?:move|put|drag)\s+(.+?)\s+(?:to|into)\s+done$/i) ||
    raw.match(/^done\s+with\s+(.+)/i) ||
    raw.match(/^(.+?)\s+is\s+(?:done|complete|finished)$/i);
  if (completeMatch) {
    const query = cleanQuery(completeMatch[1].replace(/\s+(?:as\s+)?(?:done|complete|completed|finished)\s*$/i, ''));
    if (query) return { kind: 'complete_task', query };
  }

  // Delete / remove.
  const deleteMatch = raw.match(/^(?:delete|remove|drop|trash|get rid of|scrap|kill|nuke|cancel)\s+(.+)/i);
  if (deleteMatch) {
    const query = cleanQuery(deleteMatch[1]);
    if (query) return { kind: 'delete_task', query };
  }

  // Set priority.
  const priorityMatch =
    raw.match(/^(?:make|set|mark|change|bump)\s+(.+?)\s+(?:to\s+|as\s+)?(high|low|normal|urgent|critical|important)(?:\s*-?\s*priority)?$/i) ||
    raw.match(/^(.+?)\s+(?:is|should be)\s+(high|low|normal|urgent|critical|important)(?:\s+priority)?$/i);
  if (priorityMatch) {
    const query = cleanQuery(priorityMatch[1]);
    if (query) return { kind: 'set_priority', query, priority: priorityFromWord(priorityMatch[2]) };
  }

  // Assign to a teammate.
  const assignMatch = raw.match(/^(?:assign|give)\s+(.+?)\s+to\s+(.+)$/i);
  if (assignMatch) {
    const query = cleanQuery(assignMatch[1]);
    const assignee = cleanQuery(assignMatch[2]);
    if (query && assignee) return { kind: 'assign_task', query, assignee };
  }

  // Label / tag a task.
  let labelMatch = raw.match(/^(?:label|tag)\s+(.+?)\s+(?:as|with)\s+(.+)$/i);
  if (labelMatch) {
    const query = cleanQuery(labelMatch[1]);
    const label = cleanQuery(labelMatch[2]);
    if (query && label) return { kind: 'label_task', query, label };
  }
  labelMatch = raw.match(/^add (?:the )?label\s+(.+?)\s+to\s+(.+)$/i);
  if (labelMatch) {
    const label = cleanQuery(labelMatch[1]);
    const query = cleanQuery(labelMatch[2]);
    if (query && label) return { kind: 'label_task', query, label };
  }

  // Reschedule (only if a date actually resolves).
  const rescheduleMatch =
    raw.match(/^(?:move|reschedule|push|change|set|bump|shift|defer)\s+(.+?)\s+(?:to|due|for|by|until|back to)\s+(.+)$/i) ||
    raw.match(/^(.+?)\s+(?:is\s+)?due\s+(.+)$/i);
  if (rescheduleMatch) {
    const { dueDate } = resolveDue(rescheduleMatch[2], now);
    const query = cleanQuery(rescheduleMatch[1]);
    // Avoid misreading questions like "what is due today" as a reschedule.
    if (dueDate && query && !/^(what|which|when|is|are|any|anything)\b/i.test(query)) {
      return { kind: 'reschedule', query, due_date: dueDate };
    }
  }

  const createMatch =
    raw.match(/^remind me to\s+(.+)/i) ||
    raw.match(/^remember to\s+(.+)/i) ||
    raw.match(/^(?:i need to|i have to|i gotta|gotta|i want to|i should)\s+(.+)/i) ||
    raw.match(/^todo:?\s+(.+)/i) ||
    raw.match(/^jot down\s+(.+)/i) ||
    raw.match(/^put\s+(.+?)\s+on (?:the|my)\s+board$/i) ||
    raw.match(/^task:\s*(.+)/i) ||
    raw.match(/^(?:add|create|make|new|start)\s+(?:a\s+|an\s+)?(?:task\b\s*)?(?:to\s+|called\s+|named\s+|:\s*)?(.+)/i);
  if (createMatch) {
    const { priority, rest: afterPriority } = resolvePriority(createMatch[1]);
    const { dueDate, rest: afterDue } = resolveDue(afterPriority, now);
    const title = cleanTitle(afterDue);
    if (!title) return null;
    return { kind: 'create_task', title, priority, due_date: dueDate };
  }

  return null;
}
