# Next Task Submission Notes

Next Task is a full-stack Kanban board built with React, TypeScript, Vite, Vercel Serverless Functions, Supabase Auth, Supabase Postgres, and Supabase Row Level Security. The current app package version is `0.0.3`; public-readiness fixes from the `v0.0.3.1` roadmap are included.

## Database Schema

The canonical schema lives in:

- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_reorder_rpc.sql`

Those two files are the full SQL source of truth. A clear schema description follows.

### Extensions

- `pgcrypto`: used for `gen_random_uuid()`.

### Enums

`public.task_status`

- `todo`
- `in_progress`
- `in_review`
- `done`

`public.task_priority`

- `low`
- `normal`
- `high`

`public.activity_type`

- `task_created`
- `task_updated`
- `task_moved`
- `assignee_added`
- `assignee_removed`
- `label_added`
- `label_removed`
- `comment_added`
- `comment_deleted`
- `task_deleted`

### Tables

`public.tasks`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `gen_random_uuid()` |
| `user_id` | `uuid` | Defaults to `auth.uid()`, references `auth.users(id)` with cascade delete |
| `title` | `text` | Required, trimmed length 1-160 |
| `description` | `text` | Required, defaults to empty string |
| `status` | `task_status` | Required, defaults to `todo` |
| `priority` | `task_priority` | Required, defaults to `normal` |
| `due_date` | `date` | Optional |
| `position` | `integer` | Required, defaults to `1000`; used for ordering within a status lane |
| `created_at` | `timestamptz` | Required, defaults to `now()` |
| `updated_at` | `timestamptz` | Required, defaults to `now()` |

Constraints:

- Primary key on `id`.
- Unique `(id, user_id)` so join tables can enforce ownership-aware foreign keys.

`public.team_members`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `gen_random_uuid()` |
| `user_id` | `uuid` | Defaults to `auth.uid()`, references `auth.users(id)` with cascade delete |
| `name` | `text` | Required, trimmed length 1-80 |
| `avatar_url` | `text` | Optional |
| `color` | `text` | Required hex color, defaults to `#7A5AF8` |
| `created_at` | `timestamptz` | Required, defaults to `now()` |
| `updated_at` | `timestamptz` | Required, defaults to `now()` |

Constraints and indexes:

- Primary key on `id`.
- Unique `(id, user_id)`.
- Unique index on `(user_id, lower(name))`.

`public.labels`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `gen_random_uuid()` |
| `user_id` | `uuid` | Defaults to `auth.uid()`, references `auth.users(id)` with cascade delete |
| `name` | `text` | Required, trimmed length 1-40 |
| `color` | `text` | Required hex color, defaults to `#2E90FA` |
| `created_at` | `timestamptz` | Required, defaults to `now()` |
| `updated_at` | `timestamptz` | Required, defaults to `now()` |

Constraints and indexes:

- Primary key on `id`.
- Unique `(id, user_id)`.
- Unique index on `(user_id, lower(name))`.

`public.task_assignees`

| Column | Type | Notes |
| --- | --- | --- |
| `task_id` | `uuid` | References `tasks(id, user_id)` with cascade delete |
| `member_id` | `uuid` | References `team_members(id, user_id)` with cascade delete |
| `user_id` | `uuid` | Defaults to `auth.uid()`, references `auth.users(id)` with cascade delete |
| `created_at` | `timestamptz` | Required, defaults to `now()` |

Constraints:

- Primary key on `(task_id, member_id)`.
- Ownership-aware foreign keys prevent assigning a task to another user's member.

`public.task_labels`

| Column | Type | Notes |
| --- | --- | --- |
| `task_id` | `uuid` | References `tasks(id, user_id)` with cascade delete |
| `label_id` | `uuid` | References `labels(id, user_id)` with cascade delete |
| `user_id` | `uuid` | Defaults to `auth.uid()`, references `auth.users(id)` with cascade delete |
| `created_at` | `timestamptz` | Required, defaults to `now()` |

Constraints:

- Primary key on `(task_id, label_id)`.
- Ownership-aware foreign keys prevent linking a task to another user's label.

`public.comments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `gen_random_uuid()` |
| `task_id` | `uuid` | References `tasks(id, user_id)` with cascade delete |
| `user_id` | `uuid` | Defaults to `auth.uid()`, references `auth.users(id)` with cascade delete |
| `body` | `text` | Required, trimmed length 1-2000 |
| `created_at` | `timestamptz` | Required, defaults to `now()` |
| `updated_at` | `timestamptz` | Required, defaults to `now()` |

`public.activity_events`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `gen_random_uuid()` |
| `task_id` | `uuid` | References `tasks(id, user_id)` with cascade delete |
| `user_id` | `uuid` | Defaults to `auth.uid()`, references `auth.users(id)` with cascade delete |
| `type` | `activity_type` | Required |
| `message` | `text` | Required |
| `metadata` | `jsonb` | Required, defaults to `{}` |
| `created_at` | `timestamptz` | Required, defaults to `now()` |

### Indexes

- `tasks_user_status_position_idx` on `(user_id, status, position)`
- `tasks_user_due_date_idx` on `(user_id, due_date)`
- `task_assignees_user_member_idx` on `(user_id, member_id)`
- `task_labels_user_label_idx` on `(user_id, label_id)`
- `comments_task_created_idx` on `(task_id, created_at)`
- `activity_task_created_idx` on `(task_id, created_at desc)`
- `team_members_user_name_idx` on `(user_id, lower(name))`
- `labels_user_name_idx` on `(user_id, lower(name))`

### Triggers and Functions

`public.set_updated_at()`

- Shared trigger function that updates `updated_at` before row updates.
- Installed on `tasks`, `team_members`, `labels`, and `comments`.

`public.status_label(status task_status)`

- Converts status enum values into UI-readable labels for activity messages.

`public.reorder_tasks(updates jsonb)`

- Transactional `security invoker` RPC used by drag-and-drop reorder.
- Accepts an array of `{ id, status, position }` updates.
- Rejects unauthenticated calls, empty update batches, duplicate task ids, invalid positions, and tasks not owned by the current user.
- Updates task status/position and records a `task_moved` activity event when the status changes.
- Uses the caller's RLS context, so it cannot bypass user isolation.

### Row Level Security

RLS is enabled on every app table:

- `tasks`
- `team_members`
- `labels`
- `task_assignees`
- `task_labels`
- `comments`
- `activity_events`

Each table has `select`, `insert`, `update`, and `delete` policies for the `authenticated` role. All policies enforce:

```sql
(select auth.uid()) = user_id
```

For inserts and updates, the same condition is also used as the `with check` expression. The API uses the user's Supabase access token, not a service-role key, so RLS is the main security boundary.

## Local Setup

Prerequisites:

- Node.js 20 or newer is recommended.
- npm.
- A Supabase project if you want to run against the real backend.

Install and configure:

```bash
cd next-task
npm install
cp .env.example .env
```

The `.env.example` file contains the public Supabase URL and anon/publishable key used by this assessment deployment. It also sets:

```bash
VITE_ENABLE_LOCAL_DEMO=false
API_WRITE_LIMIT_PER_MINUTE=45
```

For quick UI-only local development without Vercel API handlers or Supabase writes:

```bash
VITE_ENABLE_LOCAL_DEMO=true npm run dev
```

Open the Vite URL printed by the terminal.

For local development against the API handlers and Supabase:

```bash
npm run dev:full
```

`dev:full` serves Vite plus the Vercel-style API routes from `api/` on `http://127.0.0.1:5174`.

To prepare a new Supabase project:

1. Enable anonymous sign-ins.
2. Enable email auth and magic-link sign-in.
3. Enable Google and GitHub sign-in providers if you want OAuth recovery.
4. Add local and production redirect URLs in Supabase Auth settings:
   - `http://127.0.0.1:5174`
   - `http://localhost:5174`
   - your Vercel preview URL
   - your production/custom domain
5. Run `supabase/migrations/001_init.sql` in the Supabase SQL Editor.
6. Run `supabase/migrations/002_reorder_rpc.sql` in the Supabase SQL Editor.

Useful verification commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify:ci
npm run verify:supabase
npm run smoke:browser
```

`npm run smoke:browser` starts the local API-backed app and runs Playwright through the main flows: sample board load, refresh toast contrast, create/edit/comment/filter, body drag, 2.5 second long-press drag, handle drag, clear-board persistence, manager focus, changelog, mobile layout, and serious/critical axe accessibility checks.

## Advanced Features Built

- Supabase anonymous guest sessions: first-time visitors automatically get an authenticated guest user, so task data is still protected by RLS and tied to a real auth identity.
- Board recovery: users can save a guest board to email with Supabase `updateUser`, sign in by email magic link, or continue with Google/GitHub.
- Row Level Security: every table is scoped by `user_id = auth.uid()`. The server never needs a Supabase service-role key.
- Full API layer: Vercel Serverless Functions handle tasks, comments, activity, labels, team members, stats, demo-board bootstrap, and board reset.
- Atomic reorder RPC: drag/drop uses `reorder_tasks(jsonb)` so multi-card position changes commit or fail as one transaction.
- Rich drag-and-drop: dnd-kit supports card-body drag after pointer movement, 2.5 second long-press activation, immediate dedicated drag handle activation, and keyboard-compatible sortable behavior.
- Multi-assignee and label system: tasks can have multiple team members and labels through ownership-aware join tables.
- Activity timeline: task creation, edits, moves, assignee changes, label changes, comments, and deletes are logged into `activity_events`.
- Comments: task comments are persisted, counted on cards, and displayed in the drawer.
- Filters and stats: search, status, priority, due-state, label, and assignee filters work with summary stats.
- Responsive board: desktop shows all lanes; mobile uses status tabs with one active lane to avoid horizontal overflow.
- Theme system: light/dark mode with themed lanes, cards, toasts, and persistent preference.
- Demo board and clear-board flow: users can load sample data, reset the board, and verify persistence after reload.
- Public-readiness checks: TypeScript, ESLint, Vitest, production build, Supabase verification, production deployment verification, and browser smoke with screenshots.
- Abuse controls: write APIs enforce configurable per-user and per-IP rate limits for anonymous-session traffic.

## Tradeoffs and Future Improvements

- The app is single-user board oriented. The schema supports team members as assignees, but it does not yet support true shared workspaces, invitations, per-board roles, or collaborative multi-user boards.
- There is no separate `boards` table. All records are scoped directly to `user_id`, which keeps the assessment implementation simpler but would need to change for multiple boards per account.
- Reorder is atomic now, but positions are still integer gaps. For very heavy reorder usage, I would add periodic compaction or switch to a fractional ranking strategy.
- Filtering is split between SQL filters and in-memory hydrated filters for relationships such as labels and assignees. For larger datasets, I would move those relationship filters into SQL joins/RPCs and add pagination.
- Activity logging is useful but not exhaustive diff history. With more time I would store structured before/after fields for edits and expose audit-friendly filtering.
- The demo-board bootstrap is product-friendly, but it is still app-specific seed logic. In a larger app I would separate demo seeding from production API code more cleanly.
- Anonymous auth is convenient for onboarding, but public deployments should keep Supabase CAPTCHA/rate limits enabled and monitor abuse. The current API rate limits are in-memory per serverless instance, which is simple but not globally consistent.
- Offline support is not implemented. I would add optimistic offline queues and conflict handling if the app needed serious mobile or unreliable-network use.
- The UI is polished and responsive, but dense boards still need virtualization and better bulk actions once task counts grow.
- Test coverage includes unit, integration-style API contract tests, and browser smoke coverage. With more time I would add dedicated end-to-end tests for OAuth recovery, email magic links, and cross-browser drag/touch behavior.
