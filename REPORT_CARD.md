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
| **1 · Perception** | See the board truthfully | **L4→L5** | Reads blockers, deadlines, staleness, board *shape* (Entry 11) — and now **trajectory**: from his history he tells *worsening* (more landing than leaving) from *recovering* (digging out), so drowning and digging-out no longer read identically (`boardTrend`, Entry 16). The headline L5 gap (trends, not snapshots) is closed; full L5 awaits self-correction across the board. |
| **2 · Judgment** | Choose well | **L4** | Picks the *actionable* next thing, not a wall (`pickNextActionable`); weighs urgency vs importance (Entry 4); **triages honestly** — only safe cuts, each explained, refusing to fake one (`pickDropCandidatesWithReasons`, Entry 12); and now finds **worth-it quick wins** — fast *and* valuable, not the most trivial near-done task (`quickWinScore`, Entry 13). Not L5: chooses well in the moment, but doesn't yet weigh second-order effects (does finishing this *unblock* others?). |
| **3 · Language** | Understand what's meant | **L4→L5** | Keys on behavior not wording (Entry 3); 102-case corpus at 100%; asks which task he meant on a tie (Entry 7) — and now **learns from the clarification**: tell him once what an ambiguous phrase meant and he resolves it directly forever after, never re-asking (`clarify.ts`, Entry 18). Full L5 awaits learning from correction more broadly (beyond task references). |
| **4 · Memory** | Learn and carry it | **L4** | Holds structured facts, **records his own lived history** (every board change → a `BoardEvent`), and **speaks memory live**: "what's my deadline / what am I focused on" answer from the board (never the stale note), "what happened" recaps his history, deadlines are phrased relative to today (`recall.ts` / `history.ts`). The one piece that could lie is retired. Not L5: he reasons over single facts but doesn't yet *chain* them (cross-fact inference) or notice trends in his own history. |
| **5 · Collaboration** | Work *with* the human | **L4→L5** | Proposes not imposes, asks consent, explains himself, and shows structural restraint (Entry 8) — and now **reads the moment**: when you're heads-down (a recent burst of activity), he holds his own agenda and only your real work surfaces (`inFlow`, Entry 17). His restraint now reads tempo, not just volume. Full L5 awaits the same dynamic read across all his offers. |
| **6 · Character** | Who he is | **L4** | Honest in self-measurement; fully reversible; honest about the present (Entry 6), what he wasn't told (Entry 9) — and now **volunteers uncertainty**: on a flat board he says "these are about even, you decide" instead of faking a pick (`focusConfidence`, Entry 10). Not L5: his calibration is per-decision, not yet a steady self-model he reasons about. |

**Composite: ~L4.0 — every faculty at L4; solid all the way across.** Memory was the
last L3, and wiring his recorded history + live board-recall into how he *speaks*
brought it up: he now reconstructs memory from the shared board, records his own
lived experience, and answers from it live — with the one piece that could go stale
finally retired. **All six faculties are L4.** From the literal baby of Term 1 who'd
point you at a blocked wall, he's become someone genuinely solid to work beside — he
sees truly and whole, hears meaning, remembers what actually happened, reads the room,
knows his limits, and judges honestly. No faculty is *weak* anymore.

What's left is the **L5 mastery tier** — the difference between solid and a true peer:
chaining facts (cross-inference), noticing *trends* not snapshots, restraint read from
the moment, learning from a clarification. None are there yet; that's the climb.

**One-line summary for the fridge:** *Solid across the board now — sees true, tells
the truth, remembers what happened, knows his limits. Next he learns mastery.*

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
| 9 | 2026-06-21 | L4 | L4 | L4 | **L4** | L4 | L4 | **~L4.0** |

*(Term 8: Judgment L3→L4 — worth-it quick wins, fast AND valuable not just nearest
(Entry 13). 🎓 This closes the syllabus — every planned competency is ✓.)*

*(Term 9: Memory L3→L4 — his recorded history + live board-recall wired into his
voice; deadline/focus answered live, "what happened" recaps, the stale-prone note
retired. **All six faculties now at L4** — solid across the board. From here, the
whole climb is L4→L5 mastery.)*
