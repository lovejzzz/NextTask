import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { requireUser } from './auth.js';
import { ApiHttpError, handleApiError, parseJsonBody, sendData, sendNoContent } from './http.js';
import type { VercelRequest, VercelResponse } from './vercel.js';

const workspaceNameSchema = z.object({ name: z.string().trim().min(1).max(80) }).strict();
const invitationSchema = z
  .object({
    role: z.enum(['editor', 'viewer']),
    email: z.string().trim().email().max(320).optional().nullable(),
  })
  .strict();
const acceptInvitationSchema = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/i) }).strict();
const memberRoleSchema = z.object({ role: z.enum(['editor', 'viewer']) }).strict();
const memberProfileSchema = z.object({ display_name: z.string().trim().min(1).max(80) }).strict();
const uuidSchema = z.string().uuid();

type WorkspaceRole = 'owner' | 'editor' | 'viewer';
type WorkspaceRow = { id: string; owner_id: string; name: string; is_personal: boolean; created_at: string; updated_at: string };
type BoardRow = { id: string; workspace_id: string; name: string; created_by: string; created_at: string; updated_at: string };
type MemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  display_name: string;
  invited_by: string | null;
  joined_at: string;
  updated_at: string;
};
type InvitationRow = {
  id: string;
  workspace_id: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  invitee_email: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function isCollaborationRequest(req: VercelRequest) {
  const pathname = req.url?.split(/[?#]/, 1)[0] ?? '';
  return (
    queryValue(req.query.mode) === 'collaboration' ||
    pathname === '/api/workspaces' ||
    pathname.startsWith('/api/workspaces/') ||
    pathname === '/api/boards' ||
    pathname.startsWith('/api/boards/') ||
    pathname === '/api/invitations' ||
    pathname.startsWith('/api/invitations/')
  );
}

export async function handleCollaboration(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);
    const route = collaborationRoute(req);

    if (route.resource === 'workspaces') {
      if (route.parts.length === 0 && req.method === 'GET') {
        return sendData(res, await listWorkspaces(supabase, user.id));
      }
      if (route.parts.length === 0 && req.method === 'POST') {
        const input = workspaceNameSchema.parse(parseJsonBody(req));
        const { data, error } = await supabase.rpc('create_workspace', { workspace_name: input.name });
        if (error) throw error;
        const created = firstRpcRow(data);
        return sendData(res, { ...(await listWorkspaces(supabase, user.id)), selectedBoardId: created?.board_id }, 201);
      }

      const workspaceId = parseUuid(route.parts[0], 'Workspace id');
      if (route.parts.length === 1 && req.method === 'PATCH') {
        const input = workspaceNameSchema.parse(parseJsonBody(req));
        const updated = await updateOne(supabase, 'workspaces', workspaceId, { name: input.name });
        return sendData(res, updated);
      }
      if (route.parts.length === 1 && req.method === 'DELETE') {
        const { data, error } = await supabase.from('workspaces').delete().eq('id', workspaceId).select('id').maybeSingle();
        if (error) throw error;
        if (!data) throw new ApiHttpError('not_found', 'Workspace not found or cannot be deleted', 404);
        return sendNoContent(res);
      }

      if (route.parts[1] === 'boards' && route.parts.length === 2 && req.method === 'POST') {
        const input = workspaceNameSchema.parse(parseJsonBody(req));
        const { data, error } = await supabase
          .from('boards')
          .insert({ workspace_id: workspaceId, name: input.name, created_by: user.id })
          .select('*')
          .single();
        if (error || !data) throw error;
        return sendData(res, data, 201);
      }

      if (route.parts[1] === 'invitations' && route.parts.length === 2 && req.method === 'POST') {
        const input = invitationSchema.parse(parseJsonBody(req));
        const { data, error } = await supabase.rpc('create_workspace_invitation', {
          target_workspace_id: workspaceId,
          invite_role: input.role,
          target_email: input.email?.toLowerCase() || null,
        });
        if (error) throw error;
        const invitation = firstRpcRow(data);
        const invitationToken = invitation?.invitation_token;
        const invitationId = invitation?.invitation_id;
        const invitationExpiry = invitation?.expires_at;
        if (
          typeof invitationToken !== 'string' ||
          typeof invitationId !== 'string' ||
          typeof invitationExpiry !== 'string'
        ) {
          throw new ApiHttpError('server_error', 'Invitation token was not returned', 500);
        }
        const baseUrl = normalizePublicUrl(process.env.NEXTTASK_PUBLIC_URL ?? 'https://nexttask.team');
        return sendData(
          res,
          {
            id: invitationId,
            role: input.role,
            email: input.email?.toLowerCase() || null,
            expires_at: invitationExpiry,
            invite_url: `${baseUrl}/?invite=${encodeURIComponent(invitationToken)}`,
          },
          201,
        );
      }

      if (route.parts[1] === 'invitations' && route.parts.length === 3 && req.method === 'DELETE') {
        const invitationId = parseUuid(route.parts[2], 'Invitation id');
        const { data, error } = await supabase
          .from('workspace_invitations')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('id', invitationId)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new ApiHttpError('not_found', 'Invitation not found', 404);
        return sendNoContent(res);
      }

      if (route.parts[1] === 'members' && route.parts.length === 3) {
        const memberUserId = parseUuid(route.parts[2], 'Member user id');
        const { data: workspaceOwner, error: ownerError } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .maybeSingle();
        if (ownerError) throw ownerError;
        if (!workspaceOwner) throw new ApiHttpError('not_found', 'Workspace not found', 404);
        if (workspaceOwner.owner_id === memberUserId) {
          throw new ApiHttpError('conflict', 'The workspace owner role cannot be changed or removed', 409);
        }
        if (req.method === 'PATCH') {
          const input = memberRoleSchema.parse(parseJsonBody(req));
          const { data, error } = await supabase
            .from('workspace_members')
            .update({ role: input.role })
            .eq('workspace_id', workspaceId)
            .eq('user_id', memberUserId)
            .select('workspace_id,user_id,role,display_name,joined_at,updated_at')
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new ApiHttpError('not_found', 'Workspace member not found', 404);
          return sendData(res, data);
        }
        if (req.method === 'DELETE') {
          const { data, error } = await supabase
            .from('workspace_members')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('user_id', memberUserId)
            .select('user_id')
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new ApiHttpError('not_found', 'Workspace member not found', 404);
          return sendNoContent(res);
        }
      }

      if (route.parts[1] === 'profile' && route.parts.length === 2 && req.method === 'PATCH') {
        const input = memberProfileSchema.parse(parseJsonBody(req));
        const { data, error } = await supabase.rpc('update_workspace_profile', {
          target_workspace_id: workspaceId,
          new_display_name: input.display_name,
        });
        if (error) throw error;
        return sendData(res, data);
      }
    }

    if (route.resource === 'boards' && route.parts.length === 1) {
      const boardId = parseUuid(route.parts[0], 'Board id');
      if (req.method === 'PATCH') {
        const input = workspaceNameSchema.parse(parseJsonBody(req));
        return sendData(res, await updateOne(supabase, 'boards', boardId, { name: input.name }));
      }
      if (req.method === 'DELETE') {
        const { data: board, error: boardError } = await supabase
          .from('boards')
          .select('id,workspace_id')
          .eq('id', boardId)
          .maybeSingle();
        if (boardError) throw boardError;
        if (!board) throw new ApiHttpError('not_found', 'Board not found', 404);
        const { count, error: countError } = await supabase
          .from('boards')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', board.workspace_id);
        if (countError) throw countError;
        if ((count ?? 0) <= 1) throw new ApiHttpError('conflict', 'A workspace must keep at least one board', 409);
        const { error } = await supabase.from('boards').delete().eq('id', boardId);
        if (error) throw error;
        return sendNoContent(res);
      }
    }

    if (route.resource === 'invitations' && route.parts[0] === 'accept' && req.method === 'POST') {
      const input = acceptInvitationSchema.parse(parseJsonBody(req));
      const { data: workspaceId, error } = await supabase.rpc('accept_workspace_invitation', {
        invitation_token: input.token.toLowerCase(),
      });
      if (error?.code === '42501' && /different email address/i.test(error.message)) {
        throw new ApiHttpError('forbidden', 'Sign in with the email address this invitation was sent to.', 403);
      }
      if (error) throw error;
      return sendData(res, { ...(await listWorkspaces(supabase, user.id)), selectedWorkspaceId: workspaceId });
    }

    throw new ApiHttpError('method_not_allowed', `${req.method ?? 'This method'} is not allowed for this route`, 405);
  } catch (error) {
    return handleApiError(res, error);
  }
}

export function collaborationRoute(req: VercelRequest) {
  const queryResource = queryValue(req.query.resource);
  const queryPath = queryValue(req.query.path);
  if (queryResource && ['workspaces', 'boards', 'invitations'].includes(queryResource)) {
    return { resource: queryResource, parts: splitPath(queryPath) };
  }

  const segments = splitPath(req.url?.split(/[?#]/, 1)[0]);
  const apiIndex = segments.indexOf('api');
  const resource = segments[apiIndex + 1] ?? '';
  return { resource, parts: segments.slice(apiIndex + 2) };
}

async function listWorkspaces(supabase: SupabaseClient, userId: string) {
  const { error: ensureError } = await supabase.rpc('ensure_personal_workspace');
  if (ensureError) throw ensureError;

  const { data: ownMemberships, error: ownError } = await supabase
    .from('workspace_members')
    .select('workspace_id,user_id,role,display_name,invited_by,joined_at,updated_at')
    .eq('user_id', userId);
  if (ownError) throw ownError;
  const memberships = (ownMemberships as MemberRow[] | null) ?? [];
  const workspaceIds = memberships.map((membership) => membership.workspace_id);
  if (!workspaceIds.length) return { workspaces: [] };

  const [workspaceResult, boardResult, memberResult, invitationResult] = await Promise.all([
    supabase.from('workspaces').select('*').in('id', workspaceIds).order('created_at', { ascending: true }),
    supabase.from('boards').select('*').in('workspace_id', workspaceIds).order('created_at', { ascending: true }),
    supabase
      .from('workspace_members')
      .select('workspace_id,user_id,role,display_name,invited_by,joined_at,updated_at')
      .in('workspace_id', workspaceIds)
      .order('joined_at', { ascending: true }),
    supabase
      .from('workspace_invitations')
      .select('id,workspace_id,role,invitee_email,expires_at,accepted_at,revoked_at,created_at')
      .in('workspace_id', workspaceIds)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ]);
  const error = workspaceResult.error || boardResult.error || memberResult.error || invitationResult.error;
  if (error) throw error;

  const roleByWorkspace = new Map(memberships.map((membership) => [membership.workspace_id, membership.role]));
  const boards = (boardResult.data as BoardRow[] | null) ?? [];
  const members = (memberResult.data as MemberRow[] | null) ?? [];
  const invitations = (invitationResult.data as InvitationRow[] | null) ?? [];

  return {
    workspaces: ((workspaceResult.data as WorkspaceRow[] | null) ?? []).map((workspace) => ({
      ...workspace,
      role: roleByWorkspace.get(workspace.id)!,
      boards: boards.filter((board) => board.workspace_id === workspace.id),
      members: members.filter((member) => member.workspace_id === workspace.id),
      invitations: invitations.filter((invitation) => invitation.workspace_id === workspace.id),
    })),
  };
}

async function updateOne(supabase: SupabaseClient, table: 'workspaces' | 'boards', id: string, patch: { name: string }) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiHttpError('not_found', `${table === 'boards' ? 'Board' : 'Workspace'} not found`, 404);
  return data;
}

function firstRpcRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

function parseUuid(value: string | undefined, label: string) {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw new ApiHttpError('bad_request', `${label} must be a valid UUID`, 400);
  return result.data;
}

function splitPath(value: string | undefined) {
  return (value ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePublicUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new ApiHttpError('server_error', 'NEXTTASK_PUBLIC_URL must use HTTPS', 500);
  }
  return parsed.toString().replace(/\/$/, '');
}
