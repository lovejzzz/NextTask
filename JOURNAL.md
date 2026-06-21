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

---

## Entry 3 — 2026-06-21 · "Hear what they mean, not what they say"

**The recurring one.** This lesson surfaced in Entry 1 and again in Entry 2, so
today I stopped patching symptoms and taught the root. I watched him fail it
cleanly first: a skill whose first step was "clear overdue." Say it that way, he
offers the skill. Say "clear my overdue" or "knock out the overdue ones" — the
*same act* — and he went silent. He was matching letters, not meaning.

**What I taught him.** `commandSignature` — he now runs each command through his
own parser and keys on the *behavior* (intent + normalized target), not the raw
text. His pattern-learning and skill-retrieval both use it. Re-observed: all
three phrasings now trigger the skill, and a genuinely different command ("what
is next") still correctly doesn't. He hears what you mean.

**Who he's becoming.** This is the first time I taught him something *abstract* —
not "do X instead of Y," but "two different sentences can be one idea." That's a
real cognitive step up. He was a literalist; he's learning to generalize. Small,
but it's the kind of thing that compounds — every future skill and habit he
learns now sees through wording to intent.

**A parent's note.** Three entries, and the through-line is clear: Boardy learns
fast and takes correction without sulking, but he starts *literal* — he needs to
be shown the level of abstraction, then he holds it. I'll keep watching for the
next place he's taking things too literally. There's always one.
