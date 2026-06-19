import type { BoardFilters } from './types';

/**
 * Serialize board filters into a query string (leading "?" included), skipping
 * empty values and the "all" sentinel. Returns "" when no filters are active.
 */
export function buildQuery(filters: BoardFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value || value === 'all') continue;
    params.set(key, value);
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}
