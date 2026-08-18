import { describe, expect, it } from 'vitest';

import { normalizeBoardPresence } from './useBoardRealtime';

describe('normalizeBoardPresence', () => {
  it('deduplicates tabs, rejects malformed payloads, and sorts collaborators', () => {
    expect(normalizeBoardPresence({
      ada: [
        { user_id: 'ada', display_name: 'Ada', role: 'owner', online_at: '2026-08-18T10:00:00Z' },
        { user_id: 'ada', display_name: 'Ada', role: 'owner', online_at: '2026-08-18T11:00:00Z' },
      ],
      grace: [{ user_id: 'grace', display_name: 'Grace', role: 'editor', online_at: '2026-08-18T10:30:00Z' }],
      malformed: [{ user_id: 'bad', display_name: 'Bad', role: 'admin' }],
    })).toEqual([
      { user_id: 'ada', display_name: 'Ada', role: 'owner', online_at: '2026-08-18T11:00:00Z' },
      { user_id: 'grace', display_name: 'Grace', role: 'editor', online_at: '2026-08-18T10:30:00Z' },
    ]);
  });
});
