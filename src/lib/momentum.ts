/**
 * Per-day "shipped" momentum counter for experimental mode.
 *
 * Tracks how many tasks you've pushed to Done today so the Focus Spotlight can
 * celebrate a streak. Logic is kept pure (no localStorage) so it stays testable;
 * the hook layer wires it to storage.
 */
const PREFIX = 'next-task:shipped:';

export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function storageKey(date: Date = new Date()): string {
  return `${PREFIX}${dayKey(date)}`;
}

export function parseShipped(raw: string | null): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
