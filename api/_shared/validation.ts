import { z } from 'zod';

export const statusSchema = z.enum(['todo', 'in_progress', 'in_review', 'done']);
export const prioritySchema = z.enum(['low', 'normal', 'high']);

const nullableDateSchema = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value));

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160, 'Title is too long'),
  description: z.string().trim().max(4000).optional().default(''),
  status: statusSchema.optional().default('todo'),
  priority: prioritySchema.optional().default('normal'),
  due_date: nullableDateSchema,
  assignee_ids: z.array(z.string().uuid()).optional().default([]),
  label_ids: z.array(z.string().uuid()).optional().default([]),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  due_date: nullableDateSchema,
  position: z.number().int().min(0).optional(),
  assignee_ids: z.array(z.string().uuid()).optional(),
  label_ids: z.array(z.string().uuid()).optional(),
});

export const reorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: statusSchema,
        position: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  avatar_url: z.union([z.string().url(), z.literal(''), z.null()]).optional().transform((value) => value || null),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a 6-digit hex color').optional().default('#7A5AF8'),
});

export const labelSchema = z.object({
  name: z.string().trim().min(1, 'Label name is required').max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a 6-digit hex color').optional().default('#2E90FA'),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
});
