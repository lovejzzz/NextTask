import { describe, expect, it } from 'vitest';

import { makeLabel, makeMember } from '../test/factories';
import { activeFilterChips, defaultFilters, hasActiveFilters } from './filterLogic';

describe('defaultFilters', () => {
  it('represents the unfiltered "show everything" state', () => {
    expect(hasActiveFilters(defaultFilters)).toBe(false);
  });
});

describe('hasActiveFilters', () => {
  it('is false for empty / sentinel values', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ status: 'all', priority: 'all', due: 'all', search: '', label_id: '', assignee_id: '' })).toBe(
      false,
    );
  });

  it('is true when any real filter is set', () => {
    expect(hasActiveFilters({ search: 'bug' })).toBe(true);
    expect(hasActiveFilters({ status: 'done' })).toBe(true);
    expect(hasActiveFilters({ priority: 'high' })).toBe(true);
    expect(hasActiveFilters({ due: 'overdue' })).toBe(true);
    expect(hasActiveFilters({ label_id: 'l1' })).toBe(true);
    expect(hasActiveFilters({ assignee_id: 'm1' })).toBe(true);
  });
});

describe('activeFilterChips', () => {
  it('returns no chips for the default filters', () => {
    expect(activeFilterChips(defaultFilters, [], [])).toEqual([]);
  });

  it('builds labelled chips with the right reset value per key', () => {
    const label = makeLabel({ id: 'l1', name: 'Bug' });
    const member = makeMember({ id: 'm1', name: 'Mina Chen' });
    const chips = activeFilterChips(
      { search: 'auth', status: 'in_progress', priority: 'high', due: 'overdue', label_id: 'l1', assignee_id: 'm1' },
      [label],
      [member],
    );
    const byKey = Object.fromEntries(chips.map((c) => [c.key, c]));

    expect(byKey.search.label).toBe('Search: auth');
    expect(byKey.search.emptyValue).toBe('');
    expect(byKey.status.label).toBe('Status: In Progress');
    expect(byKey.status.emptyValue).toBe('all');
    expect(byKey.priority.label).toBe('Priority: High');
    expect(byKey.due.label).toBe('Due: Overdue');
    expect(byKey.label_id.label).toBe('Label: Bug');
    expect(byKey.assignee_id.label).toBe('Assignee: Mina Chen');
  });

  it('falls back gracefully when a referenced label/member is missing', () => {
    const chips = activeFilterChips({ label_id: 'missing', assignee_id: 'missing' }, [], []);
    const byKey = Object.fromEntries(chips.map((c) => [c.key, c]));
    expect(byKey.label_id.label).toBe('Label: Selected');
    expect(byKey.assignee_id.label).toBe('Assignee: Selected');
  });
});
