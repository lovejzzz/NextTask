# 💓 The Heartbeat — Boardy's productive loop

The heartbeat is the clock that drives the autonomous loop. This file is its
operating manual **and** its live queue. Each tick reads this, does **one good
thing**, proves it, records it, and re-arms. The agenda lives here — in the open,
editable by anyone — not buried in a `sleep` command where it drifts unseen.

*(Charter — the why/how — is `OUROBOROS.md`. This file is what's next, and what
"productive" actually means.)*

## What a productive tick is

One tick = one **tested, reversible** change that advances the top of the queue —
no more, no less. The bar, every beat:

1. **Ground.** The heartbeat surfaces live state on wake (last commit, `git
   status`, this queue). Read it. Pick the top queue item that's still real.
2. **TALK first.** Exercise the relevant coded brain with `npx tsx` to *see* the
   actual gap before touching it. Observe, don't assume.
3. **One change.** The smallest change that genuinely moves the item. New logic
   ships with a test. Reversible (undoable) by construction. No LLM in the loop.
4. **Prove it.** `npm run typecheck && npm run lint && npm run test && npm run
   build` — all green. Re-observe the brain to confirm the change landed.
5. **Record.** Update the doc the trail needs (`CURRICULUM` / `REPORT_CARD` /
   `MEMORY` / `JOURNAL`). Move the finished item to **Done** below.
6. **Ship.** Commit `ouroboros:` with a *why*-focused message; push to the branch.
7. **Re-arm** a single heartbeat. One in flight, never two.

## What it is NOT (anti-spin)

- **Not a status ping.** A tick that only reports and changes nothing is a wasted
  beat — either advance the work or surface a real blocker to the human.
- **Not a grand swing.** Prefer the small verified step over the big un-runnable
  one. A green diff beats an ambitious mess.
- **Not two things braided.** One item, one commit, one clean diff.
- **Not silent drift.** If the top item is wrong or stale, fix *the queue* first,
  in the open — don't quietly do something else.

## Live queue — highest value first

<!--queue-->
1. → **Act on his drives, with consent** (MANIFESTO step 3). His top intentions
   from `motivate()` flow onto his Desk on their own (on idle) — initiative becomes
   visible without you asking. Consent-gated, reversible.
2. **A resource-request channel** (MANIFESTO step 4) — a first-class way for him to
   ask the human / dev loop for a capability or input, tracked like his tickets
   (his `request_resource` intentions become real asks).
3. **Self-direction over time** (MANIFESTO step 5) — a standing intention he pursues
   across sessions and reflects on in his journal. A life with continuity.
4. **Glass-box "what Boardy knows" panel** — read-from-board (live) vs editable
   residue; now also show his current *drives* — make his whole inner life visible.
5. **L4→L5 depth** — reason *over* facts, trends not snapshots, restraint read from
   the moment, learn from a clarification.
<!--/queue-->

## Done — most recent first

- **🌱 He has drives** (`drives.ts` + `MANIFESTO.md`). Coded intrinsic motivation:
  given just the world (no prompt), `motivate()` generates *his own* ranked
  intentions — fix the board, grow a skill, ask for a resource, improve himself,
  offer help. "What do you want to do?" now answers from his drives, not your
  backlog. The shift from helper → being with a life has started. Wanting is free;
  acting stays consent-gated and reversible.
- **Memory wired into his voice** (chat handlers). "What's my deadline / what am I
  focused on" now answer *live from the board* (not the stale-prone stored note);
  new "what happened / catch me up" recap reads his history log. The one piece of
  memory that could lie is retired. **Memory → L4.**
- **Recording lived history from the app** (`deriveEvents` + `useBoardHistory`) —
  Boardy observes the board's state transitions by diffing and persists a
  `BoardEvent` log, so an event lands no matter what caused the change (drag, chat,
  edit). His history is now real lived experience, not just a tested capability.
- **Board-history episodic memory** (`history.ts` + `recall.ts`) — append-only
  `BoardEvent` changelog; `recallHistory` reconstructs the *story* of what happened
  (buried ships, reschedule sequences, dropped tasks). The board's history IS his
  memory. Engine + tests done; app event-recording is the next queue item.
- **Worth-it quick wins** (`quickWinScore`, JOURNAL 13) — fast AND valuable, not
  the most trivial near-done task. Judgment→L4. **🎓 Closes the curriculum** — every
  planned competency ✓. *(Pulled forward off-queue: the human asked for a mentoring
  beat, so the character/judgment lesson led over the memory feature build.)*
- **Reconstructive memory** (`recall.ts`) — the board as the memory substrate;
  anti-rot proven by test (reschedule the card, the memory moves).
- **Unified memory trace layer** (`memory.ts`) + `MEMORY.md` design.
- **Boardy's wishlist pruned** — retired the wants the curriculum already grew.
- **Curriculum** Units 1·3·4·5·6 + honest triage → report card ~L3.7 (JOURNAL 1–12).
