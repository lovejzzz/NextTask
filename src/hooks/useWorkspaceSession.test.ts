import { describe, expect, it } from 'vitest';

import type { WorkspacesPayload } from '../lib/types';
import { selectInitialBoardId } from './useWorkspaceSession';

const payload = {
  workspaces: [
    { id: 'shared', is_personal: false, boards: [{ id: 'shared-board' }] },
    { id: 'personal', is_personal: true, boards: [{ id: 'personal-board' }] },
  ],
} as WorkspacesPayload;

describe('selectInitialBoardId', () => {
  it('keeps an accessible saved board', () => {
    expect(selectInitialBoardId(payload, 'shared-board')).toBe('shared-board');
  });

  it('falls back to the personal board when a saved share was revoked', () => {
    expect(selectInitialBoardId(payload, 'revoked-board')).toBe('personal-board');
  });

  it('handles an account with no boards', () => {
    expect(selectInitialBoardId({ workspaces: [] }, null)).toBeNull();
  });
});
