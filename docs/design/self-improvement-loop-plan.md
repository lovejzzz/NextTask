# The self-improvement loop — plan → execute → review → plan next

Boardy already had three of the four pieces of this loop: **plan** (`pursuit.ts`,
`drives.ts`, the wired `propose_plan` path), **execute** (`runReversibleSteps`,
reversible, rolled back on failure), and a narrower **plan next** precedent
(`diagnoseFromSelfTest`, which turns a weak voice self-test score into a fix
ticket). The missing keystone was **review**: nothing compared the board
*before* vs. *after* an executed plan against what the plan said it would do.

This closes the loop — with one hard rule that shaped every decision below:
**cognition (planning, reviewing, deciding what's next) may be fully
autonomous; execution against the real board may never skip a fresh human
consent click, for any reason.**

## How this was designed

Three independent designs were generated in parallel (deterministic
metric-delta scoring; semantic intent-fidelity scoring with a downgrade-only
LLM check; direct generalization of the existing `agentEval.ts`/
`diagnoseFromSelfTest` patterns), then each was adversarially reviewed against
the real codebase by a separate agent whose only job was to find a way the
design could let board mutations execute without consent.

**All three were flagged** — two MAJOR, one CRITICAL. The findings shaped the
final implementation more than any single design did:

1. **The critical one**: one design's "exception" — let a multi-round loop skip
   the consent click for actions that are "reversible + local," riding
   `agency.ts`'s `decideAutonomy()`/`'auto'` tier — turned out to be fabricated.
   `decideAutonomy()` has **zero connection to any board `ActionKind`** anywhere
   in the codebase; the only two real `'auto'` call sites are reminders and
   self-authored skills. Implementing that design as written would have
   *invented*, for the first time, a way for `drop_task`/`clear_overdue`/etc. to
   execute repeatedly with no consent click after one initial "go ahead" —
   exactly the failure mode this whole exercise was watching for, dressed up as
   reuse of an existing rule.

2. **Both "major" findings**: every design's plan to auto-file a self-fix
   ticket on a failed outcome (mirroring `diagnoseFromSelfTest`'s existing
   ticket-filing) inherited a real, pre-existing weakness — that existing
   precedent doesn't actually call `decideAutonomy()` at its call site; its
   "reversible + local" classification is a human's comment, not a
   code-enforced check. One review additionally found the proposed dedup logic
   wouldn't actually bound the *rate* of auto-filed tickets across repeated
   "what's next" rounds.

3. A stop-condition design (`goal_met`) referenced a `current` field on
   `PursuitReview` that didn't exist in the real type — an unimplementable
   stop condition as specified.

## What was actually built (the synthesis)

- **`reviewOutcome` is taken almost verbatim from the metric-delta design** —
  it's the one piece none of the three reviews found fault with. Pure,
  deterministic, no LLM anywhere in the scoring path: an exhaustive switch over
  `ActionKind` (compiler-enforced — adding a 7th kind to `liveAction.ts` without
  updating this table is a type error), scoring only whether the board moved
  the way the *already-gated* action said it would, on the exact titles named.
  Never a global "the board got better" judgment, which would be unfalsifiable.

- **No execution-without-consent path, anywhere, full stop.** Every round's
  plan still needs its own fresh Accept click. This rejects all three designs'
  attempts to ride or extend the `'auto'` tier for board actions.

- **No auto-ticket-filing in this version.** Outcome reviews are recorded to
  the glass-box trail (`agentTrail`, extending the existing `'accepted'`
  entry's `detail` field — zero schema change) and narrated honestly in the
  chat reply. They do **not** create a board task. This is a deliberate scope
  cut: filing an actual ticket about a missed outcome is a real, useful future
  feature, but it should be its own consent-gated proposal (a `create_task`
  card), not a silent write riding an unenforced convention. Growth-ledger
  integration was considered and also deliberately deferred for the same
  reason — narrower scope now, no loss of the core ask.

- **The stop condition is real, not hand-waved.** `PursuitReview` gained an
  actual `current` field (additive, tested) and a new `pursuitGoalMet()`
  helper, so "the goal is genuinely met" (order/self metrics reaching 0) is
  distinguishable from "nudged once." `loop.ts`'s `nextStopReason` combines
  that with a loop-until-dry check (3 consecutive rounds with no clean pass)
  and a hard, unconditional round cap (5) — the cap can't be talked around by
  any verdict.

- **Round history lives in memory for the current session only** — a `useRef`
  in `App.tsx`, not persisted. A stop condition that resets each session can't
  quietly calcify into "Boardy refuses to ever try again."

- **Every round is still user-initiated.** There is no ambient/idle trigger
  added anywhere. "Plan next" is communicated as plain text in the same chat
  reply ("ask me again if you want another pass"); a new round only starts
  when the user actually asks again, through the existing `self_intent`/
  `whats_next` entry points. This avoids the consent-fatigue risk one review
  flagged (auto-resurfaced proposal cards without a new user message).

## The loop, concretely

```
pursuit/drives ──▶ PLAN (propose_plan, unchanged)
                      │ gatePlan + the human's Accept click — unchanged, mandatory
                      ▼
                  EXECUTE (runReversibleSteps, unchanged)
                      │
                      ▼
                  REVIEW (NEW — reviewOutcome.ts, pure, before/after vs. the plan)
                      │
                      ▼
                  RECORD (glass-box trail; no board write)
                      │
                      ▼
                  PLAN NEXT (NEW — loop.ts decides stop vs. continue; never executes)
                      │ "ask me again" — text only, no auto-surfaced card
                      ▼
              (user asks again → a brand-new PLAN, same consent gate)
```

## What's wired

`App.tsx`'s `executeProposed` — the single function both the single-action and
multi-step-plan paths already funneled through — now: snapshots the board via
a fresh, unfiltered `api.getBoard()` read (not the possibly-stale react-query
cache) before and after execution; scores the outcome; appends the verdict to
the confirmation text and the trail; rebuilds a post-round `WorldState` to
re-review the standing pursuit if one exists; and decides + narrates whether
to keep offering rounds. No second execution path was added — this is the
same `agentReply → consent card → accept() → executeProposed` chain as every
other proposal, with review/plan-next appended after it, not around it.

## Files

- `src/lib/reviewOutcome.ts` (new) + tests — the audit step.
- `src/lib/loop.ts` (new) + tests — the stop condition / plan-next decision.
- `src/lib/pursuit.ts` (edited) — `PursuitReview.current`, `pursuitGoalMet()`.
- `src/app/App.tsx` (edited) — `executeProposed` wiring, round-history ref.

## What's explicitly not done (honest scope)

- No auto-filed tickets on a missed outcome (deliberate — see above).
- No growth-ledger entry for a review (deliberate — the trail already covers
  it; a future addition, not load-bearing for the loop to work).
- No ambient/background triggering of a new round (deliberate, permanently —
  not a "v1 only" gap; adding one would be the actual invariant-breaking move
  every review warned about, and should be its own explicit, reviewed decision
  if ever proposed).
- Live model quality for the planning step itself is unverified on real
  hardware, same caveat as the rest of the agent work — see `RUBRIC.md`.
