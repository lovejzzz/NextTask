import { describe, expect, it } from 'vitest';

import { collaborationRoute, isCollaborationRequest } from './collaborationEndpoint.js';
import type { VercelRequest } from './vercel.js';

function request(url: string, query: VercelRequest['query'] = {}): VercelRequest {
  return { method: 'GET', url, query, headers: {}, socket: {} };
}

describe('collaboration route folding', () => {
  it('recognizes clean public workspace and invitation URLs', () => {
    expect(isCollaborationRequest(request('/api/workspaces'))).toBe(true);
    expect(isCollaborationRequest(request('/api/workspaces/workspace-id/invitations'))).toBe(true);
    expect(isCollaborationRequest(request('/api/invitations/accept'))).toBe(true);
    expect(isCollaborationRequest(request('/api/account'))).toBe(true);
  });

  it('routes lifecycle and audit paths through the folded collaboration function', () => {
    const req = request('/api/stats?mode=collaboration', {
      mode: 'collaboration',
      resource: 'workspaces',
      path: '123e4567-e89b-42d3-a456-426614174000/audit',
    });
    expect(collaborationRoute(req)).toEqual({
      resource: 'workspaces',
      parts: ['123e4567-e89b-42d3-a456-426614174000', 'audit'],
    });
    expect(collaborationRoute(request('/api/account'))).toEqual({ resource: 'account', parts: [] });
  });

  it('reconstructs rewritten nested paths without creating more Vercel functions', () => {
    const req = request('/api/stats?mode=collaboration', {
      mode: 'collaboration',
      resource: 'workspaces',
      path: '123e4567-e89b-42d3-a456-426614174000/invitations',
    });
    expect(collaborationRoute(req)).toEqual({
      resource: 'workspaces',
      parts: ['123e4567-e89b-42d3-a456-426614174000', 'invitations'],
    });
  });

  it('does not intercept ordinary board stats', () => {
    expect(isCollaborationRequest(request('/api/stats'))).toBe(false);
  });
});
