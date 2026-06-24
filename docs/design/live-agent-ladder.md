# The live-agent ladder

*A design note on giving Boardy a real frontier-model brain — and how far up that
goes before the climb changes character. Companion to
[`live-agent-brain.md`](../experiments/live-agent-brain.md), which logs each rung as it
was built.*

## The one invariant

Boardy's spine is deterministic: a real parser, audited primitives, an undo stack, a
self-author gate. The experiment was to let an actual frontier model *be the brain* on top
of that spine — at runtime, in the app — without surrendering any of the guarantees the
spine provides.

Everything below is organized by a single invariant, and it is the whole point:

> **The brain proposes; a gate and the human's "yes" decide.**

A fuzzy model guess may climb every rung of this ladder and still never silently change a
thing. Each rung adds *reach*, never *authority*. Authority stays with the gate (tests,
not nerve) and with the person (consent, not autonomy). That is what makes a non-deterministic
brain safe to bolt onto a deterministic spine.

## The five rungs

| # | Rung | What the brain gains | What guards it |
|---|------|----------------------|----------------|
| 1 | **Voice** | speaks as Boardy | the deterministic spine still produces every effect; the model only chooses words |
| 2 | **Live brain** | answers at runtime, no API key on the client | the app's Tier-1 path; the bridge carries text, not capability |
| 3 | **A hand** | *proposes* one board action | `gateAction` — kind known, task grounded, reversible |
| 4 | **The board moves** | an accepted action *runs* | routes through the real store + undo stack; consent per action |
| 5 | **Grows himself** | *authors a new skill* for itself | `selfauthor.gate` — every step validates through the real parser, ≥2 steps, novel |

Rungs 1–2 are about *who speaks*. Rungs 3–5 are about *what may change*, and each reuses
an existing gate rather than inventing a softer one:

- **Rung 3 (a hand)** introduced `propose_board_action`: a closed set of safe, reversible
  kinds. The model fills in arguments; `gateAction` admits only if `task` names a title that
  *actually exists on the board* — "never invent a task" enforced at the action layer, the
  same rule the voice prompt enforces for words. On admit, the task is normalized to the
  board's exact title, so what executes is never the model's paraphrase.
- **Rung 4 (the board moves)** wired an admitted proposal to the real primitives and the
  real undo stack. Nothing new is trusted; the proposal becomes the same consent card and
  undo label the app already speaks. The human accepts one action at a time.
- **Rung 5 (grows himself)** let the brain author its own capability via `propose_skill`,
  judged by the *pre-existing* self-author gate — the same authority that admits skills
  learned from repeated user commands. No special treatment: every step must run through the
  real parser, it must be a genuine ≥2-step composition, and the name must be novel.

## Why this is a real ceiling for *this* axis

The axis these five rungs climb is **"how much can a runtime model brain touch, and under
what authority."** At rung 5 that axis is essentially saturated: the brain can speak, act,
and extend its own repertoire, and at every step a deterministic gate plus a human stand
between proposal and effect. Going further does not mean a sixth notch on the *same* ladder —
it means a *different* ladder, with a different safety story:

- **Real UI surface (browser/computer use).** The reach stops being "a closed set of board
  primitives" and becomes "arbitrary clicks." The gate can no longer be a pure function over
  a known board; it needs sandboxing and a different consent model.
- **Multi-step plans.** The brain composes several actions into one reviewable sequence. This
  is the one rung that stays *on* the current ladder — it is pure composition over
  `gateAction`, no new authority — which is exactly why it's the right next thing to build.
- **Codegen at the dev-loop seam.** The full Tier-4 move (Boardy writes new primitives *as
  code*) is safe only where code is sandboxed, tested, and human-merged — i.e. CI, not the
  app. That's a different trust boundary entirely.

So rung 6 is **multi-step plans**, and it is deliberately the most conservative of the three
reaches: it adds reach (a *sequence* of changes, reviewed together) while keeping authority
exactly where it already is. A plan is admitted only if *every* step independently passes
`gateAction`; the human accepts or rejects the whole sequence; each executed step remains
individually reversible. If any step is ungrounded, the plan is held — the brain doesn't get
to smuggle an invented task in by burying it in a list.

## Rung 6: multi-step plans (this note's implementation)

The shape, kept faithful to the invariant:

1. A new tool, `propose_plan`, lets the brain offer an **ordered list of board actions** with
   a one-line rationale for the sequence.
2. `gatePlan` runs **the existing `gateAction` on each step**, against the same board. The
   plan is admitted only if every step is admitted; otherwise it's held, with the per-step
   reasons in the open. Admitted steps carry their tasks normalized to exact board titles,
   just as single actions do.
3. The human sees one **plan card** — the whole sequence — and accepts or dismisses it as a
   unit. On accept, the steps run in order through the same primitives and undo stack as rung
   4; each step is still individually undoable.

No new authority is introduced. A plan is just actions, reviewed together, each held to the
bar it would face alone.

### Follow-through: the plan actually moves the board

Mirroring rung 4, an admitted plan is wired to the **real store** (`mockApi` over
`localStorage`) via `executePlan` (`liveExecute.ts`): it runs each gated step in order,
captures a precise inverse from the live board just before each step, and returns **one undo
that reverses the whole sequence** in reverse order. The human accepted the sequence as a
unit; it undoes as a unit. Only already-admitted actions (tasks normalized to exact titles by
`gatePlan`) are ever passed in — the executor applies, it never resolves or invents.

Verified end to end (`liveExecute.test.ts`): a plan of `clear_overdue → drop "Old onboarding
doc" → complete "Reply to Dana"` clears the overdue pile, removes the doc, and completes Dana
on the real board — and a single `run.undo()` restores all three. A plan the gate holds never
reaches the store: the board stays byte-identical. (Honest caveat: a dropped task is restored
by re-creating it with its prior content, so drop is reversible in substance, not in identity
— the restored card carries a fresh id.)
