import { Copy, Link2, Loader2, Plus, Trash2, UserMinus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { workspaceApi } from '../../lib/api';
import type { Workspace, WorkspaceRole } from '../../lib/types';
import type { ConfirmOptions, Toast } from '../../lib/uiTypes';
import { readableError } from '../../lib/utils';

export function WorkspaceManager({
  open,
  workspace,
  currentUserId,
  onClose,
  onChanged,
  onSelectBoard,
  notify,
  confirm,
}: {
  open: boolean;
  workspace: Workspace | null;
  currentUserId: string | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onSelectBoard: (boardId: string) => void;
  notify: (tone: Toast['tone'], message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [renameWorkspace, setRenameWorkspace] = useState('');
  const [profileName, setProfileName] = useState('');
  const [boardName, setBoardName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<WorkspaceRole, 'owner'>>('editor');
  const [inviteUrl, setInviteUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    const nextProfileName = workspace.members.find((member) => member.user_id === currentUserId)?.display_name ?? '';
    queueMicrotask(() => {
      if (!active) return;
      setRenameWorkspace(workspace.name);
      setProfileName(nextProfileName);
    });
    return () => {
      active = false;
    };
  }, [currentUserId, workspace]);

  if (!open) return null;

  const canEdit = workspace?.role !== 'viewer';
  const isOwner = workspace?.role === 'owner';

  async function run(label: string, action: () => Promise<void>, success: string) {
    setBusy(label);
    try {
      await action();
      notify('success', success);
    } catch (error) {
      notify('error', readableError(error));
    } finally {
      setBusy(null);
    }
  }

  async function createWorkspace() {
    const name = workspaceName.trim();
    if (!name) return;
    await run(
      'workspace',
      async () => {
        const payload = await workspaceApi.createWorkspace(name);
        const selected = payload.selectedBoardId;
        await onChanged();
        if (selected) onSelectBoard(selected);
        setWorkspaceName('');
      },
      'Workspace created',
    );
  }

  async function createBoard() {
    const name = boardName.trim();
    if (!workspace || !name) return;
    await run(
      'board',
      async () => {
        const board = (await workspaceApi.createBoard(workspace.id, name)) as { id: string };
        await onChanged();
        onSelectBoard(board.id);
        setBoardName('');
      },
      'Board created',
    );
  }

  async function createInvite() {
    if (!workspace) return;
    await run(
      'invite',
      async () => {
        const invitation = await workspaceApi.createInvitation(workspace.id, inviteRole, inviteEmail.trim() || null);
        setInviteUrl(invitation.invite_url);
        await onChanged();
      },
      'Invitation ready',
    );
  }

  async function removeMember(userId: string, displayName: string) {
    if (!workspace) return;
    if (!(await confirm({ title: 'Remove collaborator?', message: `${displayName} will immediately lose workspace access.`, confirmLabel: 'Remove' }))) return;
    await run(
      `remove-${userId}`,
      async () => {
        await workspaceApi.removeWorkspaceMember(workspace.id, userId);
        await onChanged();
      },
      'Collaborator removed',
    );
  }

  async function deleteBoard(targetBoardId: string, name: string) {
    if (!workspace || !(await confirm({ title: 'Delete board?', message: `“${name}” and all of its tasks will be permanently removed.`, confirmLabel: 'Delete board' }))) return;
    await run(`delete-board-${targetBoardId}`, async () => { await workspaceApi.deleteBoard(targetBoardId); await onChanged(); }, 'Board deleted');
  }

  async function deleteWorkspace() {
    if (!workspace || !(await confirm({ title: 'Delete workspace?', message: `“${workspace.name}”, every board, and all shared data will be permanently removed.`, confirmLabel: 'Delete workspace' }))) return;
    await run('delete-workspace', async () => { await workspaceApi.deleteWorkspace(workspace.id); await onChanged(); onClose(); }, 'Workspace deleted');
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="workspace-manager" role="dialog" aria-modal="true" aria-labelledby="workspace-manager-title">
        <div className="drawer-header">
          <div>
            <span className="drawer-kicker">Collaboration</span>
            <h2 id="workspace-manager-title">Workspace settings</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close workspace settings"><X size={18} /></button>
        </div>
        <div className="workspace-manager-body">
          <section className="manager-card">
            <h3>Create a workspace</h3>
            <div className="inline-create">
              <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Product launch" maxLength={80} />
              <button className="icon-button" type="button" onClick={() => void createWorkspace()} disabled={!workspaceName.trim() || Boolean(busy)} aria-label="Create workspace">
                {busy === 'workspace' ? <Loader2 className="spin" size={15} /> : <Plus size={15} />}
              </button>
            </div>
          </section>

          {workspace ? (
            <>
              <section className="manager-card">
                <h3>Workspace profile</h3>
                <div className="workspace-profile-grid">
                  <label><span>Your display name</span><input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} /></label>
                  <button className="ghost-button" type="button" disabled={!profileName.trim() || Boolean(busy)} onClick={() => void run('profile', async () => { await workspaceApi.updateWorkspaceProfile(workspace.id, profileName.trim()); await onChanged(); }, 'Profile updated')}>Save profile</button>
                </div>
                {isOwner ? (
                  <div className="workspace-profile-grid">
                    <label><span>Workspace name</span><input value={renameWorkspace} onChange={(event) => setRenameWorkspace(event.target.value)} maxLength={80} /></label>
                    <button className="ghost-button" type="button" disabled={!renameWorkspace.trim() || Boolean(busy)} onClick={() => void run('rename-workspace', async () => { await workspaceApi.renameWorkspace(workspace.id, renameWorkspace.trim()); await onChanged(); }, 'Workspace renamed')}>Rename</button>
                    {!workspace.is_personal ? <button className="danger-button" type="button" onClick={() => void deleteWorkspace()} disabled={Boolean(busy)}>Delete workspace</button> : null}
                  </div>
                ) : null}
              </section>

              <section className="manager-card">
                <h3>{workspace.name} boards</h3>
                {canEdit ? (
                  <div className="inline-create">
                    <input value={boardName} onChange={(event) => setBoardName(event.target.value)} placeholder="New board" maxLength={80} />
                    <button className="icon-button" type="button" onClick={() => void createBoard()} disabled={!boardName.trim() || Boolean(busy)} aria-label="Create board">
                      {busy === 'board' ? <Loader2 className="spin" size={15} /> : <Plus size={15} />}
                    </button>
                  </div>
                ) : null}
                <div className="manager-list">
                  {workspace.boards.map((board) => (
                    <div className="workspace-board-row" key={board.id}>
                      <strong>{board.name}</strong>
                      <button className="mini-button" type="button" onClick={() => { onSelectBoard(board.id); onClose(); }}>Open</button>
                      {isOwner && workspace.boards.length > 1 ? <button className="mini-button" type="button" onClick={() => void deleteBoard(board.id, board.name)} aria-label={`Delete ${board.name}`}><Trash2 size={13} /></button> : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="manager-card">
                <h3>Collaborators</h3>
                <div className="manager-list">
                  {workspace.members.map((member) => (
                    <div className="workspace-member-row" key={member.user_id}>
                      <div><strong>{member.display_name}</strong><span>{member.user_id === currentUserId ? 'You' : member.user_id.slice(0, 8)}</span></div>
                      {isOwner && member.role !== 'owner' ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(event) => void run(
                              `role-${member.user_id}`,
                              async () => {
                                await workspaceApi.updateMemberRole(workspace.id, member.user_id, event.target.value as 'editor' | 'viewer');
                                await onChanged();
                              },
                              'Role updated',
                            )}
                            aria-label={`Role for ${member.display_name}`}
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button className="mini-button" type="button" onClick={() => void removeMember(member.user_id, member.display_name)} aria-label={`Remove ${member.display_name}`}><UserMinus size={13} /></button>
                        </>
                      ) : <span className="role-chip">{member.role}</span>}
                    </div>
                  ))}
                </div>
              </section>

              {isOwner ? (
                <section className="manager-card">
                  <h3><Link2 size={16} /> Invite collaborator</h3>
                  <div className="invite-grid">
                    <input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Email (optional)" maxLength={320} />
                    <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'editor' | 'viewer')}><option value="editor">Can edit</option><option value="viewer">View only</option></select>
                    <button className="primary-button" type="button" onClick={() => void createInvite()} disabled={Boolean(busy)}>{busy === 'invite' ? <Loader2 className="spin" size={15} /> : <Plus size={15} />} Create link</button>
                  </div>
                  {inviteUrl ? (
                    <div className="invite-link"><input value={inviteUrl} readOnly aria-label="Invitation link" /><button className="icon-button" type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)} aria-label="Copy invitation link"><Copy size={15} /></button></div>
                  ) : null}
                  {workspace.invitations.length ? (
                    <div className="manager-list invitation-list">
                      {workspace.invitations.map((invitation) => (
                        <div className="workspace-member-row" key={invitation.id}>
                          <div>
                            <strong>{invitation.invitee_email ?? 'Anyone with the link'}</strong>
                            <span>{invitation.role} · expires {new Date(invitation.expires_at).toLocaleDateString()}</span>
                          </div>
                          <button
                            className="mini-button"
                            type="button"
                            aria-label={`Revoke invitation for ${invitation.invitee_email ?? invitation.role}`}
                            onClick={() => void run(
                              `invite-${invitation.id}`,
                              async () => {
                                await workspaceApi.revokeInvitation(workspace.id, invitation.id);
                                await onChanged();
                              },
                              'Invitation revoked',
                            )}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
