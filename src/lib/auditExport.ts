import type { WorkspaceAuditEvent, WorkspaceMember } from './types';

export function serializeWorkspaceAuditCsv(events: WorkspaceAuditEvent[], members: WorkspaceMember[]) {
  const names = new Map(members.map((member) => [member.user_id, member.display_name]));
  const rows = events.map((event) => [
    event.created_at,
    event.action,
    displayActor(event.actor_user_id, names, 'System'),
    displayActor(event.subject_user_id, names, ''),
    JSON.stringify(event.metadata),
  ]);
  return [
    ['timestamp', 'action', 'actor', 'subject', 'details'],
    ...rows,
  ].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function auditExportFilename(workspaceName: string, now = new Date()) {
  const slug = workspaceName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace';
  return `${slug}-audit-${now.toISOString().slice(0, 10)}.csv`;
}

function displayActor(userId: string | null, names: Map<string, string>, fallback: string) {
  if (!userId) return fallback;
  return names.get(userId) ?? userId;
}

function csvCell(value: string) {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
