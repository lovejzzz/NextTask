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
1. → **Board-history episodic memory.** Append-only `BoardEvent` log (created /
   moved / rescheduled / completed / dropped); `recall.ts` reconstructs *real*
   episodic memory from it, not the `updated_at` proxy. The board's history IS
   Boardy's memory — his body's record of its own life. (See MEMORY.md.)
2. **Wire `reconstruct()` into chat** — answer "what's my deadline / focus /
   recent" live from the board; retire the stale-prone `recallFact` note-store
   (Entry 9), the one piece of memory that could still lie.
3. **Glass-box "what Boardy knows" panel** — split *read-from-board* (live) vs the
   small editable/pinnable residue. Make his whole mind visible and correctable.
4. **Shrink the residue** — keep only genuinely board-less facts in the trace
   layer; let the board carry everything it can.
5. **L4→L5 depth** (post-syllabus mastery) — reason *over* facts (Memory→L4),
   notice *trends* not snapshots (Perception→L5), restraint read from the moment
   (Collaboration→L5), learn from a clarification (Language→L5).
<!--/queue-->

## Done — most recent first

- **Worth-it quick wins** (`quickWinScore`, JOURNAL 13) — fast AND valuable, not
  the most trivial near-done task. Judgment→L4. **🎓 Closes the curriculum** — every
  planned competency ✓. *(Pulled forward off-queue: the human asked for a mentoring
  beat, so the character/judgment lesson led over the memory feature build.)*
- **Reconstructive memory** (`recall.ts`) — the board as the memory substrate;
  anti-rot proven by test (reschedule the card, the memory moves).
- **Unified memory trace layer** (`memory.ts`) + `MEMORY.md` design.
- **Boardy's wishlist pruned** — retired the wants the curriculum already grew.
- **Curriculum** Units 1·3·4·5·6 + honest triage → report card ~L3.7 (JOURNAL 1–12).
