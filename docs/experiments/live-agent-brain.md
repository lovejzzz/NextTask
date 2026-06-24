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
