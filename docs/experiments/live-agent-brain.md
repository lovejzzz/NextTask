# Experiment: the agent-in-the-loop brain (Tier ∞)

Status: **experimental**, branch `claude/secret-experimental-mode-sbyylv`. Not a shipping feature.

## The idea

Boardy's brain has tiers:

- **Tier 0 — coded voice.** Deterministic, grounded in board state. Ships with zero
  dependencies, works offline, never invents a task. This is the trustworthy spine.
- **Tier 1 — BoardyV1.** The same spine, but the words come from any OpenAI-compatible
  model the user points it at (`createRemoteGenerate` → `/v1/chat/completions`).

Tier 1 was built to need a model *endpoint* — a key, or a local server. But the question
that drove this experiment was sharper: *if a capable model is already in the room (the
Claude Code agent driving this session), why route Boardy through a third party at all —
why not hook him straight to the agent?*

## The mechanism

`scripts/liveBridge.mjs` is an OpenAI-compatible endpoint with **no model behind it**.
Every chat request is parked on a file queue; a live agent reads the real prompt, voices
Boardy by hand, and writes the reply back. The bridge returns it as an ordinary
chat-completion. To the app, it is indistinguishable from a model server — but the
"model" is a frontier model in the loop.

```
NextTask (Tier 1)  ──POST /v1/chat/completions──▶  liveBridge
                                                       │  writes req-<id>.json
                                                       ▼
                                                  [ the agent ]  reads the prompt,
                                                       │         voices Boardy
                                                       ▼  writes reply-<id>.txt
NextTask receives  ◀──────chat-completion──────────  liveBridge
```

No key. No stub. No echo. The app's own generate path is exercised end to end; the only
thing swapped in is *who answers*.

## A real exchange (captured live)

The **real** `buildChatMessages` prompt was sent through the app's `createRemoteGenerate`
path to the bridge. Board state: 9 active, 5 in progress, launch Thursday, it's Tuesday
night; memory notes the user "ships in bursts then crashes for a day; keeps adding tasks
mid-sprint." The user turn:

> it's midnight and i just added three more tasks. am i gonna make thursday?

What the app received from its Tier-1 brain (voiced by the agent):

> Honestly? Not at this rate — five things in progress, two days left, and you just added
> three at midnight, which is the exact move that crashes you tomorrow. Stop starting:
> close "Fix Stripe webhook" or "Ship v2 landing" before you touch anything new. And the
> one that can actually sink Thursday is "App Store review (waiting on Apple)" — that's
> Apple's clock, not yours, so chase it now or accept it.

Why this is more than a pipe test: the reply honors the upbringing (truth before comfort),
uses real memory as leverage (the midnight-add *is* the burst-then-crash pattern), applies
the WIP lesson ("stop starting"), and reasons that the *blocked* task is the real risk to
the deadline — all while quoting only tasks that exist on the board. A stub cannot do that;
it required actually understanding the situation.

## Pushing further: from voice to hand (gated actions)

Voicing Boardy is still only *talking*. The next ceiling: let the brain **act**. But the
codebase has a hard invariant — the model can only widen *understanding* (`intentFallback`
classifies into safe, read-only intents); every *mutation* belongs to the deterministic
parser, so a fuzzy guess can never silently change the board.

The apex keeps that invariant and breaks the talking-only ceiling at the same time, by
extending the existing safety machinery rather than going around it:

- **A hand, in the seam.** `brainProviders` gains tool-calling — `buildChatCompletionBody`
  passes `tools`, `parseToolCall` extracts a chosen call, `createRemoteToolCall` returns
  prose *or* a structured action. The plain voice path is byte-identical to before.
- **An action gate (`src/lib/liveAction.ts`).** The brain is offered ONE tool,
  `propose_board_action`, over a closed set of safe, reversible kinds (`complete_task`,
  `reschedule_task`, `drop_task`, `clear_overdue`). `gateAction` — modeled on the
  self-author gate, "the authority that replaces supervision" — admits a call only if it
  is grounded in a task that **actually exists** (enforcing "never invent a task" at the
  action layer, exactly as the voice prompt enforces it for words) and is reversible. On
  admit it normalizes to the board's exact title, so the model's paraphrase never executes.
- **Still consensual, still undoable.** An admitted action becomes a `toProposal` card the
  human accepts or dismisses, mapped to an already-audited primitive with an undo label.

### A real action (captured live, through the bridge)

Board includes `"Fix Stripe webhook"`. The user, via the app's real tool-call path:

> the stripe webhook is finally passing in prod. close that one out for me and tell me
> what still matters for thursday.

The brain (the agent) answered not with prose but a **tool call**, which the gate then judged:

```
tool_call: propose_board_action { kind: complete_task, task: "Fix Stripe webhook",
                                   reason: "you said it's passing in prod, blocking the Thursday path" }
GATE (admit):  grounded in "Fix Stripe webhook", reversible
  → card: Mark "Fix Stripe webhook" done — …? You decide; it undoes.
  → on YES routes to audited primitive: complete  |  undo: complete "Fix Stripe webhook"

GATE (hallucinated "Delete all finished tasks"): admitted=false
  → "Delete all finished tasks" is not a task on the board — I won't invent one
```

The brain gained a hand; the gate and the human's yes still own the board. A model guess —
even a destructive, invented one — cannot mutate anything. The ceiling moved; the spine held.

### Closing the loop: the board actually moves

A proposal that can't execute is still theatre. The last rung runs an *admitted* action
through the **real store the app uses** (`mockApi` over `localStorage`), via the same
audited mutation + undo wiring as `App.tsx`:

```
brain tool_call → gateAction (admit, normalize to exact title)
   → mockApi.updateTask(id, {status: 'done'})   // the board really moves
   → undo: mockApi.updateTask(id, {status: prev}) // and reverses, cleanly
```

Verified end to end (`liveAction.execute.test.ts`): a grounded `complete_task` flips a
real task to `done` and the proposal's undo restores it to `in_progress`; a hallucinated
action is rejected by the gate and **never reaches the store** — the board stays
byte-identical. Talk → hand → the board moves, reversibly, with the gate and the human's
yes in the middle the whole way.

## Run it

```sh
BRIDGE_DIR=/path/to/queue PORT=8790 node scripts/liveBridge.mjs
# point Boardy's Tier-1 endpoint at http://localhost:8790/v1
# then: read each req-<id>.json, write reply-<id>.txt with Boardy's words
```

## Honest boundary

This works because an agent is attached to the session. A shipped app can't assume that —
in production "hook him to a model" still means the app needs its own line to one (a user
key, or a local model). This experiment isn't a deployment path; it's a proof that the
Tier-1 seam is real enough that a frontier model can voice Boardy through it, today, with
nothing in between.
