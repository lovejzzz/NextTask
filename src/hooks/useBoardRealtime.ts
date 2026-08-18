import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import type { BoardPresenceMember } from '../lib/types';
import { workspacesQueryKey } from './useWorkspaceSession';

const boardTables = ['tasks', 'team_members', 'labels', 'task_assignees', 'task_labels', 'comments', 'activity_events'];

export function useBoardRealtime(
  boardId: string | null,
  identity: Omit<BoardPresenceMember, 'online_at'> | null,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [members, setMembers] = useState<BoardPresenceMember[]>([]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (!enabled || !boardId || !identity) {
      queueMicrotask(() => {
        if (active) {
          setStatus('idle');
          setMembers([]);
        }
      });
      return () => {
        active = false;
      };
    }
    const currentIdentity = identity;

    let invalidateTimer: number | null = null;
    queueMicrotask(() => {
      if (active) setStatus('connecting');
    });
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

    void connect();

    async function connect() {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session?.access_token) {
        if (active) setStatus('error');
        return;
      }
      await supabase.realtime.setAuth(data.session.access_token);
      if (!active) return;

      channel = supabase.channel(`board:${boardId}`, {
        config: { private: true, presence: { key: currentIdentity.user_id } },
      });
      for (const table of boardTables) {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `board_id=eq.${boardId}` },
          invalidate,
        );
      }
      channel.on('presence', { event: 'sync' }, () => {
        if (active && channel) setMembers(normalizeBoardPresence(channel.presenceState()));
      });
      channel.subscribe((nextStatus) => {
        if (!active || !channel) return;
        if (nextStatus === 'SUBSCRIBED') {
          setStatus('live');
          void channel.track({ ...currentIdentity, online_at: new Date().toISOString() }).catch(() => {
            if (active) setStatus('error');
          });
        } else if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
          setStatus('error');
          setMembers([]);
        }
      });
    }

    return () => {
      active = false;
      if (invalidateTimer !== null) window.clearTimeout(invalidateTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [boardId, enabled, identity, queryClient]);

  return { status, members };
}

export function normalizeBoardPresence(state: Record<string, unknown>): BoardPresenceMember[] {
  const byUser = new Map<string, BoardPresenceMember>();
  for (const presences of Object.values(state)) {
    if (!Array.isArray(presences)) continue;
    for (const value of presences) {
      if (!value || typeof value !== 'object') continue;
      const candidate = value as Record<string, unknown>;
      const role = candidate.role;
      if (
        typeof candidate.user_id !== 'string'
        || typeof candidate.display_name !== 'string'
        || typeof candidate.online_at !== 'string'
        || (role !== 'owner' && role !== 'editor' && role !== 'viewer')
      ) continue;
      const member = {
        user_id: candidate.user_id,
        display_name: candidate.display_name,
        online_at: candidate.online_at,
        role,
      } satisfies BoardPresenceMember;
      const existing = byUser.get(member.user_id);
      if (!existing || existing.online_at < member.online_at) byUser.set(member.user_id, member);
    }
  }
  return [...byUser.values()].sort((left, right) => left.display_name.localeCompare(right.display_name));
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
