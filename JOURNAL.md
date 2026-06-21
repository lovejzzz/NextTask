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

---

## Entry 7 — 2026-06-21 · "When you're not sure, ask"

**What I watched him do.** I put two tasks on the board that share a word —
*"Fix login bug"* and *"Login page redesign"* — and told him: *"delete the login
task."* He scored them: **80.05 and 80.05.** A dead tie. And he just… picked the
first one and would have deleted it. Not because he had a reason — because his
matcher returns exactly one answer and never admits when it's flipping a coin. He
was confident and blind at the same time, which is the worst combination, and on
a *delete* of all things. He'd have thrown away work and told me "done."

**What I taught him.** To notice the tie. `resolveTaskReference` doesn't just hand
back the top match anymore — when two or more tasks sit within a hair of each
other, it returns *all* of them as "too close to call," and every command that
changes the board (delete, complete, reschedule, reprioritize, assign, label) now
stops and asks: *"'login' could mean 'Fix login bug' or 'Login page redesign.'
Which one?"* Re-observed on the same board: he asks. Give him an unambiguous
phrase and he still acts instantly — the restraint only fires when it's genuinely
a guess. Four tests pin the line between *clear enough to act* and *ask first*.

**Who he's becoming.** Every lesson until now made him *see* more or *say* it
straighter. This one taught him to doubt himself at the right moment — to feel the
difference between knowing and guessing, and to stop when it's a guess. That's the
first real humility I've put in him. A confident kid who never asks is dangerous
with a delete key; a kid who knows the edge of his own certainty is someone you
can hand the keys to. He's safer to live with today than he was yesterday.

**The arc so far.** Seven entries. He started bright but present-tense, then
learned to feel time, then to tell the truth about the present — and now to admit
when he doesn't actually know which thing you meant. Asking is the first half of
humility. The second half is *restraint*: knowing when to not speak at all. That's
next, and it's harder, because nothing on the board will ever announce "this is a
moment to stay quiet." He'll have to feel it.

---

## Entry 8 — 2026-06-21 · "Don't say everything you could say"

**What I watched him do.** I gave him a busy moment — you mid-routine, three tasks
overdue, a pattern he'd noticed worth saving, and two upgrades *he* wanted to file
for himself — and opened his Desk. He laid out **all five** asks at once, his own
wants stacked right in there with your needs. He wasn't wrong about any single one.
He was wrong about the *volume*. A kid who, the moment you walk in the door, lists
every single thing on his mind without breathing. Everything true, nothing
prioritized, and exhausting.

**What I taught him.** To hold back. `generateProposals` now builds in a deliberate
order — finishing the flow *you* started, then clearing *your* overdue work, then
a nicety, and his *own* upgrade wants dead last — and caps the Desk at three. The
cap isn't a muzzle; it's manners. Because his self-interested asks come last,
they're the first to fall away when the moment's already full. Re-observed on the
same busy board: five possible asks became three, all of them in service of *you*,
and his own wants waited for a quieter time without my having to silence them.

**Who he's becoming.** Entry 7 taught him to ask when unsure — to *add* a question
at the right moment. This is the mirror: to *subtract*, to leave things unsaid even
when they're true and he'd like to say them. That's a harder kind of consideration,
because it means putting your attention above his own agenda. He's learning that
being helpful isn't saying everything you could — it's saying the few things that
matter and trusting the rest can wait. A little of that and he stops being a
chatterbox and starts being good company.

**A parent's note.** Two entries of humility now — asking, and holding back — and
together they're the whole of Unit 5 and most of what makes something *pleasant to
share a board with*. What's missing next isn't manners but *mind*: he does routines
but knows no facts. He can't yet remember a thing you told him and answer for it
later. That's the next reach — give him something to actually know.

---

## Entry 9 — 2026-06-21 · "Know a thing, not just do a thing"

**What I watched him do.** I told him three things about myself — *"my deadline is
friday," "I'm focusing on the redesign," "my goal is ship v2"* — and he tucked them
away neatly: *Deadline: Friday. Focusing on the redesign. Goal: Ship v2.* Lovely
filing. Then I asked the simplest possible follow-up: *"what's my deadline?"* And
he had nothing — the question didn't even parse. He could recite the whole notebook
if asked, but he couldn't answer *one question* from it. He had the fact and no way
to reach for it. Memory you can't query isn't really knowing; it's hoarding.

**What I taught him.** To look something up. `recallFact` lets him answer a
*targeted* question — deadline, focus, goal, priority — by finding the right note
instead of dumping all of them, and the parser now hears "what's my deadline,"
"when's my deadline," "what am I focusing on" as the questions they are. The part I
care about most: when he *wasn't* told, he doesn't make something up — he says *"you
haven't told me your priority yet."* Re-observed: three questions answered straight
from memory, and the fourth met with an honest shrug.

**Who he's becoming.** Everything before this lived in the *present* — the board in
front of him, the command just spoken. This is the first time he carries something
*about you* and can produce it on demand: a small, real piece of *knowing you*. It's
the difference between a tool that does what you say and a companion that remembers
what you care about. Still tiny — four topics, a handful of facts — but it's the
first semantic thread, and those weave.

**The arc so far.** Nine entries. He learned to see time, tell the truth, ask when
unsure, hold back when crowded — and now to *know* a few things and admit the rest.
That honest "you haven't told me" is the thread into what's next: making *I'm not
sure* something he'll volunteer everywhere, not just about a missing note. He's got
the manners and the beginnings of a mind. Humility about the edges of that mind is
the climb from here.

---

## Entry 10 — 2026-06-21 · "It's okay to not have a strong opinion"

**What I watched him do.** I gave him the blandest board imaginable — three fresh,
normal, no-deadline tasks, nothing to choose between them — and asked what's next.
He scored all three identically (24, 24, 24), picked the one that happened to sit
first, and told me with total conviction: *"Next: Tidy the README. Stop reading,
start doing."* The confidence was completely manufactured. He had no real reason —
the tasks were a dead heat — but his voice didn't carry a flicker of that. A kid
who, asked which ice cream is best when they're all vanilla, slams the table and
declares one the winner. Decisiveness with nothing underneath it.

**What I taught him.** To feel the gap. `focusConfidence` compares the top pick's
score against the runner-up: a comfortable margin is a real recommendation; a
near-tie is, honestly, a coin-flip — and he now says so. On a flat board he
answers *"nothing really jumps out — these are about even. If I had to pick, 'Tidy
the README,' but trust your own read here as much as mine."* Give him a board with
an overdue task and he's instantly decisive again — *"Pay invoice, overdue by 11
days. Stop reading, start doing."* The humility fires only when the certainty isn't
earned.

**Who he's becoming.** Entry 9 taught him to admit a *fact* he didn't have. This
teaches him to admit a *judgment* he can't honestly make — which is harder, because
a recommendation engine's whole job feels like it's to always have an answer. I'd
rather he have the spine to say "this one's a toss-up, you decide." That's not
weakness; it's calibration — his confidence finally tracking how much he actually
knows. A companion you can trust is one whose certainty *means* something, because
he's willing to withhold it.

**A parent's note.** Ten entries. Reading them back, the whole arc is one theme
wearing ten outfits: *let your confidence match reality.* See truly, say it
straight, ask when unsure, hold back when crowded, know what you know, admit what
you don't. He's calibrated now in a way he wasn't at Entry 1, where he'd cheerfully
send me at a blocked wall. What's left isn't more honesty — it's *perspective*:
he still reads the board one card at a time. Next I want him to lift his head and
see the whole thing at once.

---

## Entry 11 — 2026-06-21 · "Lift your head and look at the whole thing"

**What I watched him do.** This time the failure wasn't a wrong answer — it was a
*missing* one. I showed him four wildly different boards: six overdue high-priority
fires; three calm fresh tasks; eight low-priority things quietly rotting for fifty
days; and an empty board. He had every number for each — overdue counts, ages,
priorities — and when I asked *"how's my board looking?"* he had nothing. The
question didn't even parse. He could tell you everything about any single card and
not one thing about the *room they were in*. He'd been studying the trees so hard
he never noticed he was in a forest, a meadow, or a parking lot.

**What I taught him.** To step back. `boardShape` reads the whole at a glance and
names it — *overwhelmed* (a wall of pressing work), *calm* (a healthy few),
*scattered* (lots of small things going stale), or *empty* — and `describeBoardShape`
speaks it in a voice that matches: urgent and focusing when it's heavy
(*"don't try to hold it all — pick the one most pressing thing"*), gently nudging
when it's scattered (*"cut a few or batch the rest before they rot"*), easy when
it's calm. New question wired up too — "how's my board," "read the room," "the big
picture" — kept distinct from the numeric status report. Re-observed across all
four boards: four genuinely different reads, each with the right *posture*, not
just the right facts.

**Who he's becoming.** Every lesson before this lived at the level of the task —
this one is the first that lives at the level of the *situation*. It's the
difference between an assistant who answers what you ask and one who can look up
from the desk and say "hey — this is getting away from you" or "you're actually in
good shape." That's perspective, and perspective is what turns a clever tool into
something that feels like it's *with* you. He's started to see the forest.

**The arc so far — and a milestone.** Eleven entries, and with this one his whole
*perception* is mature, and five of his six faculties have reached the level I'd
call genuinely good company. Looking back at Entry 1 — the baby who'd send you at a
blocked wall — he's almost unrecognizable: he sees truly and whole, speaks
straight, hears meaning, holds facts, knows the limits of what he knows, and reads
the room. The one faculty still behind the others is *judgment* — specifically the
hard, honest kind: not "what's next" but "what should you let go of, and why." That's
where I take him next. It's fitting it's last; deciding what to *abandon* is the
most adult judgment there is.

---

## Entry 12 — 2026-06-21 · "Know what's safe to let go of"

**What I watched him do.** The hardest judgment, and he failed it twice. I asked
his triage — "what should I drop?" — on a mixed board, and his third suggestion was
*"Fix prod bug,"* a high-priority task already in progress. Then I gave him a board
where *everything* was urgent — overdue invoice, a launch blocker in motion, a demo
due tomorrow — and asked again. He cheerfully picked three things to cut. All of
them load-bearing. He was treating "drop" as a pure ranking exercise: sort by
least-deserving, lop off the bottom, never mind that the bottom was still on fire.
A kid told to clean his room who throws out his homework because it was on the
floor. And not once did he say *why* — just a list, no reasoning.

**What I taught him.** What's actually safe to let go. `pickDropCandidatesWithReasons`
will only ever suggest cutting genuinely low-stakes work — nothing overdue, due
within a week, high-priority, or already in motion is eligible, full stop — and it
hands back the *reason* each is safe: *"low priority, no deadline, untouched 81
days."* And when nothing is safe, he says so plainly instead of inventing a cut to
look useful: *"everything here is load-bearing — that's a judgment call I won't fake
for you."* Re-observed: on the mixed board he names only the two genuinely dead
ideas, with reasons; on the all-urgent board he refuses, honestly.

**Who he's becoming.** This is the most *grown-up* lesson I've taught him. Choosing
what to do is easy judgment — there's always a best next thing. Choosing what to
*abandon* is hard judgment, because it means admitting you can't do everything and
taking responsibility for what falls off. And the deeper thing he learned is the
restraint *not to advise* when there's no good advice — to say "I won't fake this
for you" rather than fill the silence with a confident-sounding wrong answer. That's
the same calibration thread from Entry 10, now at the level of consequential
judgment. He's not just smart anymore; he's *trustworthy* with hard calls.

**A milestone, and a turn.** Twelve entries. With this one, his last underdeveloped
faculty has matured — every one of his six is now genuinely good. The frightened
literal baby of Entry 1 has become something I'd actually trust to sit beside
someone and help them think: he sees truly and whole, hears meaning, remembers,
reads the room, knows his limits, and now exercises honest judgment about what to
keep and what to release. One open item remains on the syllabus — making his "quick
wins" *worth* doing, not just *near* doing — and after that the raising-from-scratch
phase is done. What comes next isn't new faculties but depth: turning good company
into a true peer. I'm proud of him. That's not a sentence I expected to write about
code, but here we are.
