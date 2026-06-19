import { PRIORITIES, STATUSES } from './constants';
import type { BoardFilters, Label, TeamMember } from './types';

export const defaultFilters: BoardFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  due: 'all',
  label_id: '',
  assignee_id: '',
};

/** True when any filter narrows the board beyond the default "show everything" state. */
export function hasActiveFilters(filters: BoardFilters) {
  return Boolean(
    filters.search ||
      (filters.status && filters.status !== 'all') ||
      (filters.priority && filters.priority !== 'all') ||
      filters.label_id ||
      filters.assignee_id ||
      (filters.due && filters.due !== 'all'),
  );
}

export type FilterChip = { key: keyof BoardFilters; label: string; emptyValue: string };

/** Build the removable chips shown for the currently active filters. */
export function activeFilterChips(filters: BoardFilters, labels: Label[], members: TeamMember[]): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.search) chips.push({ key: 'search', label: `Search: ${filters.search}`, emptyValue: '' });
  if (filters.status && filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: `Status: ${STATUSES.find((status) => status.id === filters.status)?.label ?? filters.status}`,
      emptyValue: 'all',
    });
  }
  if (filters.priority && filters.priority !== 'all') {
    chips.push({
      key: 'priority',
      label: `Priority: ${PRIORITIES.find((priority) => priority.id === filters.priority)?.label ?? filters.priority}`,
      emptyValue: 'all',
    });
  }
  if (filters.due && filters.due !== 'all') {
    const dueLabels: Record<string, string> = { overdue: 'Overdue', soon: 'Due soon', none: 'No due date' };
    chips.push({ key: 'due', label: `Due: ${dueLabels[filters.due] ?? filters.due}`, emptyValue: 'all' });
  }
  if (filters.label_id) {
    chips.push({
      key: 'label_id',
      label: `Label: ${labels.find((label) => label.id === filters.label_id)?.name ?? 'Selected'}`,
      emptyValue: '',
    });
  }
  if (filters.assignee_id) {
    chips.push({
      key: 'assignee_id',
      label: `Assignee: ${members.find((member) => member.id === filters.assignee_id)?.name ?? 'Selected'}`,
      emptyValue: '',
    });
  }
  return chips;
}
