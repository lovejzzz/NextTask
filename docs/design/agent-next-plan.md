# Agent-next plan — more reach, proven and certified

**Where we are:** the in-browser agent is wired and CI-green (549 tests) —
`docs/design/agent-rung-plan.md` is complete. Chat → tool call → gate → consent card →
reversible execute (single action + plan), with policy, few-shot, injection test,
glass-box trail, and an agent eval. **What's left** is breadth (the agent can only
propose 4 action kinds and can't propose skills), a couple of quality/perf refinements,
and the one thing the sandbox can't do — certify the live model on real WebGPU.

**The invariant (unchanged, non-negotiable):** the model *proposes*; the gate **+ the
human's "yes"** *dispose*; every accepted action is **reversible**; an invented or
malformed call is refused by the gate, never executed.

**Definition of done per step:** `npm run verify:ci` green (typecheck + lint + test +
build), committed and pushed to `claude/secret-experimental-mode-sbyylv`, docs kept
honest (always state wired-vs-library, and what's certified vs. merely built).

**Order:** Phase A (reach) → Phase B (quality) → Phase C (certify). Phase C's one step is
**blocked on GPU hardware** and is the real gate to claiming "certified."

---

## Phase A — More reach

### 1. Wire rung 5 — let the model propose a new skill
- **What:** offer `SKILL_TOOL` alongside the action/plan tools in the chat agent path. On a
  `propose_skill` call, run `readSkill` (liveAction.ts) → the **existing** self-author gate
  (`selfauthor.gate` / `explainGate`), then surface an `ActionProposalCard`; on Accept,
  `toolbox.add({ name, steps })` — the same path the app already uses for skills detected
  from repeats. Record the proposal/verdict in the glass-box trail.
- **Where:** `agentReply` (App.tsx) gains a `propose_skill` branch; reuse `selfauthor.ts`,
  `toolbox`, `ActionProposalCard`. No new gate.
- **Done when:** asking the board to "make a skill that clears overdue then plans my day"
  yields a gated consent card; Accept adds a runnable skill; a < 2-step or invalid skill is
  held by the gate. Covered by a unit test on the propose_skill→gate path.

### 2. Add `create_task` to the action vocabulary
- **What:** let the agent propose creating a task. This is the one kind where naming a title
  **not** on the board is *correct* — so extend the gate carefully: a new `ActionSpec` flag
  (e.g. `createsTask`) that requires a non-empty title but explicitly does **not** require it
  to already exist (and should warn/skip if it duplicates one). Execution maps to the
  existing `createTask` mutation with an undo that deletes the created task.
- **Where:** `liveAction.ts` (`ActionKind`, `ACTIONS`, `BOARD_ACTION_TOOL` enum/description,
  `gateAction` branch), `applyProposedAction` (App.tsx).
- **Done when:** "add a task to email Sam" proposes a `create_task` card; Accept creates it,
  Undo removes it; gate tests cover the new kind (incl. the "don't require existence" path and
  an empty-title rejection).

### 3. Add `reprioritize`, and give `reschedule` a real date
- **What:** add a `set_priority` kind (needs an existing task + a `priority` arg) and extend
  `ProposedAction` with an optional `priority`; thread it through the tool schema, `readAction`,
  the gate (validate the enum), and `applyProposedAction` (updateTask priority, undo restores
  prior). Separately, let `reschedule_task` carry an optional `due_date` instead of always
  defaulting to tomorrow (fall back to tomorrow only when none is given).
- **Where:** `liveAction.ts`, `applyProposedAction` (App.tsx), and the agent-eval cases.
- **Done when:** "make the launch high priority" proposes a `set_priority` card (Accept +
  Undo work); "push the review to Friday" reschedules to that date; gate/readAction tests
  cover the new arg and reject a bad priority value.

## Phase B — Quality and performance

### 4. One generation per turn (cut the double-generation latency)
- **What:** today a turn may run a (non-streamed) tool-call attempt **and then** a second
  streamed prose generation — slow on a local model. When the tool-call attempt yields no
  tool call, reuse its own text as the conversational reply (clean it) instead of generating
  again. Keep the streamed prose path for the no-propose case.
- **Where:** `chatWithBoard` (App.tsx) + `createLocalToolCall` (return the cleaned text).
- **Done when:** an open-chat turn that proposes nothing produces exactly one model call;
  verified by a test asserting the generate stub is invoked once.

### 5. Adversarial proposal check (small-model spurious-proposal guard)
- **What:** before surfacing a proposal from a *local* model, optionally run one cheap
  refute-pass ("is this action actually what the user asked for? answer yes/no") and drop the
  proposal on "no". Skip for a capable remote brain. Make the decision a pure, tested function.
- **Where:** a new pure helper (e.g. in `agentPolicy.ts`) + a call site in `agentReply`/chat.
- **Done when:** the verifier function is unit-tested; a clearly-irrelevant proposal is
  dropped to plain talk; degradation never crashes.

### 6. Broaden the agent eval battery
- **What:** expand `agentEval.ts` cases — more act/refrain prompts, the new kinds
  (create_task, set_priority), a plan case, and an adversarial-title case — so the self-test
  number means more. Optionally report per-kind pass rates.
- **Where:** `agentEval.ts` (+ the live self-test cases in App.tsx).
- **Done when:** the battery covers every wired kind plus refrain/injection; mock test green.

## Phase C — Certify (BLOCKED on GPU hardware)

### 7. Live WebGPU certification
- **What:** run the `RUBRIC.md` procedure on a real GPU — load Gemma 4 E2B, run the self-test
  (voice + agent score) and the hand-run agent battery (now covering the new kinds), record
  tokens/sec and scores, then flip the `best-in-browser-ai.md` "Live Gemma quality certified"
  row ⚠️ → ✅ with the date and numbers.
- **Note:** the sandbox has **no WebGPU** and can't pull a multi-GB model — this needs a human
  with a GPU or a WebGPU-capable CI runner. Everything around the model is already CI-green.
- **Done when:** the procedure has been run once and the results + date are recorded; until
  then the row stays ⚠️ and the work is "built, not certified."

---

### Related docs
- `docs/design/agent-rung-plan.md` — the completed plan this extends.
- `docs/design/best-in-browser-ai.md` — the north star + scorecard to keep current.
- `docs/design/live-agent-ladder.md` — the rung ladder (rung 5 is the open one here).
- `RUBRIC.md` — the live certification procedure (Phase C).
- `MODELS.md` — the model decision + honest caveats.
