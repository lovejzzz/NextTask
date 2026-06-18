# Next Task

Next Task is a polished full-stack Kanban board built for the NP SDE assessment. It uses React, TypeScript, Vite, Vercel Serverless Functions, Supabase anonymous auth with email recovery, and Supabase Row Level Security.

## Features

- Four-column Kanban board: To Do, In Progress, In Review, Done
- Smooth drag-and-drop task movement and ordering
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
- Board summary stats
- High-end responsive UI with motion, skeleton states, empty states, and error states

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

## Supabase setup

1. Create or open the Supabase project.
2. Enable anonymous sign-ins in Auth settings.
3. Enable Email Auth and magic links in Auth settings.
4. Add the production URL and local dev URLs to Auth redirect URLs:
   - `http://127.0.0.1:5174`
   - `http://localhost:5174`
   - the deployed Vercel URL
   - the custom domain, if used
5. Open the SQL Editor.
6. Run `supabase/migrations/001_init.sql`.
7. Confirm RLS is enabled on:
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

- Build command: `npm run build`
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
```

Do not deploy with `VITE_ENABLE_LOCAL_DEMO=true`; that bypasses the API-backed data path in the browser bundle.

## Verification checklist

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:supabase
npm run verify:production-env
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
- Team members can be created and assigned
- Labels can be created, assigned, and filtered
- Comments appear with timestamps
- Activity timeline updates
- Search and filters work
- Stats update after mutations
- Empty/loading/error states are visible
- Mobile layout is usable
- Two browser profiles cannot see each other's data after the migration is applied

## Repository hygiene

Only the runnable app files belong in this repository. Do not commit:

- The original assessment `.docx`
- Rendered assessment page images
- Design or brainstorm files outside this app
- `.env`
- Supabase service role keys
