import { describe, expect, it } from 'vitest';

import { buildQuery } from './apiQuery';

describe('buildQuery', () => {
  it('returns an empty string when nothing is filtered', () => {
    expect(buildQuery({})).toBe('');
  });

  it('skips empty values and the "all" sentinel', () => {
    expect(buildQuery({ search: '', status: 'all', priority: 'all', due: 'all', label_id: '', assignee_id: '' })).toBe('');
  });

  it('serializes only the active filters with a leading "?"', () => {
    const qs = buildQuery({ status: 'done', priority: 'high', search: 'auth flow' });
    const params = new URLSearchParams(qs.replace(/^\?/, ''));
    expect(qs.startsWith('?')).toBe(true);
    expect(params.get('status')).toBe('done');
    expect(params.get('priority')).toBe('high');
    expect(params.get('search')).toBe('auth flow');
    expect(params.has('label_id')).toBe(false);
  });
});
