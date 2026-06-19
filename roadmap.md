# Next Task Roadmap

## V0.0.3.1 Roadmap — Public Readiness Fixes (implemented)

> **Status (2026-06-18):** Implemented. TaskCard drag semantics were rebuilt so pointer drag, 2.5 second long-press drag, immediate handle drag, keyboard drag, edit, and mobile move controls coexist without nested-interactive accessibility violations. `supabase/migrations/002_reorder_rpc.sql` has been applied to the live Supabase project and `npm run verify:supabase` now fails if the RPC is missing. Clear board is wired through local full-dev routing and covered by smoke. `npm run verify:release` is green against the live API path, including axe, mobile geometry, Clear board persistence, and reorder RPC invariants.

### Goal

Make Next Task ready to push, deploy, and use publicly. This is not a feature or design release. It is a stabilization release that closes the v0.0.2/v0.0.3 audit blockers, proves the real production data path, and removes anything that can fail the public website after launch.

### Current push blockers

1. **Browser smoke fails on accessibility.**
   - `npm run smoke:browser` currently stops on `nested-interactive (serious) x8`.
   - Root cause: `TaskCard` spreads dnd-kit draggable attributes/listeners onto the whole card while the card contains edit and move controls.

2. **Atomic reorder is not active in the live Supabase project.**
   - `npm run verify:supabase` reports `reorderRpc.skipped` because `reorder_tasks` is missing.
   - The API currently falls back to the old sequential reorder path, so v0.0.2's transactional guarantee is not true in production yet.

3. **Clear board is incomplete in local full-dev routing.**
   - `api/bootstrap/reset.ts` exists, but `scripts/dev-full.mjs` does not route `/api/bootstrap/reset`.
   - This can make Clear board work in deployment while failing in local API-backed verification.

4. **Release hygiene is not clean.**
   - `git diff --check` reports an extra blank line at EOF in `src/app/App.tsx`.
   - README still reads like a v0.0.1 release checklist and does not document migration `002_reorder_rpc.sql` or `/api/bootstrap/reset`.

5. **Public release proof is incomplete.**
   - CI release lane requires Supabase secrets.
   - Deployment verification still needs to be run against the final public URL after push/deploy.

### P0 — Must fix before push

1. **Fix task-card accessibility without losing the v0.0.3 interaction model.**
   - Keep the intended behavior: mouse drags from the card body after movement, touch drags after a short press, keyboard drag remains available, and the edit icon opens the drawer.
   - Remove nested-interactive semantics by ensuring the draggable/root card does not expose an interactive role that contains buttons/selects.
   - Options to evaluate:
     - Use card-level mouse/touch listeners for drag but move keyboard draggable attributes to a non-nesting drag affordance.
     - Or restore a dedicated drag handle for keyboard semantics while preserving body-drag for pointer users.
   - Acceptance:
     - `npm run smoke:browser` has zero serious/critical axe violations.
     - Edit icon, mobile move select, mobile quick status buttons, mouse drag, touch drag, and keyboard drag are all still usable.
     - Add/update a component test that prevents `nested-interactive` from returning.

2. **Make reorder RPC mandatory for public release.**
   - Apply `supabase/migrations/002_reorder_rpc.sql` to the target Supabase project.
   - Remove or release-gate the silent success path when `reorder_tasks` is missing.
   - Update `scripts/verify-supabase.mjs` so missing `reorder_tasks` fails release verification unless an explicit local-only skip flag is set.
   - Keep the sequential fallback only as a clearly marked development fallback, or remove it before public deployment.
   - Acceptance:
     - `npm run verify:supabase` returns `reorderRpc.ok: true` with no `skipped` field.
     - Mixed-user batch, duplicate id, invalid position, and partial-failure rollback checks all pass against live Supabase.
     - Reorder endpoint does not silently ship without the RPC.

3. **Wire and test Clear board end to end.**
   - Add `/api/bootstrap/reset` to `scripts/dev-full.mjs`.
   - Add Clear board coverage to `scripts/smoke-browser.mjs`:
     - load sample board
     - click Clear board
     - confirm
     - assert tasks/members/labels are cleared
     - reload or refetch and assert the empty state persists
   - Add README API-route documentation for `POST /api/bootstrap/reset`.
   - Acceptance:
     - Clear board works in local demo mode, local API-backed dev mode, and deployed API mode.
     - Smoke covers it so it cannot regress.

4. **Clean release hygiene.**
   - Remove the extra EOF whitespace in `src/app/App.tsx`.
   - Run `git diff --check` and require it to pass.
   - Ensure generated screenshots remain ignored and no verification artifacts are staged.

### P1 — Public website readiness

5. **Update documentation for the actual v0.0.3 public release.**
   - Replace the old `v0.0.1 release checklist` with a current `v0.0.3.1 public release checklist`.
   - Document required migrations:
     - `supabase/migrations/001_init.sql`
     - `supabase/migrations/002_reorder_rpc.sql`
   - Document required GitHub/Vercel/Supabase secrets:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
   - Document that release verification must show a non-skipped reorder RPC.

6. **Harden verification commands for public launch.**
   - Keep `verify:ci` secret-free.
   - Make `verify:release` the required local/public launch gate:
     - `verify:ci`
     - `verify:production-env`
     - `verify:supabase`
     - `smoke:browser`
   - Ensure smoke can run deterministically in local-demo mode for UI proof and real API-backed mode for release proof.
   - Acceptance:
     - `npm run verify:ci` passes.
     - `npm run verify:release` passes against the target Supabase project after migration 002 is applied.

7. **Validate public deployment.**
   - After push/deploy, run:
     - `npm run verify:deployment -- <production-url>`
   - Manually verify:
     - guest session starts
     - sample board loads
     - create/edit/comment/filter works
     - drag reorder persists after refresh
     - Clear board persists after refresh
     - theme toggle persists
     - version link opens `v0.0.3`
   - Acceptance:
     - Deployment verification passes.
     - No fatal state, console errors, failed `/api/*` requests, or layout overflow on public URL.

### P2 — Nice to finish before public marketing, not required for first public push

8. **Make public abuse controls explicit.**
   - Confirm Supabase anonymous auth settings and any CAPTCHA/rate-limit settings available on the project.
   - Keep API per-user and per-IP write limits configured in Vercel env.
   - Consider a later durable limiter only after real usage appears.

9. **Keep visual proof current.**
   - Regenerate ignored screenshots after fixes:
     - desktop
     - 390 mobile
     - dark mode
     - drawer open
     - empty state after Clear board
   - Use screenshots for review, but do not commit them unless intentionally adding docs assets.

### Completion criteria

- `git diff --check` passes.
- `npm run verify:ci` passes.
- `npm run verify:production-env` passes.
- `npm run verify:supabase` passes with `reorderRpc.ok: true` and no skipped RPC.
- `npm run smoke:browser` passes with no serious/critical axe violations.
- Clear board works in `dev:full` and is covered by smoke.
- README documents v0.0.3.1 public launch steps, both migrations, and the reset endpoint.
- The public deployment passes `npm run verify:deployment -- <production-url>`.
- Final push includes only source/docs/config changes; no local screenshots, `.env`, `dist`, or generated artifacts.

### Definition of public-ready

The website is public-ready when a new anonymous user can open the production URL, create real board data, move tasks, edit details, use comments/labels/team members, clear the board, switch theme, refresh the page, and keep working without data leakage, accessibility blockers, API errors, or layout breakage.

## v0.0.2 — Engineering hardening (implemented)

> **Status (2026-06-18):** Implemented. App version bumped to `0.0.3`. `npm run verify:ci` (typecheck + lint + 50 tests + build) is green; two-user RLS isolation verified live via `npm run verify:supabase`. Two follow-ups require external access I can't perform from here: **apply `supabase/migrations/002_reorder_rpc.sql`** to the Supabase project (the reorder endpoint falls back to the sequential path until then), and **add the Supabase secrets to CI** so the `verify-release` lane (smoke + live checks) can run. Plan detail retained below.

### Where we are today

v0.0.1 is shipped and healthy. The app is a full-stack Kanban board: React 19 + TypeScript + Vite on the front end, Vercel serverless functions in `api/`, and Supabase (anonymous auth + Postgres + RLS) for data. As of this audit:

- `npm run typecheck`, `npm run lint`, and `npm run build` all pass clean.
- The API layer is well-structured: a token-scoped Supabase client per request with RLS as the security boundary, Zod validation on every write, per-user **and** per-IP rate limiting, and centralized error handling.
- The migration is production-grade: idempotent, fully indexed, RLS policies on all seven tables, and composite foreign keys that force `user_id` consistency across join rows.
- Git hygiene is clean: `.env`, `dist/`, and `verification-*.png` are all ignored; 52 tracked files, no stray artifacts or secrets.
- Drag reorder is optimistic with rollback; verification tooling (supabase, production-env, deployment, Playwright smoke) exists and is documented.

This is a strong v0.0.1. The v0.0.2 work is about converting that polish into **engineering credibility** — the things a reviewer grades hardest: tests, data integrity, modularity, and performance.

### Audit findings

Strengths to preserve: clean shared API layer, thorough RLS, Zod-everywhere validation, optimistic drag, and honest verification scripts.

Gaps that v0.0.2 should close:

1. **No real test suite.** `smoke:browser` is a single end-to-end walkthrough, not unit coverage. Pure logic that is begging to be tested has zero tests: `reorderForDrop`, `groupTasks`, `applyInMemoryFilters`, date urgency, `activeFilterChips`, the Zod schemas, and the `query()` serializer. No test framework is installed.
2. **`reorder` is non-atomic and N+1.** [api/tasks/reorder.ts](api/tasks/reorder.ts) loops sequentially, doing a `SELECT` (`getTaskOrThrow`) then an `UPDATE` per task, then a full board re-hydrate. A partial failure leaves positions inconsistent — exactly the integrity bug a reviewer probes for.
3. **Single-task mutations over-fetch.** `hydrateTask` calls `hydrateBoard`, so creating or editing one task re-reads the entire board (every task, all joins, all comments, all activity) just to return one row. See [api/_shared/data.ts:252](api/_shared/data.ts).
4. **`App.tsx` is a 2277-line monolith** — ~35 components plus helpers in one file. It works, but it is the biggest reviewability and maintainability risk in the repo.
5. **No React error boundary.** A render-time error blanks the whole app; there is `FatalState` for data errors but nothing catches render exceptions.
6. **In-memory rate limiter** ([api/_shared/rateLimit.ts](api/_shared/rateLimit.ts)) does not hold across serverless instances — fine for the assessment, a gap for real traffic.
7. **No CI.** Verification is manual; there is no `.github/workflows` running `verify:release` on push.
8. **`mockApi.ts` (482 lines) can drift** from the real API since it reimplements server behavior for local-demo mode.

### Prioritized work

The highest reviewer-impact path for v0.0.2 is **tests + CI + atomic reorder + over-fetch fix + small modularization + error boundary** — these map directly to the assessment's "Code quality and structure" and "Security awareness" criteria. Durable rate limiting is explicitly deferred unless production hardening becomes a stated goal.

#### P0 — Engineering credibility (enforced)

1. **Split the verification gates and enforce them in CI.**
   - `verify:ci` = `typecheck && lint && test && build` — secret-free, the always-on gate.
   - `verify:release` = `verify:ci && verify:production-env && verify:supabase && smoke:browser` — the network/secret-backed gate.
   - `.github/workflows/ci.yml`: run `verify:ci` on every PR (including forks); run `verify:release` on `main` pushes, manual dispatch, and trusted/internal PRs (Supabase URL + anon key supplied as repository secrets). Live anonymous-auth checks can be flaky or impossible on fork PRs, so they belong on the trusted lane only.
   - Acceptance: a red gate blocks merge; both commands pass locally with the same behavior as CI.

2. **Make CI smoke deterministic.**
   - PR-lane smoke runs with `VITE_ENABLE_LOCAL_DEMO=true` for stable UI/interaction coverage without hitting live anon-auth or write rate limits.
   - Keep one **real-API** smoke on the `main`/release lane (dedicated test Supabase project with relaxed write limits) so end-to-end coverage through the real API path is not lost — local-demo smoke exercises `mockApi`, not the API.
   - `verify:supabase` remains the live security/data gate regardless.

3. **Extract pure logic into testable modules (prerequisite for tests).**
   - Move in-component / private helpers out of `App.tsx` and `lib`: `reorderForDrop`, `groupTasks` → `src/lib/boardLogic.ts`; `activeFilterChips`, `hasActiveFilters`, `applyInMemoryFilters` (client copy) → `src/lib/filterLogic.ts`; `query()` serializer → `src/lib/apiQuery.ts`; keep due-date logic in `src/lib/dates.ts`.
   - This unblocks unit testing without awkward exports, and de-risks the P1 component decomposition by pulling logic out first.
   - Acceptance: each helper is importable and side-effect-free; `App.tsx` imports them.

4. **Add a Vitest unit suite (pure logic + schemas; no RTL yet).**
   - Run in a fast Vitest **node** environment. Cover the extracted modules: board reorder math, filter chips/predicates, due-date urgency (`dueTone` / `dueLabel`), and the `query()` serializer.
   - Add Zod schema tests (valid/invalid title, date, hex color, uuid arrays). RTL/jsdom is deferred to P1 with component extraction.
   - Acceptance: `npm test` is green with meaningful coverage and wired into `verify:ci`.

5. **Add RLS / security regression tests (two-user isolation).**
   - Extend [scripts/verify-supabase.mjs](scripts/verify-supabase.mjs) to create two independent anonymous sessions (User A, User B) and assert User B cannot read, update, or delete User A's tasks, comments, labels, or members — cross-user `SELECT` returns empty and cross-user `UPDATE`/`DELETE` affect zero rows — while same-user operations succeed.
   - "Security awareness (RLS, no exposed keys)" is an explicit assessment criterion, so v0.0.2 should *prove* isolation, not assert it.
   - All verification scripts (this and smoke) must create **uniquely named** rows and tear them down in a `finally` block even on failure, so test data does not accumulate in Supabase.
   - Acceptance: the two-user isolation check runs inside `verify:supabase` and fails loudly if any policy regresses; no orphaned test rows remain after a run.

6. **Make `reorder` atomic and drop the N+1 (RPC + migration + invariants).**
   - Add an idempotent migration `supabase/migrations/002_reorder_rpc.sql` defining `reorder_tasks(updates jsonb)` that updates positions and records `task_moved` activity in one transaction, called via `supabase.rpc` from [api/tasks/reorder.ts](api/tasks/reorder.ts).
   - **Security model:** prefer `security invoker` so RLS applies to the caller and the function cannot bypass isolation. Use `security definer` only if invoker can't deliver the atomicity, and then with `set search_path = ''`, explicit `where user_id = auth.uid()` on every statement, and an audited body.
   - Re-runnable (`create or replace function`) with a documented rollback (`drop function ...`).
   - **DB invariant tests** (in the security/verify script): every updated task belongs to `auth.uid()`; a mixed-user batch fails fully (zero changes); duplicate ids fail; invalid status/position fails; activity events are recorded only for *real* status changes.
   - Acceptance: a mid-batch failure leaves zero partial changes; reorder is one RPC round-trip instead of N selects + N updates; all invariants hold.

7. **Stop over-fetching on single-task mutations (with shape parity).**
   - Add a single-task hydration path (one task + only its joins) and use it from the create/update handlers instead of `hydrateTask` → `hydrateBoard`.
   - Acceptance (measurable): assert via test/spy that `hydrateBoard` is **not** called on the single-task path and reorder issues exactly one RPC; **and** request-level parity — the returned task matches the full `HydratedTask` shape (assignees, labels, correct `comment_count`, correct `latest_activity_at`), and the board list still refreshes through existing React Query invalidation.

#### P1 — Maintainability and resilience

8. **Decompose `App.tsx` — scoped, and introduce RTL here.**
   - With pure logic already extracted (P0.3), extract only the highest-churn surfaces first: board + card + drag (`components/board/`) and the task drawer (`components/drawer/`). Leave managers, auth, and footer for a later pass.
   - Add jsdom + React Testing Library now and write component tests for the extracted board/drawer pieces.
   - Acceptance: each extracted file is under ~400 lines; smoke + unit + component tests stay green with no behavior change.

9. **Add a root React error boundary** that renders a recoverable fallback (reload / reset) instead of a blank screen, and wire minimal client error logging.

10. **Cover auth / recovery edge cases** in tests and/or smoke: anonymous session creation failure, expired/invalid token (API returns 401 and the UI recovers), save-board email conflict / already-recoverable, and the sign-out/reset path.

11. **Make the app version single-source.**
   - Derive `APP_VERSION` from `package.json` (Vite `define` or import) to kill the hardcode at [App.tsx:117](src/app/App.tsx); add a release checklist line so `package.json` version, in-app changelog copy, and README/roadmap release notes are bumped together.
   - Acceptance: the displayed version cannot drift from `package.json`; one bump updates the number everywhere it is rendered.

#### P2 — Polish (optional for v0.0.2)

12. **Automated accessibility checks** — run `axe-core` inside the browser smoke and fix violations; do a contrast pass on chips/labels.

13. **Reduce `mockApi` drift** — add a contract test (or generate fixtures from shared types) so local-demo behavior cannot silently diverge from the real API.

14. **Emit granular activity events.** The `activity_type` enum already defines `assignee_added` / `assignee_removed` / `label_added` / `label_removed` ([data.ts:6](api/_shared/data.ts)), but assignment and label changes are currently logged as a single generic `task_updated` event ([api/tasks/[id].ts:56](api/tasks/[id].ts)). Diff the before/after assignee and label sets and record one event per change so the timeline reads like Linear ("Added Mina Chen", "Removed Bug"). All 7 advanced features are already present per the assessment audit — this is timeline polish, not a missing requirement.

#### Deferred — production hardening (only if that becomes the goal)

- **Durable rate limiting** via Upstash Redis (Vercel Marketplace) so limits hold across serverless instances; keep the in-memory limiter as the local fallback. Low reviewer impact for the assessment, so it sits behind the v0.0.2 path.

### v0.0.2 completion criteria

- `verify:ci` (`typecheck + lint + test + build`) runs on every PR; `verify:release` (`verify:ci` + production-env + supabase + smoke) runs on `main`/dispatch/trusted PRs. Both pass locally with the same behavior as CI.
- CI smoke is deterministic: local-demo smoke on PRs, real-API smoke on the release lane.
- Pure logic is extracted into `boardLogic` / `filterLogic` / `apiQuery` modules and `npm test` (Vitest, node env) passes with meaningful coverage of board/filter/reorder logic and Zod schemas.
- Two anonymous users are proven isolated: User B cannot read, update, or delete User A's rows; verification scripts clean up their own rows even on failure.
- `reorder` is a single transactional RPC (invoker-preferred, RLS preserved) backed by an idempotent migration with a documented rollback, and the reorder invariants hold (ownership, full-batch failure, duplicate/invalid rejection, activity only on real moves).
- Create/update no longer hydrate the full board (asserted by spy) and return the full `HydratedTask` shape with correct `comment_count` / `latest_activity_at`.
- Board, card, drag, and the task drawer are extracted from `App.tsx` (each file under ~400 lines) with RTL component tests; a root error boundary is in place; auth/recovery edge cases are covered.
- The displayed app version derives from `package.json` and cannot drift.
- After deploy, `npm run verify:deployment -- <production-url>` passes against the live URL.

---

## v0.0.3 — Design polish & premium feel (implemented)

> **Status (2026-06-18):** Implemented. Shipped a design-token system (spacing/radius/type/elevation/motion), AA-contrast color fixes, a type ramp, softer radii + layered depth, a glass header, a signature accent gradient, an elevated stats strip with animated count-up, refined cards, a hero empty state, tactile press feedback, 44px touch targets, and a full **light/dark theme** with a header toggle. Visual QA captured at 390/768/1440 + drawer + dark + empty (no horizontal overflow at any breakpoint; no console errors). Command palette and density toggle remain deferred to v0.0.4 as planned. Plan detail retained below.

v0.0.3 is a design-only release. The goal: take a board that already looks credible and make it feel **premium, tactile, and high-confidence** — the kind of board a team opens every day — without costing a single click of real-world convenience. Motion serves clarity; it never replaces it.

### Design audit (where the design is today)

Reviewed desktop board, sticky header + stats strip, task drawer, the confirm/manager dialogs, the empty state, and the 390px mobile layout, plus the design system in [globals.css](src/styles/globals.css) and the Framer Motion usage in [App.tsx](src/app/App.tsx).

**What already works** — keep it:
- A coherent token base exists (`:root` colors, two shadows, Manrope type) and a real status color language (blue / violet / emerald / amber).
- The desktop board reads as a product: colored column accents, a stats strip, restrained empty states, skeletons, and a slide-in drawer.
- Motion fundamentals are present and responsible: Framer layout animations, `AnimatePresence`, hover lift on cards, and a `prefers-reduced-motion` reset ([globals.css:2052](src/styles/globals.css)).
- The mobile model is genuinely usable (status tabs + per-card move controls), not a squeezed desktop.

**The gap to a premium, tactile feel** — what holds it back:

| # | Finding | Severity | Why it matters |
|---|---------|----------|----------------|
| 1 | **Contrast risk on small text.** `--muted-2` (#8b99ab) on light surfaces for 10–11px uppercase labels (stat labels, version) is well under WCAG AA ~4.5:1. | 🔴 Critical | Accessibility is table stakes for "polished," and the stat labels are prime real estate. |
| 2 | **No ad-hoc-free token scale.** Spacing, radius, type, and motion are mostly raw px scattered across 2,000+ CSS lines; single `--radius: 8px`, no spacing/type/elevation/motion tokens. | 🔴 Critical | Premium polish requires systematic rhythm; you can't tune consistently without tokens. |
| 3 | **Type is small and flat.** ~30 of ~47 font-size hits are 10–13px; card titles don't dominate. | 🟡 Moderate | Generous, confident type is the cheapest "premium" signal. |
| 4 | **Surfaces are flat; tight 8px radius.** Cards/drawer/dialogs share one small radius and a single shadow; little layered depth. | 🟡 Moderate | Depth + softer radii read as high-end (Linear/Asana/Arc). |
| 5 | **No press/tap feedback.** 0 `whileTap` usages; buttons and cards have hover but no active-state tactility. | 🟡 Moderate | Micro-feedback is what makes an app feel alive and expensive. |
| 6 | **Thin motion vocabulary.** Only shimmer + spin keyframes; no entrance choreography, no stat count-up, no drag tilt beyond a static `rotate(0.5deg)`, no drawer spring/backdrop blur. | 🟡 Moderate | Choreographed, intentional motion is what reads as premium and tactile. |
| 7 | **Stats strip is utilitarian.** Five flat cards; no trend/delta, iconography is faint, weak hierarchy. | 🟡 Moderate | This is the most "dashboard-like" surface — a natural hero for premium treatment. |
| 8 | **Accent strategy is one-note.** Strong red CTA but otherwise muted; no signature gradient/glow moment; the body's vertical-line texture reads closer to noise than intent. | 🟢 Minor | A single deliberate accent moment elevates the whole composition. |
| 9 | **No dark mode.** `color-scheme: light` only. | 🟢 Minor | Dark mode is a strong premium demo signal. |

### Design principles for v0.0.3
- **Premium = restraint + depth + intentional motion**, not more decoration.
- **Every interactive element earns three states**: hover, focus-visible, active/press.
- **Convenience first**: no animation adds a required click or delays input; motion is additive, never a tax.
- **Accessibility is polish**: contrast, focus, target size, and reduced-motion are acceptance criteria, not afterthoughts.

### Prioritized work

#### P0 — Design foundation (do first; everything builds on it)

1. **Tokenize the system.** Add CSS variable scales for spacing (4/8-based), radius (e.g. 8/12/16/999), type (size + line-height ramp), elevation (3–4 shadows), and motion (durations + easings + spring presets). Migrate existing values to tokens as surfaces are touched.
2. **Fix contrast to WCAG AA.** Darken `--muted-2`/`--muted` until all body and label text clears 4.5:1 (3:1 for ≥18px/bold); re-check the stats labels, version link, due pills, and chips. Verify with a contrast tool.
3. **Establish the type ramp.** Promote card titles (size/weight/line-height), set a confident heading scale, and stop defaulting metadata to 10–11px where 12–13px reads better.
4. **Guarantee touch targets ≥44px** on mobile move chips, status tabs, the select, and all icon-only buttons (card edit, search clear, drawer close).

#### P1 — Premium visual language

5. **Depth & surfaces.** Adopt the radius + elevation tokens: softer card/drawer/dialog corners, layered shadows, refined 1px borders, and an optional subtle glass (backdrop-blur) on the sticky header and drawer.
6. **Signature accent.** Define one deliberate accent/gradient moment (CTA and/or active states), harmonize the status palette, and make the body texture intentional (or remove it). Decide red-primary vs. a refined gradient CTA.
7. **Elevate the stats strip into a dashboard.** Stronger numeric hierarchy, clearer icons, and trend/delta affordances (e.g. overdue in alarm tone, completed with progress) — a premium summary, not five flat tiles.
8. **Refine the task card.** Title-first hierarchy, priority as a refined badge (not a bare dot+word), due-pill color semantics (overdue/soon/future/done), avatar-stack polish, and a depth-based hover (lift + shadow) rather than translate-only.

#### P2 — Motion & micro-interactions (the tactile layer)

9. **Tactile feedback everywhere.** Add `whileTap` press states (scale/shadow) to buttons, chips, and cards; animate chip/toggle selection.
10. **Entrance choreography.** Stagger column and card mount; crossfade skeleton → content instead of a hard swap.
11. **Drag delight.** Richer lift (scale + shadow + slight tilt), a spring drop, drop-target column highlight, and an animated placeholder gap. (Keep the current drag-from-anywhere + edit-icon model intact.)
12. **Data motion.** Count-up on stat numbers, a subtle "synced" pulse, and a refined toast spring.
13. **Empty state as a hero moment.** Turn the Sparkles orbit into a small animated, inviting illustration with confident copy.

#### P3 — Stretch (optional; may defer to v0.0.4)

14. **Dark mode** via the token layer (`prefers-color-scheme` + a manual toggle). A strong demo signal, but it roughly doubles visual QA — ship it only if v0.0.3 stays on schedule; otherwise it moves to v0.0.4.

#### Out of scope for v0.0.3 (v0.0.4 product-convenience candidates)

These are workflow features, not design-only, so they sit outside this design pass:
- **Command palette (⌘K)** for fast create / search / navigate.
- **Density toggle** (comfortable / compact) — changes layout and workflow, so it belongs with product convenience, not pure design.

### v0.0.3 completion criteria

**Design system**
- New and touched reusable styles pull from the spacing / radius / type / elevation / motion tokens. One-off geometry is rare and carries a short comment explaining why it isn't a token.

**Accessibility**
- Every text element meets WCAG AA contrast (4.5:1 for body/labels, 3:1 for ≥18px or bold); every interactive element has hover + focus-visible + active/press states; touch targets are ≥44px; all new motion respects `prefers-reduced-motion`.

**Visual QA (Playwright screenshots, before/after vs. the v0.0.1 baseline)**
- Captured at `390` (mobile), `768` (tablet), and `1440` (desktop), plus task drawer open, empty state, drag-active, and reduced-motion mode. Board, cards, stats strip, drawer, and empty state are visibly elevated.

**Layout stability — no layout shift**
- No body-level horizontal overflow at any breakpoint; no header/control overlap; no text clipping or truncation regressions; card dimensions stay stable through hover, drag, and drop (no jump).

**Performance budget**
- No noticeable jank during drag; animations are transform/opacity-first; backdrop-blur is restrained (reduced or disabled on mobile); no major Lighthouse regression vs. v0.0.1.

**Functional regression (no convenience loss)**
- The current interaction model is preserved exactly: a card drags from anywhere on its body (mouse starts on movement, touch on a short press, keyboard via the focused card), and a dedicated edit icon opens the detail drawer — clicking the card body does **not** open it. The clear-board flow and the full smoke/verification suite stay green.

**Release metadata**
- Bump `package.json` version, add a `v0.0.3` changelog entry, update this roadmap's status, and refresh the reference screenshots — consistent with the v0.0.2 version single-source work.

---

# Next Task Roadmap v0.0.1 (shipped)

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
