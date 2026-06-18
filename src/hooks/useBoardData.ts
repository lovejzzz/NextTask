import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { BoardFilters } from '../lib/types';

export function boardQueryKey(userId: string | null, filters: BoardFilters) {
  return ['board', userId ?? 'pending-user', filters] as const;
}

export function useBoardData(userId: string | null, filters: BoardFilters, enabled: boolean) {
  return useQuery({
    queryKey: boardQueryKey(userId, filters),
    queryFn: () => api.getBoard(filters),
    enabled: enabled && Boolean(userId),
  });
}

export function useBoardStats(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['stats', userId ?? 'pending-user'],
    queryFn: () => api.getStats(),
    enabled: enabled && Boolean(userId),
  });
}

export function useComments(userId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ['comments', userId ?? 'pending-user', taskId],
    queryFn: () => api.getComments(taskId!),
    enabled: Boolean(userId && taskId),
  });
}

export function useActivity(userId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ['activity', userId ?? 'pending-user', taskId],
    queryFn: () => api.getActivity(taskId!),
    enabled: Boolean(userId && taskId),
  });
}
