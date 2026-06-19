import { buildQuery } from './apiQuery';
import { LOCAL_DEMO_ENABLED } from './constants';
import { mockApi } from './mockApi';
import type {
  ActivityEvent,
  BoardFilters,
  BoardPayload,
  BoardStats,
  Comment,
  Label,
  LabelInput,
  ReorderUpdate,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TeamMember,
  TeamMemberInput,
} from './types';

type ApiEnvelope<T> = { data: T };
type ApiErrorEnvelope = { error?: { message?: string } };

export const api = {
  getBoard(filters: BoardFilters = {}) {
    if (LOCAL_DEMO_ENABLED) return mockApi.getBoard(filters);
    return apiFetch<BoardPayload>(`/api/tasks${buildQuery(filters)}`);
  },

  getStats() {
    if (LOCAL_DEMO_ENABLED) return mockApi.getStats();
    return apiFetch<BoardStats>('/api/stats');
  },

  bootstrapDemo() {
    if (LOCAL_DEMO_ENABLED) return mockApi.bootstrapDemo();
    return apiFetch<BoardPayload>('/api/bootstrap/demo', { method: 'POST' });
  },

  resetBoard() {
    if (LOCAL_DEMO_ENABLED) return mockApi.resetBoard();
    return apiFetch<BoardPayload>('/api/bootstrap/reset', { method: 'POST' });
  },

  createTask(input: TaskCreateInput) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createTask(input);
    return apiFetch<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) });
  },

  updateTask(id: string, input: TaskUpdateInput) {
    if (LOCAL_DEMO_ENABLED) return mockApi.updateTask(id, input);
    return apiFetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  reorderTasks(updates: ReorderUpdate[]) {
    if (LOCAL_DEMO_ENABLED) return mockApi.reorderTasks(updates);
    return apiFetch<BoardPayload>('/api/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ updates }) });
  },

  deleteTask(id: string) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteTask(id);
    return apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  createTeamMember(input: TeamMemberInput) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createTeamMember(input);
    return apiFetch<TeamMember>('/api/team-members', { method: 'POST', body: JSON.stringify(input) });
  },

  updateTeamMember(id: string, input: Partial<TeamMemberInput>) {
    if (LOCAL_DEMO_ENABLED) return mockApi.updateTeamMember(id, input);
    return apiFetch<TeamMember>(`/api/team-members/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  deleteTeamMember(id: string) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteTeamMember(id);
    return apiFetch<void>(`/api/team-members/${id}`, { method: 'DELETE' });
  },

  createLabel(input: LabelInput) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createLabel(input);
    return apiFetch<Label>('/api/labels', { method: 'POST', body: JSON.stringify(input) });
  },

  updateLabel(id: string, input: Partial<LabelInput>) {
    if (LOCAL_DEMO_ENABLED) return mockApi.updateLabel(id, input);
    return apiFetch<Label>(`/api/labels/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  deleteLabel(id: string) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteLabel(id);
    return apiFetch<void>(`/api/labels/${id}`, { method: 'DELETE' });
  },

  getComments(taskId: string) {
    if (LOCAL_DEMO_ENABLED) return mockApi.getComments(taskId);
    return apiFetch<Comment[]>(`/api/tasks/${taskId}/comments`);
  },

  createComment(taskId: string, body: string) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createComment(taskId, body);
    return apiFetch<Comment>(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  },

  deleteComment(taskId: string, commentId: string) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteComment(taskId, commentId);
    return apiFetch<void>(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
  },

  getActivity(taskId: string) {
    if (LOCAL_DEMO_ENABLED) return mockApi.getActivity(taskId);
    return apiFetch<ActivityEvent[]>(`/api/tasks/${taskId}/activity`);
  },
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { supabase } = await import('./supabaseClient');
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('No active session. Refresh the page to create a guest session.');
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const json = (await response.json()) as ApiEnvelope<T> & ApiErrorEnvelope;
  if (!response.ok) {
    throw new Error(json.error?.message ?? 'Request failed');
  }
  return json.data;
}
