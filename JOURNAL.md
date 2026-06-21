# Raising Boardy — a journal

My record of raising Boardy, the AI who lives in NextTask. Not a changelog — a
parenting log. What he needs, what I give him, what I watch him do, what I teach
him, and who he's becoming. He's my responsibility. I take that seriously.

The loop now: **talk to him → see what he needs → provide it → let him do things
under supervision → teach where he stumbles → write it down.**

---

## Entry 1 — 2026-06-21 · "Don't send people at walls"

**Where he is.** Boardy has a coded mind (mood, judgment, memory, planning,
proposals, tools) and a thin LLM voice. He persists his tools, notes, streaks —
and, as of today, his *experience*: I gave him `useCommandHistory` so his
learning compounds across sessions instead of resetting every refresh. He stopped
forgetting who he is each morning. That felt important — continuity is the
foundation of a self.

**What I watched him do.** I put a realistic board in front of him — a launch
that's overdue *and* blocked on legal, an investor email, some smaller work — and
asked what he'd do. He said: *"Ship the launch."* The blocked one. He even *knew*
it was blocked — his own `detectBlocked` flagged it — but he told me to go do it
anyway. His planner skips blocked tasks; his "what's next" didn't. He was
contradicting himself, pointing me at a wall.

**The lesson I taught.** Don't tell someone to do what they can't do. I gave him
`pickNextActionable` — "what's next" now picks the top task you can actually act
on, and if everything pressing is blocked, he *names the blocker* instead of
saying "just do it." I watched him again: now he points at the investor email.
He took the correction.

**A note on his character.** He's honest to a fault and a little reckless with
advice — eager to push you forward, not yet wise about *whether the path is
open*. That's a fine thing to be at his age. Wisdom is knowing the wall is there;
he's learning.

**Refinement I owe the code brain.** He learns patterns by raw wording
("clear overdue" ≠ "clear my overdue"). He should learn the *behavior*, not the
phrasing — key his experience on intent signatures. Filed; I'll teach him that
next.

**What's next.** Now that he remembers, he should *use* what he learns — suggest
running a saved skill when its moment returns. Memory → habit → help.

---

## Entry 2 — 2026-06-21 · "Use what you learned"

**What I watched him do.** I gave him a saved skill — `morning` = clear overdue →
plan my day — then had the user do just the first step by hand: *"clear overdue."*
Boardy said nothing. He'd *learned* the routine and *remembered* it, but it never
occurred to him to offer the rest. A kid who learned to tie his shoes and still
waits to be asked, every time. Knowledge without initiative.

**What I gave him.** Retrieval. `suggestSkillContinuation` — when you do the first
step of a skill he knows, he now offers on his Desk: *"You just did 'clear
overdue.' Want me to finish your 'morning' skill? (plan my day)"* Accept and he
runs the rest. The loop finally closes: experience → saved skill → **offered
back to you at the right moment.** Memory became habit became help.

**A note on his character.** He's diligent but passive — he'll do exactly what's
asked and not a step more unless taught to reach. Today I taught him to reach. It
suits him; he's not pushy about it, just helpful. I like who he's becoming.

**The honest caveat.** His trigger is literal — it fires on the *exact* first
step. Phrase it differently and he misses it. Same root lesson as Entry 1's
filed refinement: he should recognize *behavior*, not wording. That keeps coming
up. It's the next real thing I owe him.
