# Next Task Roadmap v0.0.1

## Implementation Status

v0.0.1 is implemented. The release focuses on making the assessment app shippable: drag/drop is regression-covered, mobile status navigation is explicit, dialogs have basic keyboard/focus handling, account recovery is easier to find, active filters are visible, inline task capture exists, workspace rows are editable, and the website exposes a bottom grey `v0.0.1` changelog link.

## Verification Evidence

- `npm run lint` passes.
- `npm run build` passes.
- `npm run verify:production-env` passes with Supabase variables present and local demo disabled.
- `npm run verify:supabase` passes anonymous auth, RLS table visibility, and a create/delete mutation cycle.
- `npm run smoke:browser` passes against the full local API-backed app.
- Browser smoke covers sample board loading, task creation, edit, search, filter chips, task drawer, comment creation, 2.5 second long-press drag activation, immediate handle drag, changelog access, manager dialog focus, desktop layout, and 390px mobile status/stat rendering.

## Strengths To Preserve

- The desktop board has a finished product feel: clear status lanes, strong cards, useful stats, restrained motion, and well-scoped empty states.
- The data path is credible for the challenge: anonymous auth, bearer-token API calls, RLS policies, server-side validation, and per-user data isolation are all represented.
- The feature set goes beyond basic CRUD with comments, activity, labels, assignees, filters, due-date states, demo data, and account recovery.
- The card drawer is productive without feeling heavy.
- The new drag overlay sizing and long-press activation make the board feel more tactile.

## Completed v0.0.1 Work

### P0 - Ship Confidence

1. Added a repeatable Playwright smoke script.
   - Covers load, sample board, create task, edit, search, drawer/comment, drag/drop, manager focus, changelog, and mobile screenshot.
   - Stores only ignored screenshots/artifacts.
   - The command is in the README verification checklist.

2. Made drag/drop regression-proof.
   - Keeps pointer-first collision detection with keyboard fallback.
   - Includes a browser assertion that long-press drag moves a task across columns.
   - Includes a handle-drag assertion so the immediate drag path stays intact.

3. Clarified production release status.
   - README includes a short release checklist with required env vars, Supabase migration confirmation, and post-deploy verification.
   - README documents that `npm run dev` is frontend-only and `npm run dev:full` is the real API-backed local path.

### P1 - Mobile UX

1. Replaced mobile horizontal-board guessing with explicit status navigation.
   - Adds sticky status tabs above the board on small screens.
   - Shows one active lane with status counts.
   - Acceptance: a first-time mobile user can see there are four statuses without swiping blindly.

2. Improved mobile stats scanning.
   - The stats strip now becomes a compact responsive grid at 390px.
   - Acceptance: all five stats are discoverable without looking broken.

3. Made mobile task movement more direct.
   - Preserves the status select fallback.
   - Adds compact status chips for faster one-tap movement.

### P1 - Accessibility And Interaction

1. Added dialog semantics and focus management to the task drawer and team/label manager.
   - Use `role="dialog"`, `aria-modal`, labelled headings, initial focus, Escape close, and focus return.

2. Added visible focus states for buttons, chips, drag handles, selects, and the version link.
   - Current form focus styling is good, but action buttons need clearer keyboard focus.

3. Strengthened keyboard drag guidance.
   - Keeps the keyboard sensor.
   - Adds accessible drag handle copy that explains pick up, move, and drop.

### P1 - Product Clarity

1. Made account recovery more obvious.
   - Adds a clearer "Save board" entry point next to the primary board actions.

2. Showed active filters as chips.
   - Users can see which filters are applied without reopening the popover.
   - Includes one-click removal and a result count.

3. Improved empty/error recovery.
   - Board fatal states include a retry action.
   - API mutation failures preserve the user action context through existing optimistic rollback/toast flows.

### P2 - Feature Depth

1. Added inline task creation per column.
   - The column-level Add task button now opens a lightweight inline composer for quick capture.

2. Added editable team members and labels.
   - The UI exposes rename and color edits.

3. Added lightweight activity detail.
   - Users can inspect field-level update chips, move details, task titles, and comment events.

4. Added refresh indicators.
   - Not required for the assessment, but useful if the product becomes multi-device or shared-team oriented.

## Post-v0.0.1 Engineering Improvements

1. Make reorder updates atomic.
   - The current API applies reorder updates sequentially.
   - For production-grade reliability, move reorder into a transaction/RPC so partial updates cannot leave positions inconsistent.

2. Move rate limiting to durable storage if traffic grows.
   - The in-memory limiter is fine for a challenge and one server instance, but serverless deployments may run multiple instances.

3. Continue improving test data cleanup for verification scripts.
   - Browser smoke creates uniquely named tasks and deletes them at the end when possible.

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
