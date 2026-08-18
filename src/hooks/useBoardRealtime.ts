import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import { workspacesQueryKey } from './useWorkspaceSession';

const boardTables = ['tasks', 'team_members', 'labels', 'task_assignees', 'task_labels', 'comments', 'activity_events'];

export function useBoardRealtime(boardId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');

  useEffect(() => {
    let active = true;
    if (!enabled || !boardId) {
      queueMicrotask(() => {
        if (active) setStatus('idle');
      });
      return () => {
        active = false;
      };
    }

    let invalidateTimer: number | null = null;
    queueMicrotask(() => {
      if (active) setStatus('connecting');
    });
    const channel = supabase.channel(`nexttask-board:${boardId}`);
    const invalidate = () => {
      if (invalidateTimer !== null) window.clearTimeout(invalidateTimer);
      invalidateTimer = window.setTimeout(() => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['board', boardId] }),
          queryClient.invalidateQueries({ queryKey: ['stats', boardId] }),
          queryClient.invalidateQueries({ queryKey: ['comments', boardId] }),
          queryClient.invalidateQueries({ queryKey: ['activity', boardId] }),
        ]);
      }, 80);
    };

    for (const table of boardTables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `board_id=eq.${boardId}` },
        invalidate,
      );
    }
    channel.subscribe((nextStatus) => {
      if (nextStatus === 'SUBSCRIBED') setStatus('live');
      else if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') setStatus('error');
    });

    return () => {
      active = false;
      if (invalidateTimer !== null) window.clearTimeout(invalidateTimer);
      void supabase.removeChannel(channel);
    };
  }, [boardId, enabled, queryClient]);

  return status;
}

export function useWorkspaceRealtime(workspaceId: string | null, userId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !workspaceId || !userId) return;
    const channel = supabase.channel(`nexttask-workspace:${workspaceId}`);
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: workspacesQueryKey(userId) });
    };
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'boards', filter: `workspace_id=eq.${workspaceId}` },
      invalidate,
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_id=eq.${workspaceId}` },
      invalidate,
    );
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, userId, workspaceId]);
}
