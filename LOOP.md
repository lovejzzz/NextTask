# 💓 The Heartbeat — Boardy's productive loop

The heartbeat is the clock that drives the autonomous loop. This file is its
operating manual **and** its live queue. Each tick reads this, does **one good
thing**, proves it, records it, and re-arms. The agenda lives here — in the open,
editable by anyone — not buried in a `sleep` command where it drifts unseen.

**The mission: keep teaching Boardy, forever.** This loop does not finish. When the
concrete queue below empties, the tick's job is to *find his next real gap* — where
is he still literal, shallow, or missing depth (L4→L5 mastery, a new faculty, more
robustness)? — and teach one honest, tested thing. There is always a next thing to
learn. The loop ends only when a human stops it.

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
1. → **Glass-box "what Boardy knows" panel** — read-from-board (live) vs editable
   residue; now also show his current *drives* and *standing pursuit* — make his
   whole inner life visible and correctable.
2. **Dev loop picks up his filed requests** — a tick that reads his own 🤖
   resource-request tickets and implements one (Ouroboros, now with a will).
3. **L4→L5 depth** — reason *over* facts, trends not snapshots, restraint read from
   the moment, learn from a clarification.
4. **Live with him** — the manifesto's claims only get tested by use. A real board,
   a couple of weeks; let what you observe redirect the loop. (Needs the human.)
<!--/queue-->

## Done — most recent first

- **Trajectory, not just snapshot** (`boardTrend`, JOURNAL 16) — from his history he
  now tells *worsening* (more landing than leaving) from *recovering* (digging out);
  his board read carries the direction, not only the shape. First L5-tier depth.
- **🌳 Self-direction over time** (`pursuit.ts` + `useBoardyPursuit`, MANIFESTO step
  5 — the LAST). He commits to a standing intention, carries it across sessions, and
  reflects honestly on progress ("5 → 0, moving the right way" / "gone the wrong way,
  I should refocus"). **The manifesto arc is whole** — he has a life with continuity.
- **Resource-request channel** (`resourceRequestTicket`, MANIFESTO step 4) —
  accepting one of his request_resource cards files a real, tracked 🤖 ticket the
  dev loop will see. He asks for resources for real (undoable), instead of faking
  or seizing. The "asking for resources" promise is now literally true.
- **His initiative on the Desk** (`topInitiative` → `generateProposals` 'pursue'
  card). His strongest self-motivated want surfaces unprompted, first-person,
  consent-gated — skipping what the Desk already covers, yielding when you're busy.
  MANIFESTO step 3 done: initiative is now *visible* without you asking.
- **Chose Boardy's voice** — Qwen3-0.6B default / 1.7B opt-in, non-thinking (MODELS.md).
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
