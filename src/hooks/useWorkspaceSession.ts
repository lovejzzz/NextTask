import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { workspaceApi } from '../lib/api';
import type { Workspace, WorkspacesPayload } from '../lib/types';

export const workspacesQueryKey = (userId: string | null) => ['workspaces', userId ?? 'pending-user'] as const;

export function useWorkspaceSession(userId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const [activeBoardId, setActiveBoardIdState] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const [invitationAttempt, setInvitationAttempt] = useState(0);
  const acceptedInviteRef = useRef<string | null>(null);
  const query = useQuery({
    queryKey: workspacesQueryKey(userId),
    queryFn: () => workspaceApi.getWorkspaces(),
    enabled: enabled && Boolean(userId),
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  });

  useEffect(() => {
    if (!userId || !query.data) return;
    let active = true;
    const saved = readSavedBoardId(userId);
    const next = selectInitialBoardId(query.data, activeBoardId ?? saved);
    queueMicrotask(() => {
      if (!active) return;
      if (next !== activeBoardId) setActiveBoardIdState(next);
      if (next) saveBoardId(userId, next);
    });
    return () => {
      active = false;
    };
  }, [activeBoardId, query.data, userId]);

  useEffect(() => {
    if (!enabled || !userId || !query.data || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('invite');
    if (!token || acceptedInviteRef.current === token) return;
    acceptedInviteRef.current = token;
    queueMicrotask(() => {
      setInvitationError(null);
      setAcceptingInvitation(true);
    });

    void workspaceApi
      .acceptInvitation(token)
      .then((payload) => {
        queryClient.setQueryData(workspacesQueryKey(userId), payload);
        const invitedWorkspace = payload.workspaces.find((workspace) => workspace.id === payload.selectedWorkspaceId);
        const nextBoardId = invitedWorkspace?.boards[0]?.id ?? selectInitialBoardId(payload, null);
        if (nextBoardId) {
          setActiveBoardIdState(nextBoardId);
          saveBoardId(userId, nextBoardId);
        }
        clearInviteFromUrl(url);
        setAcceptingInvitation(false);
      })
      .catch((error: unknown) => {
        // Leave the token in the URL so the user can authenticate with a
        // matching email or retry a transient failure.
        acceptedInviteRef.current = null;
        setAcceptingInvitation(false);
        setInvitationError(error instanceof Error ? error.message : 'The invitation could not be accepted.');
      });
  }, [enabled, invitationAttempt, query.data, queryClient, userId]);

  const activeWorkspace = findWorkspaceForBoard(query.data, activeBoardId);
  const activeBoard = activeWorkspace?.boards.find((board) => board.id === activeBoardId) ?? null;

  function setActiveBoardId(boardId: string) {
    if (!userId || !query.data?.workspaces.some((workspace) => workspace.boards.some((board) => board.id === boardId))) {
      return;
    }
    setActiveBoardIdState(boardId);
    saveBoardId(userId, boardId);
  }

  return {
    ...query,
    activeBoardId,
    activeBoard,
    activeWorkspace,
    canEdit: activeWorkspace ? activeWorkspace.role !== 'viewer' : false,
    acceptingInvitation,
    invitationError,
    retryInvitation: () => {
      acceptedInviteRef.current = null;
      setInvitationAttempt((attempt) => attempt + 1);
    },
    setActiveBoardId,
  };
}

export function selectInitialBoardId(payload: WorkspacesPayload, preferredBoardId: string | null) {
  const workspaces = payload.workspaces;
  if (
    preferredBoardId &&
    workspaces.some((workspace) => workspace.boards.some((board) => board.id === preferredBoardId))
  ) {
    return preferredBoardId;
  }
  const personal = workspaces.find((workspace) => workspace.is_personal && workspace.boards.length > 0);
  return personal?.boards[0]?.id ?? workspaces.find((workspace) => workspace.boards.length > 0)?.boards[0]?.id ?? null;
}

function findWorkspaceForBoard(payload: WorkspacesPayload | undefined, boardId: string | null): Workspace | null {
  if (!payload || !boardId) return null;
  return payload.workspaces.find((workspace) => workspace.boards.some((board) => board.id === boardId)) ?? null;
}

function storageKey(userId: string) {
  return `nexttask-active-board:${userId}`;
}

function readSavedBoardId(userId: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(storageKey(userId));
}

function saveBoardId(userId: string, boardId: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(storageKey(userId), boardId);
}

function clearInviteFromUrl(url: URL) {
  url.searchParams.delete('invite');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, next || '/');
}
