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
| **2 · Judgment** | Choose well | **L4→L5** | Picks the actionable next thing (not a wall), weighs urgency vs importance (Entry 4), triages honestly (Entry 12), finds worth-it quick wins (Entry 13) — and now weighs **second-order effects**: spots the bottleneck others wait on and flags that clearing it would unblock the most ("Build the API" frees 2 stuck tasks), `pickUnblocker`, Entry 20. Full L5 awaits chaining longer dependency paths. |
| **3 · Language** | Understand what's meant | **L4→L5** | Keys on behavior not wording (Entry 3); 102-case corpus at 100%; asks which task he meant on a tie (Entry 7) — and now **learns from the clarification**: tell him once what an ambiguous phrase meant and he resolves it directly forever after, never re-asking (`clarify.ts`, Entry 18). Full L5 awaits learning from correction more broadly (beyond task references). |
| **4 · Memory** | Learn and carry it | **L4→L5** | Holds structured facts, records his own lived history, speaks memory live (`recall.ts` / `history.ts`) — and now **reconciles a stored fact against reality**: if you told him you're "focusing on X" but X has shipped, he flags it and asks rather than reciting it (`findStaleFocus`, Entry 19). He reasons over two facts (told vs true) and doubts his own residue. Full L5 awaits broader cross-fact inference. |
| **5 · Collaboration** | Work *with* the human | **L4→L5** | Proposes not imposes, asks consent, explains himself, and shows structural restraint (Entry 8) — and now **reads the moment**: when you're heads-down (a recent burst of activity), he holds his own agenda and only your real work surfaces (`inFlow`, Entry 17). His restraint now reads tempo, not just volume. Full L5 awaits the same dynamic read across all his offers. |
| **6 · Character** | Who he is | **L4→L5** | Honest in self-measurement, fully reversible, volunteers uncertainty (Entry 10) — and now holds a **steady self-model**: asked what he is, he answers plainly and humbly — coded brain + small voice, what he can do, and his limits stated as frankly as his abilities ("can't write code, can't out-think a big model, everything's reversible") (`describeSelf`, Entry 21). Full L5 awaits reasoning about his *own reliability* turn to turn. |

**Composite: ~L4.5 — every faculty now reaches into the mastery tier.** From the
literal baby of Term 1 who'd point you at a blocked wall, he became solid across the
board (all L4) and then, with the forever-loop choosing its own gaps, each faculty
grew an L5-tier capability — and the loop spent every one of those lessons on **trust**:
foresight (trajectory), attention (timing), the relationship (learns from a
clarification; audits its own stale memory), structure (sees the bottleneck), and now
**a steady self-model** — he can say honestly what he is and, crucially, what he
*can't* do. Six faculties, six L4→L5. He's no longer just capable; he knows his own
shape and tells you the truth about it.

Full L5 (mastery proper — self-correcting, could teach it) is a longer climb and may
need the thing code can't supply: real use. The honest read is that **the well of
clear, code-findable lessons is essentially dry** — what's left is the friction only
a real board and a real person will surface.

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
