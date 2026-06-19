# Next Task

Next Task is a polished full-stack Kanban board built for the NP SDE assessment. It uses React, TypeScript, Vite, Vercel Serverless Functions, Supabase anonymous auth with email recovery, and Supabase Row Level Security.

Current app version: `0.0.1`.

## Features

- Four-column Kanban board: To Do, In Progress, In Review, Done
- Smooth drag-and-drop task movement and ordering
- 2.5 second card long-press drag activation plus immediate drag-handle activation
- Mobile status navigation with one visible lane at a time and direct status move controls
- Automatic guest session via Supabase anonymous auth
- Email recovery links so users can save and reopen a board across devices
- User-isolated data through RLS policies
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
- In-app changelog behind the bottom `v0.0.1` version link
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

The smoke script starts `npm run dev:full` on `127.0.0.1:5175` unless `SMOKE_BASE_URL` is provided. It covers sample data, task create/edit, comments, filters, long-press drag, drag-handle drag, manager dialog focus, changelog access, and 390px mobile status/stat rendering. Screenshots are written to ignored `verification-smoke-*.png` files.

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
9. Confirm RLS is enabled on:
   - `tasks`
   - `team_members`
   - `task_assignees`
   - `labels`
   - `task_labels`
   - `comments`
   - `activity_events`

Do not use or expose the Supabase service role key. This project only needs the public anon/publishable key.

For public deployments, keep anonymous sign-ins protected with Supabase CAPTCHA/rate-limit settings where available. The API also enforces a configurable per-user write limit through `API_WRITE_LIMIT_PER_MINUTE`.

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

Every API request must include:

```http
Authorization: Bearer <supabase_access_token>
```

The API creates a Supabase client with that token, so RLS remains the security boundary.

## Vercel deployment

Import this repository into Vercel.

Use:

- Build command: `npm run verify:production-env && npm run build`
- Output directory: `dist`
- Install command: `npm install`

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

Do not deploy with `VITE_ENABLE_LOCAL_DEMO=true`; that bypasses the API-backed data path in the browser bundle.
Write APIs enforce both per-user and per-IP minute buckets to reduce anonymous-session abuse.

## Verification checklist

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:supabase
npm run verify:production-env
npm run smoke:browser
```

After deployment, run:

```bash
npm run verify:deployment -- https://your-deployment.vercel.app
```

Manual checks:

- Guest auth starts automatically
- Email recovery sends a board-save confirmation link
- Returning users can request a sign-in link
- Demo board can be loaded
- Task create/edit/delete works
- Drag-and-drop persists
- Long-press drag and drag-handle drag both work
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
- Two browser profiles cannot see each other's data after the migration is applied

## v0.0.1 release checklist

- Supabase migration `supabase/migrations/001_init.sql` has been applied.
- Anonymous auth, email auth, and required OAuth redirect URLs are configured.
- Vercel env vars match the deployment section and `VITE_ENABLE_LOCAL_DEMO=false`.
- `npm run verify:production-env` passes before build.
- `npm run verify:supabase` passes against the target Supabase project.
- `npm run smoke:browser` passes locally against the full API-backed dev server.
- After deploy, run `npm run verify:deployment -- https://your-deployment.vercel.app`.

## Repository hygiene

Only the runnable app files belong in this repository. Do not commit:

- The original assessment `.docx`
- Rendered assessment page images
- Design or brainstorm files outside this app
- `.env`
- Supabase service role keys
