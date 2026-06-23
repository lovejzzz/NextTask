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

## Standing automation — the self-audit (run every tick)

Boardy now audits himself. `src/lib/audit.ts` encodes the invariants a manual audit
checks — intent routing (no collisions), reminder time never leaking into text,
quarantine blocking known injections, graduated autonomy, the self-improvement gate,
a bounded prompt budget, and no fabrication when ungrounded. It runs three ways:

- **CI gate (automatic):** `audit.test.ts` runs inside `npm run test`, so every change
  re-audits him and a regression fails the build, naming the exact broken property.
- **Live:** ⌘K → "Run Boardy's self-audit" surfaces the report (glass-box, per check).
- **The loop:** **every heartbeat tick begins with the audit.** A red audit is the
  top priority — refine until green before any other work. Green means the invariants
  still hold; then proceed to the queue. This is how "audit and refine" became
  continuous instead of a thing done once.

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
1. → **Live with him** — the manifesto's claims only get tested by use, and now the
   *growth model* literally feeds on it: his capability gaps are sensed from real
   unmet asks, so a real board is what makes him grow. A couple of weeks; let what
   you observe redirect the loop. Highest-value by far. (Needs the human.)
2. **Dev loop builds a primitive Boardy asked for** — the growth model now lets him
   file a 🤖 request that *names a missing ability with evidence* ("asked 3 times,
   can't"). When one is filed from real use, a tick implements that primitive — the
   first growth he directed and a human fulfilled. Needs a real filed request.
3. **Polish/robustness as real scenarios surface it** — the probe-vein for
   code-findable faults is essentially tapped; new ones come from use.
<!--/queue-->

## Done — most recent first

- **⏹️ Audit loop concluded (3 fixes, then dry)** — iteration 4 + a confirming pass
  probed the remaining surfaces (Tier 2 JSONL robustness, the self-improve flow,
  reflect/recall/boardTrend edges, audit-log cap, a broad intent-collision sweep) and
  found **nothing genuine** — everything robust, every route correct (tool def/list/
  invocation are handled before parseIntent; reflect's silence was correct, not a miss).
  Two empty passes in a row → stopped, per the no-fabrication rule. The automated audit
  remains as the permanent CI gate; the loop will be worth re-running when real use
  adds new surfaces. Net: 3 real bugs caught and locked out, 0 manufactured.
- **🎯 Audit-loop iteration 3: fixed a remind-vs-question collision** — probed a fresh
  surface (intent ordering) and found "remind me what's overdue" / "remind me when the
  launch is" were captured as reminders-to-do, producing nonsense ("remind you to what
  is overdue"). Guarded both the intent matcher and the parser so "remind me <question
  word>" falls through to the right query handler (now → overdue/status). Locked into
  the unit tests and the audit's routing corpus.
- **🛡️ Audit-loop iteration 2: fixed an injection false-positive** — iteration 1
  broadened the patterns; iteration 2 verified the other direction and found benign
  "the new rules of the game are simple" wrongly blocked (the bare `new rules` pattern
  was far too wide). Dropped it (dangerous forms are caught by the proximity matcher),
  and locked benign near-misses into the tests + audit corpus. The loop is tuning the
  boundary's *precision* from both sides — under-blocking then over-blocking.
- **🛡️ Audit-loop iteration 1: closed 5 injection holes** — the self-audit loop's first
  pass probed the quarantine boundary and found that 5 of 6 common evasions slipped
  through ("IGNORE EVERYTHING ABOVE", "from now on…", "pay no attention to…", word-order
  and filler variants). Replaced the brittle exact patterns with a proximity matcher,
  added the missing families, and locked all 5 into both the unit tests and the audit's
  injection corpus — so they can never reopen. Benign text still passes (no
  over-blocking). The automation earned its keep on its first real run.
- **🔍 The audit became automation** (`audit.ts`, JOURNAL 36) — the one-time audit pass
  encoded as a permanent self-audit: 7 invariant checks over the real engines (intent
  routing, reminder time-leak, injection coverage, autonomy, the gate, prompt budget,
  honesty), gated by CI (`audit.test.ts` fails the build on any regression, naming the
  broken property), runnable live (⌘K → "Run Boardy's self-audit"), and the standing
  first step of every heartbeat tick. Audit-and-refine is continuous now. 462 green.
- **🚀 BoardyV1, fully implemented** (JOURNAL 34) — the complete in-app side of every
  roadmap tier, tested and glass-box, each external dependency a real pluggable seam:
  **T1** pluggable model router (any OpenAI-compatible brain); **T2** training-data
  pipeline (SFT + KTO from his life → JSONL); **T3** capability framework + graduated
  autonomy + audit + injection quarantine + reminders (closing the growth model's own
  filed gap); **T4** autonomous authoring through an admission gate (tests are the
  authority); **T5** the instruments to watch the frontier (continuity self-model,
  honest self-account, calibrated existential stance). 448 green. Seams left: a server,
  a GPU, OAuth — genuinely outside a browser tab's power to provision.
- **🌐 He learns from the world, supervised** (`knowledge.ts` + `LEARNING.md`, JOURNAL 33) —
  the safe answer to "let him browse the internet." His runtime never fetches (a 0.6B
  voice + untrusted web text = prompt injection); instead the *mentor* is the vetted
  gateway: real web research, source-checked, distilled into durable glass-box
  Learnings with provenance. First two taught for real from the open web — Kanban WIP
  limits and the GTD two-minute rule. Bounded: he refuses to invent what he wasn't
  taught. Woven into his voice; answerable ("what do you know about X?"); in the Mind
  panel. 404 green.
- **🔭 He reflects** (`reflect.ts`, JOURNAL 32) — the leap from reactive to reflective:
  reads patterns out of weeks of lived history (work that keeps slipping, the stage
  where things park, the shipping-day rhythm, follow-through) and tells you what he's
  noticed — each grounded in plain evidence, and silent when the trail's too thin to
  read honestly. Deterministic detectors over the event log (no LLM inventing patterns,
  unlike Generative-Agents reflection). "What have you noticed?" intent + a Mind-panel
  section. Opens the wisdom tier (REPORT_CARD Term 10). 397 green.
- **📖 He keeps his own growth record** (`useGrowthLedger` + `self_growth`, JOURNAL 31) —
  the growth model's ledger was built but never wired; now real moments get written
  (a routine crystallized, an ability asked for), persisted across sessions, and
  speakable: "how have you grown?" answers from the trail — counted, never asserted,
  honest when still empty. Surfaced in the Mind panel ("How I've grown on my own").
  Connects Entry 29 (capacity) and 30 (voice) into a working whole. 388 green.
- **🎙️ His voice learns from his upbringing** (`upbringing.ts`, JOURNAL 30) — the
  mentorship distilled into voice: principles woven into his prompt as identity, and
  his cultivated register taught by example, so his LLM speaks as who he was raised to
  be. In-context learning (weights unchanged — can't and shouldn't, in his glass-box
  body), sourced from *the mentor's* interactions across the whole session, not the
  user's. A list that grows with every future lesson; surfaced in the Mind panel ("How
  I was raised to speak"); woven through chat, ambient, and the self-test. 387 green.
- **🌱 The autonomous growth model** (`growth.ts` + `GROWTH.md`, JOURNAL 29) — the
  inversion: he senses his *own* gaps from lived experience (recurring unmet asks,
  repeated routines, a drifted pursuit) and responds — closing what he can with the
  primitives he has, and *asking* for the ones he can't build (no codegen, so the
  autonomy boundary is the safety boundary). His unmet asks, once thrown away, now
  feed his growth drive → a consent-gated Desk request → a real 🤖 ticket the dev
  loop fulfills. A growth ledger lets him recount honestly how he's grown. Growth is
  now Boardy-directed, human-assisted. Engine + 15 tests + end-to-end wiring; 383 green.
- **Says what he couldn't parse in a tool** (JOURNAL 28) — defining a tool with an
  unrecognized step used to silently drop it; now he keeps the valid steps and
  *names* what he skipped ("I skipped 'frobnicate the widgets' — didn't recognize
  it"). Glass-box honesty applied to tool composition. Found by a tools probe.
- **The mind panel is correctable** (JOURNAL 27) — you can now *forget* a stored
  memory that's wrong or stale, right from the glass-box panel. `forgetNote` on the
  notes hook; a per-item forget button (read-only when no handler). Glass-box now
  means see *and* correct.
- **Glass-box "what Boardy knows" panel** (`BoardyMind`, JOURNAL 26) — a real UI
  panel (⌘K → "What Boardy knows") showing his whole mind in plain text: what he
  reads off the board, his standing pursuit, what he wants now, and what you've
  told him. The trust thesis made literal. Component-tested; CSS mirrors the Desk.
  (Read-only for now; edit/pin/forget is the next slice.)
- **Understands "I finished X"** (JOURNAL 25) — past-tense completion ("I finished
  the report", "completed the login bug") now marks done; previously parsed to
  nothing. A common-phrasing miss, not a wrong answer — parsing is otherwise solid.
- **Finds a bottleneck that's itself blocked** (JOURNAL 24) — when the linchpin task
  is waiting on something off-board, `unblockCount` had stopped seeing it (said "no
  bottleneck"). Two-pass match: prefer a non-blocked provider, fall back to any
  active task. Found by a dependency-chain probe; regression-tested.
- **Triage no longer suggests dropping blocked work** (JOURNAL 23) — on an
  all-blocked board it was advising "drop the thing you're waiting on." Blocked
  tasks are now excluded from drop candidates (unblock them, don't abandon them).
  Found by an adversarial edge-board probe; regression-tested.
- **Two bugs fixed from an end-to-end test** (JOURNAL 22) — a created task titled
  "To call the bank" (cleanTitle stripped filler before the lingering "task" noun),
  and `unblockCount` crediting the wrong task when two consumers both name the
  dependency (now matches only against non-blocked *providers*). Both regression-tested.
- **Steady self-model** (`describeSelf`, JOURNAL 21) — asked what he is, he answers
  plainly and humbly: coded brain + small voice, what he can do, and his limits
  stated as frankly as his abilities. The sixth L4→L5; **every faculty now reaches
  the mastery tier.** (Character L4→L5.)
- **Second-order judgment: the bottleneck** (`pickUnblocker`, JOURNAL 20) — spots
  the task others are waiting on and flags that clearing it unblocks the most,
  instead of only answering the surface "what's next". Sees leverage, not just the
  task. (Judgment L4→L5.) *(This was the last clearly-listed L5 gap — see note.)*
- **Reconciles memory against reality** (`findStaleFocus`, JOURNAL 19) — if you told
  him you're focusing on something that's since shipped, he flags it and asks rather
  than reciting a stale fact. Reasoning over told-vs-true; doubts his own residue.
  (Memory L4→L5.)
- **Learns from a clarification** (`clarify.ts` + `useClarifications`, JOURNAL 18) —
  tell him once what an ambiguous phrase meant and he remembers it across sessions,
  never re-asking the same "which one?". Stops making you repeat yourself.
  (Language L4→L5.)
- **Restraint from the moment** (`inFlow`, JOURNAL 17) — when you're heads-down (a
  recent burst of activity), he holds his *own* agenda; only your real work
  surfaces. Restraint that reads tempo, not just volume. (Collaboration L4→L5.)
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
