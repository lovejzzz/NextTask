import { describe, expect, it } from 'vitest';

import {
  commentSchema,
  labelSchema,
  reorderSchema,
  taskCreateSchema,
  taskUpdateSchema,
  teamMemberSchema,
} from './validation.js';

// Valid RFC-9562 v4 UUID (correct version + variant nibbles for Zod v4's strict check).
const UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('taskCreateSchema', () => {
  it('applies defaults for a minimal valid task', () => {
    const parsed = taskCreateSchema.parse({ title: 'Ship it' });
    expect(parsed).toMatchObject({
      title: 'Ship it',
      description: '',
      status: 'todo',
      priority: 'normal',
      due_date: null,
      assignee_ids: [],
      label_ids: [],
    });
  });

  it('trims the title and rejects empty/oversized titles', () => {
    expect(taskCreateSchema.parse({ title: '  Trim me  ' }).title).toBe('Trim me');
    expect(() => taskCreateSchema.parse({ title: '   ' })).toThrow();
    expect(() => taskCreateSchema.parse({ title: 'x'.repeat(161) })).toThrow();
  });

  it('normalizes due_date: "" becomes null, valid dates pass, garbage throws', () => {
    expect(taskCreateSchema.parse({ title: 'a', due_date: '' }).due_date).toBeNull();
    expect(taskCreateSchema.parse({ title: 'a', due_date: '2026-06-18' }).due_date).toBe('2026-06-18');
    expect(() => taskCreateSchema.parse({ title: 'a', due_date: '06/18/2026' })).toThrow();
  });

  it('requires uuids for assignee and label ids', () => {
    expect(taskCreateSchema.parse({ title: 'a', assignee_ids: [UUID] }).assignee_ids).toEqual([UUID]);
    expect(() => taskCreateSchema.parse({ title: 'a', assignee_ids: ['not-a-uuid'] })).toThrow();
  });

  it('rejects an unknown status or priority', () => {
    expect(() => taskCreateSchema.parse({ title: 'a', status: 'archived' })).toThrow();
    expect(() => taskCreateSchema.parse({ title: 'a', priority: 'urgent' })).toThrow();
  });
});

describe('taskUpdateSchema', () => {
  it('accepts an empty patch (all fields optional)', () => {
    expect(taskUpdateSchema.parse({})).toEqual({ due_date: null });
  });

  it('rejects a negative position', () => {
    expect(() => taskUpdateSchema.parse({ position: -1 })).toThrow();
    expect(taskUpdateSchema.parse({ position: 0 }).position).toBe(0);
  });
});

describe('reorderSchema', () => {
  it('requires at least one update', () => {
    expect(() => reorderSchema.parse({ updates: [] })).toThrow();
  });

  it('accepts well-formed updates and rejects bad positions/status', () => {
    expect(reorderSchema.parse({ updates: [{ id: UUID, status: 'done', position: 2000 }] }).updates).toHaveLength(1);
    expect(() => reorderSchema.parse({ updates: [{ id: UUID, status: 'done', position: -5 }] })).toThrow();
    expect(() => reorderSchema.parse({ updates: [{ id: UUID, status: 'nope', position: 1 }] })).toThrow();
  });
});

describe('teamMemberSchema & labelSchema', () => {
  it('validates 6-digit hex colors', () => {
    expect(teamMemberSchema.parse({ name: 'Avery', color: '#7A5AF8' }).color).toBe('#7A5AF8');
    expect(() => teamMemberSchema.parse({ name: 'Avery', color: 'purple' })).toThrow();
    expect(labelSchema.parse({ name: 'Bug' }).color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(() => labelSchema.parse({ name: '' })).toThrow();
  });
});

describe('commentSchema', () => {
  it('enforces a non-empty, bounded body', () => {
    expect(commentSchema.parse({ body: 'looks good' }).body).toBe('looks good');
    expect(() => commentSchema.parse({ body: '   ' })).toThrow();
    expect(() => commentSchema.parse({ body: 'x'.repeat(2001) })).toThrow();
  });
});
