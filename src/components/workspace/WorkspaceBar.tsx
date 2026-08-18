import { Radio, Settings2, Users } from 'lucide-react';

import type { BoardPresenceMember, Workspace } from '../../lib/types';

export function WorkspaceBar({
  workspaces,
  activeWorkspace,
  activeBoardId,
  realtimeStatus,
  onlineMembers,
  acceptingInvitation,
  invitationError,
  onSelectBoard,
  onManage,
  onRetryInvitation,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeBoardId: string | null;
  realtimeStatus: 'idle' | 'connecting' | 'live' | 'error';
  onlineMembers: BoardPresenceMember[];
  acceptingInvitation: boolean;
  invitationError: string | null;
  onSelectBoard: (boardId: string) => void;
  onManage: () => void;
  onRetryInvitation: () => void;
}) {
  return (
    <nav className="workspace-bar" aria-label="Workspace and board">
      <div className="workspace-selector-group">
        <label>
          <span>Workspace</span>
          <select
            value={activeWorkspace?.id ?? ''}
            onChange={(event) => {
              const firstBoard = workspaces.find((workspace) => workspace.id === event.target.value)?.boards[0];
              if (firstBoard) onSelectBoard(firstBoard.id);
            }}
          >
            {workspaces.map((workspace) => (
              <option value={workspace.id} key={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
        <span className="workspace-separator">/</span>
        <label>
          <span>Board</span>
          <select value={activeBoardId ?? ''} onChange={(event) => onSelectBoard(event.target.value)}>
            {(activeWorkspace?.boards ?? []).map((board) => (
              <option value={board.id} key={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="workspace-meta">
        {acceptingInvitation ? <span className="invite-status">Joining workspace…</span> : null}
        {invitationError ? (
          <span className="invite-status invite-status-error" role="alert">
            {invitationError}
            <button type="button" onClick={onRetryInvitation}>Retry</button>
          </span>
        ) : null}
        <span className="role-chip">
          <Users size={13} />
          {activeWorkspace?.role ?? 'viewer'}
        </span>
        <span className={`realtime-chip realtime-${realtimeStatus}`} title="Realtime collaboration status">
          <Radio size={13} />
          {realtimeStatus === 'live' ? 'Live' : realtimeStatus === 'error' ? 'Offline' : 'Connecting'}
        </span>
        {onlineMembers.length ? (
          <span className="presence-chip" title={onlineMembers.map((member) => `${member.display_name} (${member.role})`).join(', ')}>
            <span className="presence-avatars" aria-hidden="true">
              {onlineMembers.slice(0, 3).map((member) => <span key={member.user_id}>{member.display_name.slice(0, 1).toUpperCase()}</span>)}
            </span>
            {onlineMembers.length} online
          </span>
        ) : null}
        <button className="icon-button text-button" type="button" onClick={onManage}>
          <Settings2 size={15} />
          Workspace
        </button>
      </div>
    </nav>
  );
}
