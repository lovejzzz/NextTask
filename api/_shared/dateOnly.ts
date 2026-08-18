import type { VercelRequest } from './vercel.js';

export const CLIENT_TODAY_HEADER = 'x-nexttask-today';

export type DueBucket = 'none' | 'complete' | 'overdue' | 'soon' | 'future';

export function getRequestToday(req: Pick<VercelRequest, 'headers'>, now = new Date()) {
  const raw = req.headers[CLIENT_TODAY_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && isDateOnly(value) ? value : formatUtcDate(now);
}

export function classifyDueDate(
  dueDate: string | null | undefined,
  status: string,
  today: string,
): DueBucket {
  if (!dueDate) return 'none';
  if (status === 'done') return 'complete';
  if (dueDate < today) return 'overdue';
  if (dueDate <= addDateOnlyDays(today, 3)) return 'soon';
  return 'future';
}

export function addDateOnlyDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function formatUtcDate(value: Date) {
  const year = String(value.getUTCFullYear()).padStart(4, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
