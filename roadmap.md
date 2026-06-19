# Next Task Roadmap v0.0.1

## Audit Verdict

Next Task is in a strong assessment-ready state: the core Kanban workflow works, the UI feels polished on desktop, Supabase anonymous auth and RLS-backed APIs verify successfully, and the latest drag/drop refinement passes browser checks. The next version should focus on mobile discoverability, accessibility hardening, recovery clarity, and turning the current manual verification into repeatable browser gates.

## Current Evidence

- `npm run lint` passes.
- `npm run build` passes.
- `npm run verify:production-env` passes with Supabase variables present and local demo disabled.
- `npm run verify:supabase` passes anonymous auth, RLS table visibility, and a create/delete mutation cycle.
- Full local API-backed browser audit passed on `http://127.0.0.1:5175`.
- Browser audit covered sample board loading, task creation, search, task drawer open, comment creation, 2.5 second long-press drag activation, drag/drop persistence into In Progress, desktop layout, and 390px mobile rendering.
- Browser audit reported no console errors, no failed requests, no fatal state, and no detected text overflow in key controls/cards.

## Strengths To Preserve

- The desktop board has a finished product feel: clear status lanes, strong cards, useful stats, restrained motion, and well-scoped empty states.
- The data path is credible for the challenge: anonymous auth, bearer-token API calls, RLS policies, server-side validation, and per-user data isolation are all represented.
- The feature set goes beyond basic CRUD with comments, activity, labels, assignees, filters, due-date states, demo data, and account recovery.
- The card drawer is productive without feeling heavy.
- The new drag overlay sizing and long-press activation make the board feel more tactile.

## Priority Fixes

### P0 - Ship Confidence

1. Add a repeatable Playwright smoke script.
   - Cover load, sample board, create task, search, drawer/comment, drag/drop, and mobile screenshot.
   - Store only ignored screenshots/artifacts.
   - Add the command to the README verification checklist.

2. Make drag/drop regression-proof.
   - Keep pointer-first collision detection with keyboard fallback.
   - Add a browser assertion that long-press drag moves a task across columns.
   - Add a handle-drag assertion so the immediate drag path stays intact.

3. Clarify production release status.
   - Add a short release checklist with required env vars, Supabase migration confirmation, and post-deploy verification.
   - Document that `npm run dev` is frontend-only and `npm run dev:full` is the real API-backed local path.

### P1 - Mobile UX

1. Replace mobile horizontal-board guessing with explicit status navigation.
   - Add a sticky segmented status control or tabs above the board on small screens.
   - Keep horizontal swipe as a secondary option, but show the active lane and counts.
   - Acceptance: a first-time mobile user can see there are four statuses without swiping blindly.

2. Improve mobile stats scanning.
   - The stats strip is horizontally clipped at 390px.
   - Add scroll affordance, compact chips, or a two-row responsive grid.
   - Acceptance: all five stats are discoverable without looking broken.

3. Make mobile task movement more direct.
   - Preserve the status select fallback.
   - Consider a compact "Move to" sheet or status chips for faster one-tap movement.

### P1 - Accessibility And Interaction

1. Add dialog semantics and focus management to the task drawer and team/label manager.
   - Use `role="dialog"`, `aria-modal`, labelled headings, initial focus, Escape close, and focus return.

2. Add visible focus states for all buttons, chips, drag handles, and selects.
   - Current form focus styling is good, but action buttons need clearer keyboard focus.

3. Strengthen keyboard drag guidance.
   - Keep the keyboard sensor.
   - Add accessible drag handle copy or screen-reader instructions that explain pick up, move, and drop.

### P1 - Product Clarity

1. Make account recovery more obvious.
   - The guest chip is visually quiet for a critical "save this board" flow.
   - Add a clearer "Save board" entry point or first-session prompt.

2. Show active filters as chips.
   - Users should see which filters are applied without reopening the popover.
   - Include one-click removal and a result count.

3. Improve empty/error recovery.
   - Fatal states should include a retry action.
   - API mutation failures should preserve the user action context and offer retry when appropriate.

### P2 - Feature Depth

1. Add inline task creation per column.
   - The column-level Add task button is present, but an inline composer would reduce drawer friction for quick capture.

2. Add editable team members and labels.
   - The API supports updates, but the UI should expose rename/color/avatar edits.

3. Add lightweight activity detail.
   - Activity exists, but users cannot inspect field-level diffs or filter task history.

4. Consider realtime or refresh indicators.
   - Not required for the assessment, but useful if the product becomes multi-device or shared-team oriented.

## Engineering Improvements

1. Make reorder updates atomic.
   - The current API applies reorder updates sequentially.
   - For production-grade reliability, move reorder into a transaction/RPC so partial updates cannot leave positions inconsistent.

2. Move rate limiting to durable storage if traffic grows.
   - The in-memory limiter is fine for a challenge and one server instance, but serverless deployments may run multiple instances.

3. Add test data cleanup for verification scripts.
   - Browser/API smoke tests should create uniquely named tasks and delete them at the end when possible.

4. Add bundle and accessibility budgets.
   - Track bundle drift for the drag/motion chunks.
   - Add automated checks for basic ARIA violations after the browser smoke is in place.

## v0.0.1 Completion Criteria

- Desktop board remains visually polished and functional.
- Mobile clearly exposes all statuses and stats at 390px width.
- Task create, edit, comment, filter, and drag/drop paths are covered by one repeatable browser smoke command.
- Anonymous auth, RLS visibility, and mutation cycle remain green.
- Task drawer and manager dialogs meet basic keyboard/focus expectations.
- README and roadmap describe the real local, production, and verification paths without ambiguity.
