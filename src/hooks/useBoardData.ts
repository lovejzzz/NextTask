import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { BoardFilters } from '../lib/types';

export function boardQueryKey(boardId: string | null, filters: BoardFilters) {
  return ['board', boardId ?? 'pending-board', filters] as const;
}

export function useBoardData(boardId: string | null, filters: BoardFilters, enabled: boolean) {
  return useQuery({
    queryKey: boardQueryKey(boardId, filters),
    queryFn: () => api.getBoard(filters, boardId),
    enabled: enabled && Boolean(boardId),
  });
}

export function useBoardStats(boardId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['stats', boardId ?? 'pending-board'],
    queryFn: () => api.getStats(boardId),
    enabled: enabled && Boolean(boardId),
  });
}

export function useComments(boardId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ['comments', boardId ?? 'pending-board', taskId],
    queryFn: () => api.getComments(taskId!, boardId),
    enabled: Boolean(boardId && taskId),
  });
}

export function useActivity(boardId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ['activity', boardId ?? 'pending-board', taskId],
    queryFn: () => api.getActivity(taskId!, boardId),
    enabled: Boolean(boardId && taskId),
  });
}
