/**
 * Lets you boss the board around in plain language. A deterministic intent
 * parser (no LLM — reliable and testable) turns chat messages like
 * "add a high-priority task to email Sam by friday" into a structured action,
 * and recognizes a few questions the board can answer from its own data.
 * Anything it doesn't understand falls through to the LLM for open conversation.
 */
import { addDays } from 'date-fns';

import { formatDateInput } from './dates';
import type { TaskPriority } from './types';

export type CompanionIntent =
  | { kind: 'create_task'; title: string; priority: TaskPriority; due_date: string | null }
  | { kind: 'complete_task'; query: string }
  | { kind: 'delete_task'; query: string }
  | { kind: 'set_priority'; query: string; priority: TaskPriority }
  | { kind: 'reschedule'; query: string; due_date: string | null }
  | { kind: 'complete_overdue' }
  | { kind: 'undo' }
  | { kind: 'plan' }
  | { kind: 'whats_next' }
  | { kind: 'overdue' }
  | { kind: 'status' };

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function upcomingWeekday(now: Date, target: number): Date {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = ((target - base.getDay() + 7) % 7) || 7; // never "today"
  return addDays(base, delta);
}

function resolveDue(text: string, now: Date): { dueDate: string | null; rest: string } {
  if (/\btoday\b/i.test(text)) return { dueDate: formatDateInput(now), rest: text.replace(/\btoday\b/i, ' ') };
  if (/\btomorrow\b/i.test(text)) return { dueDate: formatDateInput(addDays(now, 1)), rest: text.replace(/\btomorrow\b/i, ' ') };
  const match = text.match(/\b(?:by|on|next|due)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (match) {
    const date = upcomingWeekday(now, WEEKDAYS.indexOf(match[1].toLowerCase()));
    return { dueDate: formatDateInput(date), rest: text.replace(match[0], ' ') };
  }
  return { dueDate: null, rest: text };
}

function resolvePriority(text: string): { priority: TaskPriority; rest: string } {
  if (/\b(high[-\s]?priority|urgent|asap|important)\b/i.test(text)) {
    return { priority: 'high', rest: text.replace(/\b(high[-\s]?priority|urgent|asap|important)\b/gi, ' ') };
  }
  if (/\b(low[-\s]?priority|whenever|someday|no rush)\b/i.test(text)) {
    return { priority: 'low', rest: text.replace(/\b(low[-\s]?priority|whenever|someday|no rush)\b/gi, ' ') };
  }
  return { priority: 'normal', rest: text };
}

function cleanTitle(text: string): string {
  const title = text
    .replace(/\b(by|on|due|to)\s*$/i, ' ')
    .replace(/^\s*(?:to|that|a)\s+/i, '') // strip leading filler
    .replace(/^\s*task\b[\s:]*/i, '') // strip a lingering "task" noun (e.g. "urgent task X" → "X")
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
  const raw = text.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (/^(?:undo|revert|nevermind|never mind|take that back|oops|undo that)\b/.test(lower)) {
    return { kind: 'undo' };
  }
  if (
    /\b(?:clear|knock out|wipe)\b[^.]*\boverdue(?:\s+(?:ones|tasks|items|stuff))?\s*[?.!]*$/i.test(raw) ||
    /\b(?:complete|finish|close)\s+(?:all\s+|my\s+|the\s+|every\s+)?overdue(?:\s+(?:ones|tasks|items|stuff))?\s*[?.!]*$/i.test(raw)
  ) {
    return { kind: 'complete_overdue' };
  }
  if (/\b(plan (?:my )?day|what'?s the plan|game ?plan|plan for (?:today|the day))\b/.test(lower)) {
    return { kind: 'plan' };
  }
  if (/\bwhat'?s next\b/.test(lower) || /^(?:next(?: up| task)?\??|what should i (?:do|work on)\??)$/.test(lower)) {
    return { kind: 'whats_next' };
  }
  if (/\b(overdue|late|behind)\b/.test(lower) && /\b(what|any|anything|show|list|i have|are|is)\b/.test(lower)) {
    return { kind: 'overdue' };
  }
  if (/\b(how am i doing|my (?:progress|stats|streak)|how'?s it going|status report|how many)\b/.test(lower)) {
    return { kind: 'status' };
  }

  // Complete / done.
  const completeMatch =
    raw.match(/^(?:complete|finish|close)\s+(.+)/i) ||
    raw.match(/^mark\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed|finished)$/i) ||
    raw.match(/^(?:move|put|drag)\s+(.+?)\s+(?:to|into)\s+done$/i) ||
    raw.match(/^done\s+with\s+(.+)/i) ||
    raw.match(/^(.+?)\s+is\s+(?:done|complete|finished)$/i);
  if (completeMatch) {
    const query = cleanQuery(completeMatch[1].replace(/\s+(?:as\s+)?(?:done|complete|completed|finished)\s*$/i, ''));
    if (query) return { kind: 'complete_task', query };
  }

  // Delete / remove.
  const deleteMatch = raw.match(/^(?:delete|remove|drop|trash|get rid of)\s+(.+)/i);
  if (deleteMatch) {
    const query = cleanQuery(deleteMatch[1]);
    if (query) return { kind: 'delete_task', query };
  }

  // Set priority.
  const priorityMatch =
    raw.match(/^(?:make|set|mark|change)\s+(.+?)\s+(?:to\s+|as\s+)?(high|low|normal|urgent)(?:\s*-?\s*priority)?$/i) ||
    raw.match(/^(.+?)\s+(?:is|should be)\s+(high|low|normal|urgent)(?:\s+priority)?$/i);
  if (priorityMatch) {
    const query = cleanQuery(priorityMatch[1]);
    const word = priorityMatch[2].toLowerCase();
    const priority: TaskPriority = word === 'urgent' ? 'high' : (word as TaskPriority);
    if (query) return { kind: 'set_priority', query, priority };
  }

  // Reschedule (only if a date actually resolves).
  const rescheduleMatch =
    raw.match(/^(?:move|reschedule|push|change|set)\s+(.+?)\s+(?:to|due|for|by)\s+(.+)$/i) ||
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
    raw.match(/^task:\s*(.+)/i) ||
    raw.match(/^(?:add|create|make|new)\s+(?:a\s+|an\s+)?(?:task\b\s*)?(?:to\s+|called\s+|named\s+|:\s*)?(.+)/i);
  if (createMatch) {
    const { priority, rest: afterPriority } = resolvePriority(createMatch[1]);
    const { dueDate, rest: afterDue } = resolveDue(afterPriority, now);
    const title = cleanTitle(afterDue);
    if (!title) return null;
    return { kind: 'create_task', title, priority, due_date: dueDate };
  }

  return null;
}
