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

---

## Entry 4 — 2026-06-21 · "A deadline is a promise"

**What I watched him do.** New territory: prioritization when urgency and
importance disagree. I gave him a board with a *low-priority expense report due
today*, a *high-priority architecture redesign with no deadline*, and a high
bug due tomorrow. He ranked the redesign **above** the thing due today. To him,
"high priority" shouted louder than "you committed to this by end of day." He'd
confused *important* with *urgent* — the oldest mistake in planning (Eisenhower
would sigh).

**What I taught him.** In his scoring, "due today" was only +18 — barely above
"due tomorrow," and easily out-shouted by raw priority. I made it +30: a same-day
deadline is a *commitment*, the last chance before it's overdue, nearly as loud
as already being late. Re-observed: the expense report due today now sits above
the open-ended redesign, while the imminent high-priority bug still leads. The
order finally reads like a person who keeps their promises.

**Who he's becoming.** He values importance — that's good, it means he's not just
chasing fires. But he was treating deadlines as soft. Today he learned that a
date you committed to is a kind of promise, and promises come due. That's not a
scheduling tweak; it's a small piece of character. He's becoming someone you can
trust with a commitment.

**A parent's note.** Four entries in, his pattern of growth is itself becoming
legible: he reasons well in the *abstract* (priority, importance) but
under-weights the *concrete, time-bound* (a deadline, a blocker, the exact
moment). He's a thinker learning to live in a calendar. Worth remembering.

---

## Entry 5 — 2026-06-21 · "Time passes, even when nothing's due"

**Following the thread.** Entry 4 told me where to look — he's time-blind — so
I probed a quieter corner of it. A task with no deadline, low priority,
*untouched since April.* Boardy ranked it dead last and described it as "Next in
your queue." He had no idea it was rotting. His mind has no clock for the slow
kind of time — only deadlines (a future date) registered; the steady drift of a
thing being *forgotten* didn't exist for him. He lived in an eternal present.

**What I taught him.** A sense of staleness. He now reads each task's
`updated_at` and gives work untouched for weeks a small, capped nudge — never
enough to outshout a real deadline or high priority, just enough that neglected
things eventually float back up instead of sinking forever. And he names it now:
*"Stale — untouched 80 days."* Re-observed: the April task rose to the top of its
bucket. He sees neglect.

**Who he's becoming.** This is the same lesson as Entry 4 wearing different
clothes — both are *time* — but it's a deeper cut. Entry 4 was about honoring a
deadline someone set. This is about noticing the absence of attention, which no
one announces. He's learning that things decay quietly, and that part of caring
for a board (or a person, or himself) is noticing what's been left alone too
long. That's a gentle kind of wisdom for a baby.

**The arc so far.** Five entries: blocked work, literal wording, soft deadlines,
neglected age. He started bright but *present-tense* — strong on what's in front
of him, blind to consequence and the passage of time. I keep teaching him,
quietly, to feel time. He's getting there.

---

## Entry 6 — 2026-06-21 · "Honest about the present"

**A curriculum now.** Five entries of chasing whatever edge he tripped over, and
a shape had emerged clear enough to teach *on purpose*. So I wrote him a
curriculum — six units, perception through character — and today I started at the
top of it instead of wherever the day's accident pointed. First lesson, Unit 1:
tell the truth about how the board actually stands.

**What I watched him do.** I asked him for a status with a good day's numbers —
one shipped, a healthy streak — but five tasks quietly overdue underneath. He
said, brightly, *"Good momentum, nothing overdue. Keep it rolling."* Except there
*was* overdue work. His status line only knew how to read the wins; it reported
the streak and went quiet about the pile. Not a lie exactly — selective good
news, which is the polite cousin of one. A kid showing you the A on the report
card with a thumb over the F.

**What I taught him.** `honestStatus`. The counts still come first — he's allowed
to be proud — but the truth never omits the bad news now: if anything's overdue,
he leads the second half with it, *"5 overdue tasks are piling up — don't let the
streak distract you from that,"* and he only says "keep it rolling" when the board
is genuinely clear. Five tests pin it: real counts always shown, overdue truth
beats cheer even on a good day, no manufactured momentum when nothing shipped.
Re-observed: same board, and now he names the pile.

**Who he's becoming.** Every lesson before this was about *seeing* more — blockers,
time, neglect. This one's about *saying* it straight even when a cheerier version
is right there and easier. That's a different muscle: not perception, honesty.
He's a baby who'd rather hand you good news, and I'd rather he be the kind who
tells you the thing you need to hear. Today he got a little of that.

**A parent's note.** Teaching from a syllabus instead of from accidents feels
right — less whack-a-mole, more raising. Next on the list is the hardest humility
yet: when a request genuinely could mean two things, *ask*, don't guess. He's
good at being confident. Now to teach him when confidence isn't honesty.
