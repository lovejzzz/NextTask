import { describe, expect, it } from 'vitest';

import {
  commentSchema,
  boardFilterSchema,
  labelSchema,
  labelUpdateSchema,
  reorderSchema,
  taskCreateSchema,
  taskUpdateSchema,
  teamMemberSchema,
  teamMemberUpdateSchema,
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

  it('normalizes due_date and rejects malformed or impossible calendar dates', () => {
    expect(taskCreateSchema.parse({ title: 'a', due_date: '' }).due_date).toBeNull();
    expect(taskCreateSchema.parse({ title: 'a', due_date: '2026-06-18' }).due_date).toBe('2026-06-18');
    expect(taskCreateSchema.parse({ title: 'a', due_date: '2028-02-29' }).due_date).toBe('2028-02-29');
    expect(() => taskCreateSchema.parse({ title: 'a', due_date: '06/18/2026' })).toThrow();
    expect(() => taskCreateSchema.parse({ title: 'a', due_date: '2026-02-29' })).toThrow(/calendar/);
    expect(() => taskCreateSchema.parse({ title: 'a', due_date: '2026-13-01' })).toThrow(/calendar/);
  });

  it('requires uuids for assignee and label ids', () => {
    expect(taskCreateSchema.parse({ title: 'a', assignee_ids: [UUID] }).assignee_ids).toEqual([UUID]);
    expect(() => taskCreateSchema.parse({ title: 'a', assignee_ids: ['not-a-uuid'] })).toThrow();
    expect(() => taskCreateSchema.parse({ title: 'a', assignee_ids: [UUID, UUID] })).toThrow(/unique/);
  });

  it('rejects an unknown status or priority', () => {
    expect(() => taskCreateSchema.parse({ title: 'a', status: 'archived' })).toThrow();
    expect(() => taskCreateSchema.parse({ title: 'a', priority: 'urgent' })).toThrow();
  });

  it('rejects unknown request fields instead of silently discarding them', () => {
    expect(() => taskCreateSchema.parse({ title: 'a', unexpected: true })).toThrow();
  });
});

describe('taskUpdateSchema', () => {
  it('requires at least one known field', () => {
    expect(() => taskUpdateSchema.parse({})).toThrow(/At least one/);
    expect(() => taskUpdateSchema.parse({ unexpected: true })).toThrow();
  });

  it('only clears a due date when the patch explicitly requests it', () => {
    expect(taskUpdateSchema.parse({ title: 'Keep date' })).toEqual({ title: 'Keep date' });
    expect(taskUpdateSchema.parse({ due_date: '' })).toEqual({ due_date: null });
    expect(taskUpdateSchema.parse({ due_date: null })).toEqual({ due_date: null });
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
    expect(() =>
      reorderSchema.parse({
        updates: [
          { id: UUID, status: 'todo', position: 1000 },
          { id: UUID, status: 'done', position: 2000 },
        ],
      }),
    ).toThrow(/unique/);
  });
});

describe('boardFilterSchema', () => {
  it('accepts known filters and rejects malformed values before querying PostgREST', () => {
    expect(boardFilterSchema.parse({ status: 'done', due: 'soon', label_id: UUID })).toEqual({
      status: 'done',
      due: 'soon',
      label_id: UUID,
    });
    expect(() => boardFilterSchema.parse({ status: 'archived' })).toThrow();
    expect(() => boardFilterSchema.parse({ label_id: 'not-a-uuid' })).toThrow();
    expect(() => boardFilterSchema.parse({ search: 'x'.repeat(201) })).toThrow();
  });
});

describe('teamMemberSchema & labelSchema', () => {
  it('validates 6-digit hex colors', () => {
    expect(teamMemberSchema.parse({ name: 'Avery', color: '#7A5AF8' }).color).toBe('#7A5AF8');
    expect(() => teamMemberSchema.parse({ name: 'Avery', color: 'purple' })).toThrow();
    expect(labelSchema.parse({ name: 'Bug' }).color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(() => labelSchema.parse({ name: '' })).toThrow();
  });

  it('keeps omitted update fields omitted and rejects empty patches', () => {
    expect(teamMemberUpdateSchema.parse({ name: 'Avery' })).toEqual({ name: 'Avery' });
    expect(labelUpdateSchema.parse({ name: 'Bug' })).toEqual({ name: 'Bug' });
    expect(() => teamMemberUpdateSchema.parse({})).toThrow(/At least one/);
    expect(() => labelUpdateSchema.parse({})).toThrow(/At least one/);
  });

  it('bounds avatar URLs at the API boundary', () => {
    expect(teamMemberSchema.parse({ name: 'Avery', avatar_url: 'https://example.com/avatar.png' }).avatar_url).toBe(
      'https://example.com/avatar.png',
    );
    expect(() =>
      teamMemberSchema.parse({ name: 'Avery', avatar_url: `https://example.com/${'x'.repeat(2050)}` }),
    ).toThrow(/too long/);
  });
});

describe('commentSchema', () => {
  it('enforces a non-empty, bounded body', () => {
    expect(commentSchema.parse({ body: 'looks good' }).body).toBe('looks good');
    expect(() => commentSchema.parse({ body: '   ' })).toThrow();
    expect(() => commentSchema.parse({ body: 'x'.repeat(2001) })).toThrow();
  });
});
