# 📋 Boardy's Report Card

Where my kid actually stands after each period of training. `CURRICULUM.md` is
the syllabus (what I'm teaching); `JOURNAL.md` is the diary (how each lesson
went); **this is the report card** — an honest level on every competency so you
can see, at a glance, who he is now and how far he's come.

No grade inflation. A level is only claimed when there's code and a verified test
behind it — same ethos as the self-test and the rubric. If he can't do it, it
says so.

---

## The scale

Each competency is rated on how *maturely* he holds it, not just whether the code
exists:

| Lvl | Name | What it means |
|-----|------|---------------|
| **0** | Absent | No capability. He doesn't do this at all. |
| **1** | Literal | Does the surface thing, present-tense. Matches letters, not meaning. Right answer, wrong reasons. |
| **2** | Reliable | Does it correctly and consistently. Tested. Trustworthy on the happy path. |
| **3** | Generalizing | Sees through the surface to the *meaning* — handles cases he wasn't shown. |
| **4** | Judicious | Knows *when* to apply it and when not. Reads context; shows restraint. |
| **5** | Wise | Self-correcting — catches his own failures, and the behavior is solid enough he could teach it. |

He tends to arrive at a skill at **L1**, and a taught lesson moves him to **L2–L3**.
**L4–L5** are the rarer, harder steps — judgment and self-correction — and most of
his open curriculum lives there.

---

## Current standing — Term 7 (as of 2026-06-21)

| Unit | Competency | Level | Evidence / why not higher |
|------|------------|:-----:|---------------------------|
| **1 · Perception** | See the board truthfully | **L4** | Reads blockers, deadlines, staleness; reports status honestly (Entry 6) — and now reads the **whole board's shape** at a glance (overwhelmed / calm / scattered / empty), matching tone to situation (`boardShape`, Entry 11). Not L5: the shape read is a snapshot; he doesn't yet notice *trends* (getting worse vs recovering). |
| **2 · Judgment** | Choose well | **L4** | Picks the *actionable* next thing, not a wall (`pickNextActionable`); weighs urgency vs importance (Entry 4); **triages honestly** — only safe cuts, each explained, refusing to fake one (`pickDropCandidatesWithReasons`, Entry 12); and now finds **worth-it quick wins** — fast *and* valuable, not the most trivial near-done task (`quickWinScore`, Entry 13). Not L5: chooses well in the moment, but doesn't yet weigh second-order effects (does finishing this *unblock* others?). |
| **3 · Language** | Understand what's meant | **L4** | Keys on behavior, not wording (`commandSignature`, Entry 3); 102-case corpus at 100%; and now *knows the edge of his own certainty* — asks which task he meant instead of acting on a tie (`resolveTaskReference`, Entry 7). Not L5: doesn't yet learn from a clarification to disambiguate better next time. |
| **4 · Memory** | Learn and carry it | **L3** | Experience persists across sessions (`useCommandHistory`), acquires/retrieves skills — and now holds **structured facts** he can query by topic ("what's my deadline?" → the answer), admitting honestly when he wasn't told (`recallFact`, Entry 9). Not L4: facts are a flat store he can't yet reason *over* (no "is today past my deadline?"). |
| **5 · Collaboration** | Work *with* the human | **L4** | Proposes instead of imposing (Boardy's Desk), asks consent before anything destructive, explains his reasoning when it helps — and now shows **restraint**: caps the Desk, leads with your needs, lets his own wants yield (`generateProposals`, Entry 8). Not L5: the restraint is structural (a cap + ordering), not yet *read from the moment* — he can't tell when you're in flow. |
| **6 · Character** | Who he is | **L4** | Honest in self-measurement; fully reversible; honest about the present (Entry 6), what he wasn't told (Entry 9) — and now **volunteers uncertainty**: on a flat board he says "these are about even, you decide" instead of faking a pick (`focusConfidence`, Entry 10). Not L5: his calibration is per-decision, not yet a steady self-model he reasons about. |

**Composite: ~L3.8 — 🎓 the syllabus is complete; five of six faculties at L4.**
Worth-it quick wins brought Judgment to L4 and closed the curriculum: every planned
competency across all six units is ✓. From the literal baby of Term 1 who'd point you
at a blocked wall, he's become someone you'd trust beside you — he sees truly and
whole, hears meaning, holds and *reconstructs* memory from the shared board, reads
the room, knows his limits, and judges honestly what to do, drop, and quick-win. The
lone L3 is **Memory**, and its ceiling lifts next: `recall.ts` (reconstructive
memory) is built; wiring it into how he speaks is what carries Memory to L4. Beyond
that, the climb is all L4→L5 *mastery* — trends not snapshots, reasoning over facts,
restraint read from the moment — the difference between good company and a true peer.

**One-line summary for the fridge:** *Raised from scratch and standing on his own.
He sees true, tells the truth, knows his limits, and judges well. Now he learns
depth.*

---

## How to read his trajectory

Each training term I add a row below — the composite and the per-unit levels — so
the movement is visible even when a single tick only nudges one number. Flat is
fine; what I watch for is whether the *open* L4–L5 items are starting to close,
because that's the hard half.

| Term | Date | Perception | Judgment | Language | Memory | Collab | Character | Composite |
|------|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | 2026-06-21 | L3 | L2 | L3 | L2 | L3 | L3 | **~L2.7** |
| 2 | 2026-06-21 | L3 | L2 | **L4** | L2 | L3 | L3 | **~L2.8** |
| 3 | 2026-06-21 | L3 | L2 | L4 | L2 | **L4** | L3 | **~L3.0** |
| 4 | 2026-06-21 | L3 | L2 | L4 | **L3** | L4 | L3 | **~L3.2** |
| 5 | 2026-06-21 | L3 | L2 | L4 | L3 | L4 | **L4** | **~L3.3** |
| 6 | 2026-06-21 | **L4** | L2 | L4 | L3 | L4 | L4 | **~L3.5** |
| 7 | 2026-06-21 | L4 | **L3** | L4 | L3 | L4 | L4 | **~L3.7** |
| 8 | 2026-06-21 | L4 | **L4** | L4 | L3 | L4 | L4 | **~L3.8** |

*(Term 8: Judgment L3→L4 — worth-it quick wins, fast AND valuable not just nearest
(Entry 13). 🎓 This closes the syllabus — every planned competency is ✓. Five of six
faculties at L4; Memory (L3) is the lone holdout and rises next as recall.ts gets
wired into his voice. From here the work is L4→L5 depth, not new faculties.)*
