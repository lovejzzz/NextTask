import { describe, expect, it } from 'vitest';

import { isMissingRpcFunction } from './database.js';

describe('isMissingRpcFunction', () => {
  it('recognizes PostgREST schema-cache and PostgreSQL missing-function errors', () => {
    expect(isMissingRpcFunction({ code: 'PGRST202' })).toBe(true);
    expect(isMissingRpcFunction({ message: 'function public.reset_board() does not exist' })).toBe(true);
  });

  it('does not hide unrelated database failures', () => {
    expect(isMissingRpcFunction({ code: '42501', message: 'permission denied' })).toBe(false);
  });
});
