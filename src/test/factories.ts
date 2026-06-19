import type { Label, Task, TaskPriority, TaskStatus, TeamMember } from '../lib/types';

let seq = 0;
const nextId = () => `id-${(seq += 1)}`;

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? nextId();
  return {
    id,
    user_id: 'user-1',
    title: `Task ${id}`,
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'normal' as TaskPriority,
    due_date: null,
    position: 1000,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    assignees: [],
    labels: [],
    comment_count: 0,
    latest_activity_at: null,
    ...overrides,
  };
}

export function makeLabel(overrides: Partial<Label> = {}): Label {
  const id = overrides.id ?? nextId();
  return {
    id,
    user_id: 'user-1',
    name: `Label ${id}`,
    color: '#2E90FA',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  const id = overrides.id ?? nextId();
  return {
    id,
    user_id: 'user-1',
    name: `Member ${id}`,
    avatar_url: null,
    color: '#7A5AF8',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
