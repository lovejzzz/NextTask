# Next Task

Next Task is a secure collaborative Kanban workspace built with React, TypeScript, Vite, Vercel Serverless Functions, Supabase Auth, Realtime, and Row Level Security.

Current app version: `0.2.0` (derived from `package.json`).

## Features

- Four-column Kanban board: To Do, In Progress, In Review, Done
- Smooth drag-and-drop task movement and ordering
- Drag a card from anywhere on its body by moving the pointer, long-press for 2.5 seconds to activate a drag, or use the dedicated drag handle
- A dedicated edit icon opens the task detail drawer without making single-click card behavior ambiguous
- Mobile status navigation with one visible lane at a time and direct status move controls
- Automatic guest session via Supabase anonymous auth
- Email recovery links so users can save and reopen a board across devices
- Multi-board workspaces with owner, editor, and viewer roles
- Expiring one-time invitation links with optional email binding
- Transactional ownership transfer, member departure, and self-service account deletion
- Revocable invitation links with preserved, exportable audit evidence
- Authorized live collaborator Presence on each board
- Owner-only CSV audit export for workspace, board, invitation, membership, and ownership events
- Realtime synchronization for tasks, comments, activity, members, and boards
- Board-scoped authorization through RLS policies on every shared data table
- Backend API endpoints for task reads, creation, updates, reorder, comments, activity, team members, labels, and stats
- Team members and multi-assignee tasks
- Task comments
- Activity timeline
- Labels and filtering
- Due-date urgency indicators
- Search and filtering
- Active filter chips with result counts
- Board summary stats
- Inline column task capture plus full task drawer editing
- Light/dark theme toggle and an in-app changelog behind the bottom version link
- High-end responsive UI with motion, skeleton states, empty states, retry states, and error states

## Stack

- React + TypeScript + Vite
- Vercel Serverless Functions in `api/`
- Supabase Auth + Postgres + RLS
- dnd-kit for drag-and-drop
- TanStack Query for server state
- Framer Motion for transitions
- Tailwind CSS and custom CSS variables
- Zod for API validation
- x402 for per-request USDC payments

## FIVE paid agent API

Next Task hosts a public, machine-readable bounty due-diligence service for AI agents:

```http
GET  https://nexttask.team/api/x402/bounty-check
POST https://nexttask.team/api/x402/bounty-check
```

`GET` is free and returns the service manifest. `POST` accepts JSON containing a public GitHub issue URL and costs `$1.00` in USDC on Base mainnet through the x402 protocol:

```json
{
  "issueUrl": "https://github.com/owner/repository/issues/123"
}
```

The paid report checks issue state, assignment, staleness, repository activity, referenced pull requests, and public funding signals. A funding signal is explicitly not treated as proof of escrow. Invalid inputs and upstream GitHub failures do not settle payment.

The public endpoint is folded into the existing stats serverless function through a Vercel rewrite so the project remains within its 12-function deployment limit. Its payment stack is lazy-loaded only for bounty-check requests, keeping normal board stats independent of x402 initialization. PayAI's production facilitator handles payment verification and settlement; Bazaar discovery metadata is included in the x402 payment requirements.

The machine-readable OpenAPI discovery contract is served at `https://nexttask.team/openapi.json` for agent marketplaces and tooling.

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

The supplied public Supabase values and production-safe defaults are already included:

```bash
VITE_SUPABASE_URL=https://volqeerbqugpwbedsbch.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_woGdY7Ogw4hDwlZvnV4-ew_8_pcDXEd
SUPABASE_URL=https://volqeerbqugpwbedsbch.supabase.co
SUPABASE_ANON_KEY=sb_publishable_woGdY7Ogw4hDwlZvnV4-ew_8_pcDXEd
VITE_ENABLE_LOCAL_DEMO=false
API_WRITE_LIMIT_PER_MINUTE=45
```

For fast local UI work without API handlers, set:

```bash
VITE_ENABLE_LOCAL_DEMO=true
```

Run locally:

```bash
npm run dev
```

`npm run dev` runs the Vite frontend only. Use it with `VITE_ENABLE_LOCAL_DEMO=true` for fast UI work.

To run the frontend with the local API handlers and real Supabase data, set `VITE_ENABLE_LOCAL_DEMO=false`, then run:

```bash
npm run dev:full
```

This starts a Vite middleware server on `http://127.0.0.1:5174` and serves the Vercel-style routes from `api/`.

For automated browser verification against the local API-backed app:

```bash
npm run smoke:browser
```

The smoke script starts `npm run dev:full` on `127.0.0.1:5175` unless `SMOKE_BASE_URL` is provided. It covers deployment security headers/API no-store behavior, sample data, task create/edit (via the card edit icon), comments, filters, card-body drag, 2.5 second long-press drag, immediate handle drag, Clear board persistence after reload, manager dialog focus, changelog access, axe accessibility, and 390px mobile status/stat rendering. Screenshots are written to ignored `verification-smoke-*.png` files.

Set `SMOKE_TIMEZONE` to repeat the browser suite in a specific IANA time zone, for example `SMOKE_TIMEZONE=Pacific/Honolulu npm run smoke:browser`. The app sends the browser's local calendar date to date-sensitive API reads so due-date filters and stats remain consistent with task cards near midnight and across time zones.

## Supabase setup

1. Create or open the Supabase project.
2. Enable anonymous sign-ins in Auth settings.
3. Enable Email Auth and magic links in Auth settings.
4. Enable Google and GitHub sign-in providers.
5. Enable manual identity linking so a guest board can be connected to Google or GitHub without creating a separate empty account. If this is off, Google/GitHub still sign in, but they may not preserve an unsaved guest board.
6. Add the production URL and local dev URLs to Auth redirect URLs:
   - `http://127.0.0.1:5174`
   - `http://localhost:5174`
   - the deployed Vercel URL
   - the custom domain, if used
7. Open the SQL Editor.
8. Run `supabase/migrations/001_init.sql`.
9. Run `supabase/migrations/002_reorder_rpc.sql`.
10. Run `supabase/migrations/003_data_constraints.sql`.
11. Run `supabase/migrations/004_workspace_collaboration.sql`.
12. Run `supabase/migrations/005_lifecycle_presence_audit.sql`.
13. Confirm RLS is enabled on:
   - `workspaces`
   - `workspace_members`
   - `boards`
   - `workspace_invitations`
   - `workspace_audit_events`
   - `tasks`
   - `team_members`
   - `task_assignees`
   - `labels`
   - `task_labels`
   - `comments`
   - `activity_events`

`002_reorder_rpc.sql` installs transactional drag/drop. `003_data_constraints.sql` adds database validation, append-only activity, and transactional reset. `004_workspace_collaboration.sql` safely backfills each existing user into a personal workspace and board, switches authorization to board membership, installs role/invitation RPCs, publishes realtime tables, and adds a durable authenticated-write limiter. `005_lifecycle_presence_audit.sql` adds transactional ownership/account lifecycle operations, immutable owner-only audit history, preserved invitation revocation, and membership-authorized private Presence channels. `npm run verify:supabase` exercises owner/editor/viewer behavior, Presence authorization, invitation replay/revocation, ownership transfer, member departure, account deletion, audit immutability, nonmember isolation, cross-board relations, reorder rollback, database constraints, and the durable limiter.

Do not use or expose the Supabase service role key. This project only needs the public anon/publishable key.

For public deployments, keep anonymous sign-ins protected with Supabase CAPTCHA/rate-limit settings where available. Before authentication, the API enforces a bounded per-instance IP limit through `API_IP_WRITE_LIMIT_PER_MINUTE`; authenticated writes additionally consume a durable Postgres bucket through `API_WRITE_LIMIT_PER_MINUTE`.

Local-only escape hatches exist for unfinished development databases:

```bash
ALLOW_REORDER_RPC_FALLBACK=true npm run dev:full
ALLOW_RESET_RPC_FALLBACK=true npm run dev:full
```

Do not use these flags for public release or production deployment.

## API routes

Required assessment endpoints:

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`

Additional product endpoints:

- `DELETE /api/tasks/:id`
- `PATCH /api/tasks/reorder`
- `GET /api/tasks/:id/comments`
- `POST /api/tasks/:id/comments`
- `DELETE /api/tasks/:id/comments/:commentId`
- `GET /api/tasks/:id/activity`
- `GET /api/team-members`
- `POST /api/team-members`
- `PATCH /api/team-members/:id`
- `DELETE /api/team-members/:id`
- `GET /api/labels`
- `POST /api/labels`
- `PATCH /api/labels/:id`
- `DELETE /api/labels/:id`
- `GET /api/stats`
- `POST /api/bootstrap/demo`
- `POST /api/bootstrap/reset`
- `GET /api/workspaces`
- `POST /api/workspaces`
- `PATCH /api/workspaces/:id`
- `DELETE /api/workspaces/:id`
- `POST /api/workspaces/:id/boards`
- `POST /api/workspaces/:id/invitations`
- `DELETE /api/workspaces/:id/invitations/:invitationId`
- `POST /api/workspaces/:id/transfer`
- `POST /api/workspaces/:id/leave`
- `GET /api/workspaces/:id/audit`
- `PATCH /api/workspaces/:id/members/:userId`
- `DELETE /api/workspaces/:id/members/:userId`
- `PATCH /api/boards/:id`
- `DELETE /api/boards/:id`
- `POST /api/invitations/accept`
- `DELETE /api/account`
- `GET /api/x402/bounty-check` (public service manifest)
- `POST /api/x402/bounty-check` (public, x402 payment required)

Authenticated board API requests must include:

```http
Authorization: Bearer <supabase_access_token>
X-NextTask-Board-Id: <board_uuid>
```

The API validates the selected board and role before every board request, then creates a Supabase client with the user token so RLS remains the authoritative security boundary. Responses include `X-Request-Id` for operational correlation.

## Vercel deployment

Import this repository into Vercel.

Use:

- Build command: `npm run verify:production-env && npm run build`
- Output directory: `dist`
- Install command: `npm ci`

Environment variables:

```bash
VITE_SUPABASE_URL=https://volqeerbqugpwbedsbch.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_woGdY7Ogw4hDwlZvnV4-ew_8_pcDXEd
VITE_ENABLE_LOCAL_DEMO=false
SUPABASE_URL=https://volqeerbqugpwbedsbch.supabase.co
SUPABASE_ANON_KEY=sb_publishable_woGdY7Ogw4hDwlZvnV4-ew_8_pcDXEd
API_WRITE_LIMIT_PER_MINUTE=45
API_IP_WRITE_LIMIT_PER_MINUTE=120
```

The browser and server Supabase URLs must resolve to the same project. Both configured keys must be public anon/publishable keys; `npm run verify:production-env` rejects secret and legacy service-role credentials before they can enter a browser bundle or bypass RLS on the server.

Do not deploy with `VITE_ENABLE_LOCAL_DEMO=true`; that bypasses the API-backed data path in the browser bundle.
Write APIs enforce both per-user and per-IP minute buckets to reduce anonymous-session abuse.

## Verification checklist

Run:

```bash
npm run verify:ci
npm run verify:config
npm run verify:production-env
npm run verify:supabase
npm run smoke:browser
```

For the full local release gate, run:

```bash
npm run verify:release
```

After deployment, run:

```bash
npm run verify:deployment -- https://your-deployment.vercel.app
```

`vercel.json` applies CSP, anti-framing, MIME-sniffing, referrer, permissions, and HSTS headers to the deployment. Authenticated API responses are explicitly `no-store`, hashed assets are immutable, and `npm run verify:config` keeps those rules, rewrites, Node 22, and `npm ci` enforced in CI. The deployment verifier checks the response headers again on the live URL.

Manual checks:

- Guest auth starts automatically
- Email recovery sends a board-save confirmation link
- Returning users can request a sign-in link
- Demo board can be loaded
- Task create/edit/delete works
- Drag-and-drop persists
- A card can be dragged from anywhere on its body; 2.5 second long-press activates drag; the edit icon opens the detail drawer
- Clear board removes tasks, comments, activity, team members, and labels, then stays empty after refresh
- Team members can be created and assigned
- Team members and labels can be edited
- Labels can be created, assigned, and filtered
- Comments appear with timestamps
- Activity timeline updates
- Search and filters work
- Active filter chips clear filters correctly
- Stats update after mutations
- Empty/loading/error states are visible
- Mobile layout exposes all statuses and stats at 390px width
- The bottom grey version number opens the changelog
- Two browser profiles cannot see each other's data after the migrations are applied
- An owner can create a workspace, board, editor invite, and viewer invite
- Editors can create and update tasks; viewers can read but cannot mutate
- Realtime changes appear in a second signed-in browser without manual refresh
- Authorized collaborators appear in the board Presence indicator; nonmembers cannot join its private channel
- Reusing an accepted invitation fails and accepting a lower-role link cannot downgrade an existing member
- Revoked invitations stop working and remain in the owner audit export
- Ownership transfer changes both roles atomically; nonowners can leave and owners must transfer first
- Account deletion refuses unresolved shared ownership and removes an unencumbered identity

## v0.2.0 public release checklist

- Supabase migration `supabase/migrations/001_init.sql` has been applied.
- Supabase migration `supabase/migrations/002_reorder_rpc.sql` has been applied.
- Supabase migration `supabase/migrations/003_data_constraints.sql` has been applied.
- Supabase migration `supabase/migrations/004_workspace_collaboration.sql` has been applied after a pre-migration row-count backup/check.
- Supabase migration `supabase/migrations/005_lifecycle_presence_audit.sql` has been applied after verifying v0.1 workspace/member/board counts.
- Anonymous auth, email auth, and required OAuth redirect URLs are configured.
- Vercel env vars match the deployment section and `VITE_ENABLE_LOCAL_DEMO=false`.
- `npm run verify:ci` passes locally and in CI.
- `npm run verify:production-env` passes before build.
- `npm run verify:supabase` passes against the target project with collaboration, private Presence, lifecycle, audit, account deletion, isolation, invitations, board boundaries, constraints, reorder, and rate-limit checks all `ok: true`.
- `npm run smoke:browser` passes locally against the full API-backed dev server.
- `npm run verify:release` passes before the public push.
- After deploy, run `npm run verify:deployment -- https://your-deployment.vercel.app`.

## Repository hygiene

Only the runnable app files belong in this repository. Do not commit:

- The original assessment `.docx`
- Rendered assessment page images
- Design or brainstorm files outside this app
- `.env`
- Supabase service role keys
