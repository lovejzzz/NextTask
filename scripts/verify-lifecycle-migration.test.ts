import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../supabase/migrations/005_lifecycle_presence_audit.sql', import.meta.url), 'utf8').toLowerCase();

describe('v0.2 lifecycle, presence, and audit migration', () => {
  it('installs transactional ownership, departure, revocation, and account lifecycle RPCs', () => {
    expect(sql).toContain('create or replace function public.transfer_workspace_ownership');
    expect(sql).toContain('for update;');
    expect(sql).toContain('create or replace function public.leave_workspace');
    expect(sql).toContain('create or replace function public.revoke_workspace_invitation');
    expect(sql).toContain('set revoked_at = now()');
    expect(sql).toContain('revoke insert, update, delete on public.workspace_invitations from authenticated');
    expect(sql).toContain('drop policy if exists "owners can revoke invitations"');
    expect(sql).toContain('create or replace function public.delete_own_account');
    expect(sql).toContain('transfer or delete owned workspaces before deleting the account');
  });

  it('keeps audit history append-only and owner-scoped', () => {
    expect(sql).toContain('create table if not exists public.workspace_audit_events');
    expect(sql).toContain('revoke all on public.workspace_audit_events from anon, authenticated');
    expect(sql).toContain('grant select on public.workspace_audit_events to authenticated');
    expect(sql).toContain('using (public.can_admin_workspace(workspace_id))');
    expect(sql).toContain("'ownership_transferred'");
    expect(sql).toContain("'invitation_revoked'");
  });

  it('authorizes private Presence by board membership and preserves shared attribution', () => {
    expect(sql).toContain('nexttask members can receive board presence');
    expect(sql).toContain("realtime.messages.extension = 'presence'");
    expect(sql).toContain('public.can_view_board(public.current_realtime_board_id())');
    expect(sql).toContain('boards_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null');
    expect(sql).toContain('workspace_invitations_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null');
  });
});
