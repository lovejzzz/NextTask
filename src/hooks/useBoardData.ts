import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { BoardFilters } from '../lib/types';

export function boardQueryKey(filters: BoardFilters) {
  return ['board', filters] as const;
}

export function useBoardData(filters: BoardFilters, enabled: boolean) {
  return useQuery({
    queryKey: boardQueryKey(filters),
    queryFn: () => api.getBoard(filters),
    enabled,
  });
}

export function useBoardStats(enabled: boolean) {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    enabled,
  });
}

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => api.getComments(taskId!),
    enabled: Boolean(taskId),
  });
}

export function useActivity(taskId: string | null) {
  return useQuery({
    queryKey: ['activity', taskId],
    queryFn: () => api.getActivity(taskId!),
    enabled: Boolean(taskId),
  });
}
