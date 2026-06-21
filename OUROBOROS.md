# 🐍 Ouroboros — the self-improvement loop

> The serpent eats its own tail. NextTask uses NextTask to improve NextTask.

Ouroboros is the automated loop in which the product's own AI companion plans
its upgrades, files them as real tickets on its own board, and the coding agent
ships them — then the board sees its improvements land and proposes the next
ones. A system that grows by feeding on its own output.

## North Star — the road to "best"

**The goal:** the best free, private, in-browser AI companion for getting work
done — genuinely intelligent, with real personality, that operates your board in
plain language and improves itself, where **every claim is proven, not asserted.**

We're very good (8/9 dimensions CI-proven 5/5). "Very good" → "best" is gated by
four honest gaps, and the loop climbs them in this order.

**Priority:** the **AI/brain is the focus** — it's the genuinely unique thing
here (a free, private, in-browser companion that operates the board and improves
itself; the kanban is table stakes). Gaps #1 and #2 lead; craft and refactor
fill in around them, not ahead of them.

### From companion → agent

The arc: the board doesn't just *talk*, it *acts* — and it can grow its own
abilities. Three layers, each safe and verifiable:

1. **Uses the website as a tool.** Natural-language commands drive real board
   mutations (create / complete / label / assign / reschedule / bulk / undo).
2. **Solves multi-step problems.** Composed **tools** (macros) run a sequence of
   commands — "create a tool called morning that clear overdue then plan my day",
   then "run morning". Every step must parse to a real intent, so a tool can only
   do things the board already knows how to do.
3. **Creates more tools — two ways, both safe.** (a) *Composition:* the AI/user
   mints new named tools from vetted primitives (no code generation — a 0.5B
   model writing live code is unsafe and unreliable). (b) *New primitives:*
   Ouroboros files tickets for genuinely new capabilities → the dev agent
   implements them → the toolbox grows.

What we will **not** do: execute model-generated code at runtime. Tools are
compositions of audited primitives; new primitives go through the loop.

1. **Prove and raise the model.** Conversation quality is still an asterisk — and
   "best" can't sit on an asterisk. Make it measurable and high: richer self-test
   (grounding, concision, persona-shift, helpfulness), recommend/default the
   best-scoring model, make the number one click to get.
2. **Make the LLM earn its place.** Today most intelligence is deterministic
   scaffolding; the model is flavor. Put it where it's genuinely better — an
   intent-fallback for phrasings the parser misses (**queries only, never
   destructive actions**), model-authored explanations and summaries — each
   gated by the eval so reliability never regresses.
3. **Excellent loop output, not just present.** Ouroboros tickets must be
   high-quality: dedupe against what's already on the board, never re-file done
   or queued work, prioritize by rubric impact, diagnose precisely.
4. **Best-in-class craft.** The whole experience — motion, mobile, a11y,
   reduced-motion, error states — should feel like the best, not just test green.

**The rule that outranks all of them:** honesty. No dimension is marked "best"
until it's measured. A real perfect score is earned on real hardware, not typed
into a table.

## The cycle

1. **Propose.** The board (companion) drafts genuine NextTask improvements —
   from the `RUBRIC.md` / `LAB.md` backlogs, or model-authored when the brain is
   on — via **Board Autopilot** (`lib/autopilot.ts`).
2. **File.** It creates them as real tasks on its own board, marked `🤖`,
   prioritized, and undoable as a batch. (Palette → "🤖 Ouroboros: file its own
   upgrade tickets".)
3. **Ship.** The coding agent (Claude Code on this repo) picks up the filed
   tickets and implements them — tests, lint, build green; commit; push.
4. **Reflect.** The next pass sees what shipped, updates the scorecard
   (`RUBRIC.md`), and proposes what's next. Back to step 1.

## Roles (and the honest boundary)

| Actor | Can | Can't |
|---|---|---|
| **In-browser companion** (tiny local LLM) | operate the board autonomously — create / complete / label / assign / reschedule / bulk-clear / undo; propose & file tickets | write code (sandboxed in the browser) |
| **Coding agent** (the dev loop) | implement tickets, refactor, test, commit, push | run inside the user's browser |

The browser AI drives the *what*; the coding agent delivers the *how*. Neither
closes the loop alone — together they do.

## Conventions

- **Ticket marker:** AI-authored tickets are prefixed `🤖 `.
- **Commit prefix:** loop-driven commits use `ouroboros:` (e.g.
  `ouroboros: add LLM intent-fallback`).
- **Scope:** experimental-only and fully reversible — Ouroboros never touches a
  non-experimental user's board, and every batch it files is undoable.
- **Cadence:** the development side runs on a recurring heartbeat against the
  `claude/secret-experimental-mode-sbyylv` branch; each tick = one
  build/polish/harden iteration with all evals kept green.

## The mentor (how the loop is supervised)

Ouroboros runs autonomously, but every tick passes under a mentor's eye — the
coding agent acts as reviewer/architect, not just an implementer:

- **Judgment over output.** Each tick picks the *highest-value* next move (backlog
  item or self-diagnosis), keeps it in scope, and prefers the smaller verifiable
  step over an un-runnable grand swing.
- **Standards are the curriculum.** No commit lands unless the eval corpus stays
  ≥90%, the full suite is green, and typecheck/lint/build are clean — with normal
  (non-experimental) mode untouched. New logic ships with a test.
- **Teach through the trail.** Commit messages explain the *why*; `RUBRIC.md`
  stays brutally honest (no model-gated dimension is marked certified without a
  real hardware eval); `LAB.md` / this file catalog new capability.
- **Course-correct.** Scope creep, risky refactors, or "autonomy" that depends on
  unverifiable LLM behavior get pruned. Genuinely ambiguous calls go to the human
  rather than getting guessed.

## Guardrails

- Deterministic by default (curated backlog), so a flaky 0.5B model can't derail
  the queue.
- Every filed batch is undoable; nothing is silently mutated — the user invokes
  each Autopilot run.
- The standard (`companionEval.ts`, ≥90%) and the full test suite gate every
  loop commit.
