import { z } from 'zod';
import { isDateOnly } from './dateOnly.js';

export const idSchema = z.string().uuid('Id must be a valid UUID');
export const statusSchema = z.enum(['todo', 'in_progress', 'in_review', 'done']);
export const prioritySchema = z.enum(['low', 'normal', 'high']);
const idArraySchema = z
  .array(idSchema)
  .max(100, 'Too many ids')
  .refine((ids) => new Set(ids).size === ids.length, 'Ids must be unique');

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format')
  .refine(isDateOnly, 'Use a valid calendar date');
const nullableDateSchema = z
  .union([calendarDateSchema, z.literal(''), z.null()])
  .transform((value) => (value === '' ? null : value));
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a 6-digit hex color');
const avatarUrlSchema = z
  .union([z.string().trim().max(2048, 'Avatar URL is too long').url('Avatar URL must be valid'), z.literal(''), z.null()])
  .transform((value) => value || null);

export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(160, 'Title is too long'),
    description: z.string().trim().max(4000).optional().default(''),
    status: statusSchema.optional().default('todo'),
    priority: prioritySchema.optional().default('normal'),
    due_date: nullableDateSchema.optional().default(null),
    assignee_ids: idArraySchema.optional().default([]),
    label_ids: idArraySchema.optional().default([]),
  })
  .strict();

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    // Optional must wrap the transform so an omitted PATCH field stays omitted;
    // otherwise unrelated edits silently clear an existing due date.
    due_date: nullableDateSchema.optional(),
    position: z.number().int().min(0).optional(),
    assignee_ids: idArraySchema.optional(),
    label_ids: idArraySchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'At least one task field is required');

export const reorderSchema = z
  .object({
    updates: z
      .array(
        z
          .object({
            id: idSchema,
            status: statusSchema,
            position: z.number().int().min(0),
          })
          .strict(),
      )
      .min(1)
      .max(500, 'Too many reorder updates')
      .refine((updates) => new Set(updates.map((update) => update.id)).size === updates.length, 'Task ids must be unique'),
  })
  .strict();

export const boardFilterSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    label_id: idSchema.optional(),
    assignee_id: idSchema.optional(),
    due: z.enum(['overdue', 'soon', 'none']).optional(),
  })
  .strict();

export const teamMemberSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    avatar_url: avatarUrlSchema.optional().default(null),
    color: colorSchema.optional().default('#7A5AF8'),
  })
  .strict();

export const teamMemberUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80).optional(),
    avatar_url: avatarUrlSchema.optional(),
    color: colorSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'At least one team member field is required');

export const labelSchema = z
  .object({
    name: z.string().trim().min(1, 'Label name is required').max(40),
    color: colorSchema.optional().default('#2E90FA'),
  })
  .strict();

export const labelUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Label name is required').max(40).optional(),
    color: colorSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'At least one label field is required');

export const commentSchema = z
  .object({
    body: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
  })
  .strict();
