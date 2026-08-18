import { buildQuery } from './apiQuery';
import { LOCAL_DEMO_ENABLED } from './constants';
import { formatDateInput } from './dates';
import { mockApi } from './mockApi';
import { supabase } from './supabaseClient';
import type {
  ActivityEvent,
  BoardFilters,
  BoardPayload,
  BoardStats,
  Comment,
  InvitationResult,
  Label,
  LabelInput,
  ReorderUpdate,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TeamMember,
  TeamMemberInput,
  WorkspaceAuditPayload,
  WorkspaceRole,
  WorkspacesPayload,
} from './types';

type ApiEnvelope<T> = { data: T };
type ApiErrorEnvelope = { error?: { message?: string } };

export const api = {
  getBoard(filters: BoardFilters = {}, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.getBoard(filters);
    return apiFetch<BoardPayload>(`/api/tasks${buildQuery(filters)}`, {}, boardId);
  },

  getStats(boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.getStats();
    return apiFetch<BoardStats>('/api/stats', {}, boardId);
  },

  bootstrapDemo(boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.bootstrapDemo();
    return apiFetch<BoardPayload>('/api/bootstrap/demo', { method: 'POST' }, boardId);
  },

  resetBoard(boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.resetBoard();
    return apiFetch<BoardPayload>('/api/bootstrap/reset', { method: 'POST' }, boardId);
  },

  createTask(input: TaskCreateInput, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createTask(input);
    return apiFetch<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }, boardId);
  },

  updateTask(id: string, input: TaskUpdateInput, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.updateTask(id, input);
    return apiFetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, boardId);
  },

  reorderTasks(updates: ReorderUpdate[], boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.reorderTasks(updates);
    return apiFetch<BoardPayload>('/api/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ updates }) }, boardId);
  },

  deleteTask(id: string, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteTask(id);
    return apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' }, boardId);
  },

  createTeamMember(input: TeamMemberInput, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createTeamMember(input);
    return apiFetch<TeamMember>('/api/team-members', { method: 'POST', body: JSON.stringify(input) }, boardId);
  },

  updateTeamMember(id: string, input: Partial<TeamMemberInput>, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.updateTeamMember(id, input);
    return apiFetch<TeamMember>(`/api/team-members/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, boardId);
  },

  deleteTeamMember(id: string, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteTeamMember(id);
    return apiFetch<void>(`/api/team-members/${id}`, { method: 'DELETE' }, boardId);
  },

  createLabel(input: LabelInput, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createLabel(input);
    return apiFetch<Label>('/api/labels', { method: 'POST', body: JSON.stringify(input) }, boardId);
  },

  updateLabel(id: string, input: Partial<LabelInput>, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.updateLabel(id, input);
    return apiFetch<Label>(`/api/labels/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, boardId);
  },

  deleteLabel(id: string, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteLabel(id);
    return apiFetch<void>(`/api/labels/${id}`, { method: 'DELETE' }, boardId);
  },

  getComments(taskId: string, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.getComments(taskId);
    return apiFetch<Comment[]>(`/api/tasks/${taskId}/comments`, {}, boardId);
  },

  createComment(taskId: string, body: string, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.createComment(taskId, body);
    return apiFetch<Comment>(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }, boardId);
  },

  deleteComment(taskId: string, commentId: string, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.deleteComment(taskId, commentId);
    return apiFetch<void>(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' }, boardId);
  },

  getActivity(taskId: string, boardId?: string | null) {
    if (LOCAL_DEMO_ENABLED) return mockApi.getActivity(taskId);
    return apiFetch<ActivityEvent[]>(`/api/tasks/${taskId}/activity`, {}, boardId);
  },
};

export const workspaceApi = {
  getWorkspaces() {
    if (LOCAL_DEMO_ENABLED) return Promise.resolve(localWorkspacePayload());
    return apiFetch<WorkspacesPayload>('/api/workspaces');
  },

  createWorkspace(name: string) {
    return apiFetch<WorkspacesPayload>('/api/workspaces', { method: 'POST', body: JSON.stringify({ name }) });
  },

  renameWorkspace(id: string, name: string) {
    return apiFetch(`/api/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
  },

  deleteWorkspace(id: string) {
    return apiFetch<void>(`/api/workspaces/${id}`, { method: 'DELETE' });
  },

  createBoard(workspaceId: string, name: string) {
    return apiFetch(`/api/workspaces/${workspaceId}/boards`, { method: 'POST', body: JSON.stringify({ name }) });
  },

  renameBoard(id: string, name: string) {
    return apiFetch(`/api/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
  },

  deleteBoard(id: string) {
    return apiFetch<void>(`/api/boards/${id}`, { method: 'DELETE' });
  },

  createInvitation(workspaceId: string, role: Exclude<WorkspaceRole, 'owner'>, email?: string | null) {
    return apiFetch<InvitationResult>(`/api/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ role, email: email || null }),
    });
  },

  revokeInvitation(workspaceId: string, invitationId: string) {
    return apiFetch<void>(`/api/workspaces/${workspaceId}/invitations/${invitationId}`, { method: 'DELETE' });
  },

  transferOwnership(workspaceId: string, newOwnerId: string) {
    if (LOCAL_DEMO_ENABLED) return Promise.resolve(localWorkspacePayload());
    return apiFetch<WorkspacesPayload>(`/api/workspaces/${workspaceId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ new_owner_id: newOwnerId }),
    });
  },

  leaveWorkspace(workspaceId: string) {
    if (LOCAL_DEMO_ENABLED) return Promise.resolve(localWorkspacePayload());
    return apiFetch<WorkspacesPayload>(`/api/workspaces/${workspaceId}/leave`, { method: 'POST' });
  },

  getAudit(workspaceId: string) {
    if (LOCAL_DEMO_ENABLED) return Promise.resolve({ events: [] });
    return apiFetch<WorkspaceAuditPayload>(`/api/workspaces/${workspaceId}/audit`);
  },

  deleteOwnAccount() {
    if (LOCAL_DEMO_ENABLED) return Promise.resolve();
    return apiFetch<void>('/api/account', { method: 'DELETE' });
  },

  acceptInvitation(token: string) {
    return apiFetch<WorkspacesPayload>('/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  updateMemberRole(workspaceId: string, userId: string, role: Exclude<WorkspaceRole, 'owner'>) {
    return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  removeWorkspaceMember(workspaceId: string, userId: string) {
    return apiFetch<void>(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });
  },

  updateWorkspaceProfile(workspaceId: string, displayName: string) {
    return apiFetch<string>(`/api/workspaces/${workspaceId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    });
  },
};

async function apiFetch<T>(path: string, init: RequestInit = {}, boardId?: string | null): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('No active session. Refresh the page to create a guest session.');
  }

  const response = await fetch(path, {
    ...init,
    headers: buildApiHeaders(token, init.headers, new Date(), boardId),
  });

  return readApiResponse<T>(response);
}

export function buildApiHeaders(token: string, initialHeaders?: HeadersInit, now = new Date(), boardId?: string | null) {
  const headers = new Headers(initialHeaders);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-NextTask-Today', formatDateInput(now));
  if (boardId) headers.set('X-NextTask-Board-Id', boardId);
  return headers;
}

function localWorkspacePayload(): WorkspacesPayload {
  const timestamp = new Date(0).toISOString();
  return {
    workspaces: [
      {
        id: 'local-demo-workspace',
        owner_id: 'local-demo-user',
        name: 'Demo Workspace',
        is_personal: true,
        role: 'owner',
        created_at: timestamp,
        updated_at: timestamp,
        boards: [
          {
            id: 'local-demo-board',
            workspace_id: 'local-demo-workspace',
            name: 'Demo Board',
            created_by: 'local-demo-user',
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
        members: [
          {
            workspace_id: 'local-demo-workspace',
            user_id: 'local-demo-user',
            role: 'owner',
            display_name: 'Demo owner',
            invited_by: null,
            joined_at: timestamp,
            updated_at: timestamp,
          },
        ],
        invitations: [],
      },
    ],
  };
}

export async function readApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const body = await response.text();
  let json: (ApiEnvelope<T> & ApiErrorEnvelope) | null = null;
  if (body) {
    try {
      json = JSON.parse(body) as ApiEnvelope<T> & ApiErrorEnvelope;
    } catch {
      throw new Error(
        response.ok
          ? 'The server returned an invalid response. Please try again.'
          : `Request failed (${response.status}). Please try again.`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${response.status}). Please try again.`);
  }
  if (!json || !('data' in json)) {
    throw new Error('The server returned an invalid response. Please try again.');
  }
  return json.data;
}
