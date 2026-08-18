import { describe, expect, it } from 'vitest';

import { auditExportFilename, serializeWorkspaceAuditCsv } from './auditExport';
import type { WorkspaceAuditEvent, WorkspaceMember } from './types';

const event: WorkspaceAuditEvent = {
  id: 'event-1',
  workspace_id: 'workspace-1',
  actor_user_id: 'user-1',
  subject_user_id: 'user-2',
  action: 'member_role_changed',
  metadata: { from: 'viewer', to: 'editor', note: 'Includes, comma' },
  created_at: '2026-08-18T12:00:00.000Z',
};

const members: WorkspaceMember[] = [
  { workspace_id: 'workspace-1', user_id: 'user-1', role: 'owner', display_name: 'Ada, Owner', invited_by: null, joined_at: '', updated_at: '' },
  { workspace_id: 'workspace-1', user_id: 'user-2', role: 'editor', display_name: 'Grace', invited_by: null, joined_at: '', updated_at: '' },
];

describe('workspace audit export', () => {
  it('serializes named actors and safely quotes CSV content', () => {
    const csv = serializeWorkspaceAuditCsv([event], members);
    expect(csv).toContain('timestamp,action,actor,subject,details');
    expect(csv).toContain('"Ada, Owner"');
    expect(csv).toContain('Grace');
    expect(csv).toContain('""Includes, comma""');
  });

  it('creates a stable, filesystem-safe filename', () => {
    expect(auditExportFilename(' Product Launch! ', new Date('2026-08-18T15:00:00Z')))
      .toBe('product-launch-audit-2026-08-18.csv');
  });
});
