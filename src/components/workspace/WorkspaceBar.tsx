import { Radio, Settings2, Users } from 'lucide-react';

import type { Workspace } from '../../lib/types';

export function WorkspaceBar({
  workspaces,
  activeWorkspace,
  activeBoardId,
  realtimeStatus,
  onSelectBoard,
  onManage,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeBoardId: string | null;
  realtimeStatus: 'idle' | 'connecting' | 'live' | 'error';
  onSelectBoard: (boardId: string) => void;
  onManage: () => void;
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
        <span className="role-chip">
          <Users size={13} />
          {activeWorkspace?.role ?? 'viewer'}
        </span>
        <span className={`realtime-chip realtime-${realtimeStatus}`} title="Realtime collaboration status">
          <Radio size={13} />
          {realtimeStatus === 'live' ? 'Live' : realtimeStatus === 'error' ? 'Offline' : 'Connecting'}
        </span>
        <button className="icon-button text-button" type="button" onClick={onManage}>
          <Settings2 size={15} />
          Workspace
        </button>
      </div>
    </nav>
  );
}
