# 🐍 Ouroboros — the self-improvement loop

> The serpent eats its own tail. NextTask uses NextTask to improve NextTask.

Ouroboros is the automated loop in which the product's own AI companion plans
its upgrades, files them as real tickets on its own board, and the coding agent
ships them — then the board sees its improvements land and proposes the next
ones. A system that grows by feeding on its own output.

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

## Guardrails

- Deterministic by default (curated backlog), so a flaky 0.5B model can't derail
  the queue.
- Every filed batch is undoable; nothing is silently mutated — the user invokes
  each Autopilot run.
- The standard (`companionEval.ts`, ≥90%) and the full test suite gate every
  loop commit.
