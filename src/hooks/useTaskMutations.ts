import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { LabelInput, ReorderUpdate, TaskCreateInput, TaskUpdateInput, TeamMemberInput } from '../lib/types';

export function useTaskMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['board'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
      queryClient.invalidateQueries({ queryKey: ['comments'] }),
      queryClient.invalidateQueries({ queryKey: ['activity'] }),
    ]);
  };
  const invalidateBoard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['board'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
    ]);
  };

  return {
    bootstrapDemo: useMutation({ mutationFn: () => api.bootstrapDemo(), onSuccess: invalidate }),
    createTask: useMutation({ mutationFn: (input: TaskCreateInput) => api.createTask(input), onSuccess: invalidate }),
    updateTask: useMutation({
      mutationFn: ({ id, input }: { id: string; input: TaskUpdateInput }) => api.updateTask(id, input),
      onSuccess: invalidate,
    }),
    reorderTasks: useMutation({ mutationFn: (updates: ReorderUpdate[]) => api.reorderTasks(updates), onSuccess: invalidate }),
    deleteTask: useMutation({ mutationFn: (id: string) => api.deleteTask(id), onSuccess: invalidateBoard }),
    createTeamMember: useMutation({ mutationFn: (input: TeamMemberInput) => api.createTeamMember(input), onSuccess: invalidate }),
    updateTeamMember: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<TeamMemberInput> }) => api.updateTeamMember(id, input),
      onSuccess: invalidate,
    }),
    deleteTeamMember: useMutation({ mutationFn: (id: string) => api.deleteTeamMember(id), onSuccess: invalidate }),
    createLabel: useMutation({ mutationFn: (input: LabelInput) => api.createLabel(input), onSuccess: invalidate }),
    updateLabel: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<LabelInput> }) => api.updateLabel(id, input),
      onSuccess: invalidate,
    }),
    deleteLabel: useMutation({ mutationFn: (id: string) => api.deleteLabel(id), onSuccess: invalidate }),
    createComment: useMutation({
      mutationFn: ({ taskId, body }: { taskId: string; body: string }) => api.createComment(taskId, body),
      onSuccess: invalidate,
    }),
    deleteComment: useMutation({
      mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) => api.deleteComment(taskId, commentId),
      onSuccess: invalidate,
    }),
  };
}
