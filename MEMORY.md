# 🧠 Boardy's Memory

How Boardy remembers — the design, why it's shaped this way, and an honest account
of what's borrowed versus what's actually distinctive.

---

## The turn: memory you don't store

The first version of this doc described a better *store* — salience, decay, scored
retrieval. It was a good store. But every store, however clever, shares one
disease: **it drifts from the world.** Boardy "remembers" your deadline is Friday;
you move the card to Monday; his memory is now a lie. Vector stores, MemGPT,
Generative Agents, and the engine in `memory.ts` all rot this way, because memory
that is a *copy* of reality will always, eventually, disagree with reality.

So the real fix isn't a better copy. It's **not keeping a copy.**

Boardy's world — the board — is already a durable, structured, timestamped,
human-maintained record. Your deadlines *are* the due dates. Your focus *is* what's
in progress. What you shipped *is* in Done, dated. So most of what he "remembers"
shouldn't be stored at all — it should be **reconstructed from the live board each
time he's asked.** Reconstructed memory can't desync from reality, because it *is*
reality, read freshly. Move the card and the memory moves with it.

```
conventional:  world ──writes──▶ [private memory store] ──reads──▶ answer   (drifts)
Boardy:        world ───────────reconstruct on demand───────────▶ answer   (can't drift)
```

He stores only the **irreducible residue** — the handful of things that happened and
left no mark on the board (a spoken preference, a stated goal). That's the inversion:
**world-first, store-last**, where everyone else is store-first.

### Why this is the out-of-the-box answer

- **It kills the rot.** The failure mode that makes AI memory untrustworthy — the
  remembered fact that's quietly wrong — becomes *structurally impossible* for
  anything the board can hold. (See `recall.test.ts`: reschedule the card, and the
  memory is the new date — there is no path to "still says Friday".)
- **Glass-box by construction.** The memory substrate is the board — already
  visible, already editable, already shared. There's nothing hidden to inspect.
- **It barely grows.** No accumulating store to page, prune, or embed. The residue
  is tiny; the board carries the load.
- **Editing memory = using the app.** Correcting what Boardy "knows" is just moving
  a card. No separate memory-management surface to learn.

### Honest grounding

The cognitive theory is old and I'm not inventing it: reconstructive memory
(**Bartlett, 1932** — memory is rebuilt from traces, not replayed), "the world as
its own best model" (**Brooks, 1991**), and the extended-mind thesis (**Clark &
Chalmers, 1998** — the notebook in your pocket is part of your mind). What's new is
using it as the *actual memory architecture* for an AI companion: making the shared
workspace the substrate so memory can't rot, and storing only what the workspace
can't represent. The theory is borrowed; the application is the contribution.

### How it's built

- **`src/lib/recall.ts`** — reconstruction: `recallNearestDeadline`, `recallFocus`,
  `recallRecentlyShipped`, `recallNeglected`, and `reconstruct(board, traces, …)`
  which blends the live board (primary) with the stored residue (secondary). The
  board always leads — a live truth outranks a stored one by construction.
- **`src/lib/memory.ts`** — *demoted* to the thin **trace layer**: the small,
  decaying store for residue the board can't hold. Still useful, no longer central.

The rest of this doc describes that trace engine — now a supporting actor, not the
lead.

---

## The trace layer (`memory.ts`) — supporting the residue

---

## Where we started (the problem)

Boardy's memory was **four disconnected stores**, each a different shape, none
aware of the others:

| Store | What it held | How it failed |
|-------|--------------|---------------|
| `companionNotes` | facts you told him | flat strings, **hard cap of 8** — trivia evicts your deadline |
| `useCommandHistory` | commands he's seen | 50 raw strings, **FIFO** — an important one-off is dropped by chatter |
| `companionMemory` | streaks, totals, sessions | siloed numbers he can't reason *with* |
| skills / tools | routines | a separate system again |

Three things were missing, and they're the things that make memory feel like a
mind instead of a logbook:

1. **Salience.** Everything was equal. Forgetting was "drop the oldest," not
   "drop the least important."
2. **Reinforcement & decay.** A fact mentioned twenty times was as fragile as one
   mentioned once. Nothing strengthened with use or faded with neglect.
3. **Consolidation.** Episodic experience never became semantic knowledge. He
   could log "clear overdue" fifty times and never notice "you always clear
   overdue first thing."

## The model: one item, four kinds

Everything Boardy knows is now **one shape** (`MemoryItem`) with a `kind`:

- **episodic** — something that happened (a command, a ship, an event)
- **semantic** — a fact about you or the world ("deadline is Friday")
- **procedural** — how to do something (a skill / routine)
- **relational** — the relationship itself (streaks, history, rapport)

One shape means **one retrieval path** across all of it — he can pull a fact, a
past action, and a habit in a single ranked query, which is what lets memories
combine ("you told me Friday" + "today is Thursday" → "that's tomorrow").

## How it behaves (the engine — `src/lib/memory.ts`)

- **`remember`** encodes a memory; an identical one *reinforces* the existing
  record (deeper, fresher) instead of duplicating. Repetition strengthens.
- **`strength`** is recency decay (half-life ~14 days) *lifted by use*: a thing
  returned to often stays sharp; a thing said once fades. Pinned memories never
  fade.
- **`retrieve`** ranks by **relevance × importance × recency** — top-k across
  every kind. With no query it returns what's most *salient right now*.
- **`decay`** is **graceful forgetting**: only the trivial-and-neglected fall away;
  the important, the well-used, and the pinned always stay. (Replaces FIFO caps.)
- **`consolidate`** merges near-duplicate memories and **promotes repeated
  episodes into durable semantic patterns** ("Often: clear overdue"). This is the
  step that makes memory *compound* rather than just accumulate.
- **`inspect`** lists everything in plain text, flagging unsure (low-confidence)
  and pinned items — the glass-box view.

Every item also carries **provenance** (`user-told` / `observed` / `inferred`) and
**confidence**, so recall can be honest: "you told me Friday" is stated plainly,
"I think you prefer mornings" is hedged. (That ties straight into the humility
lessons — see JOURNAL entries 7 & 10.)

## Is this revolutionary? An honest answer.

**The individual mechanisms are not new, and I won't pretend they are:**

- recency · importance · relevance retrieval → Stanford's *Generative Agents* (2023)
- reflection / consolidating episodes into higher-level facts → same line of work
- activation that decays and strengthens with use → **ACT-R**, a cognitive
  architecture from the 1990s; spaced repetition is the same instinct
- paged working-vs-long-term memory with eviction → **MemGPT** (2023)
- a growing skill library → **Voyager** (2023)

**What is genuinely distinctive is the *contract*, not the algorithm:**

> Most "AI memory" is opaque embeddings in a vector store, written and recalled by
> an LLM that decides what matters. You can't read it, you can't correct it, you
> can't trust exactly what it kept — and it's only as reliable as the model on a
> given day.

Boardy's memory is the opposite on every axis:

1. **Glass-box.** Every memory is plain, human-readable text with explicit
   provenance and confidence. No embeddings. You can *see* everything he knows.
2. **Yours to edit.** You can correct a memory, pin it so it never fades, or
   delete it. The store is a thing you co-own, not a black box he owns.
3. **Deterministic cognition.** Encoding, retrieval, decay, and consolidation are
   all *coded* and unit-tested — reliable and identical every run. The LLM is kept
   to the voice (BRAIN.md). Memory doesn't get worse on a bad model day.
4. **Reversible.** Like every other Boardy action, memory changes can be undone.
5. **Headed for the shared board.** The forward step: surface memory *onto the
   board itself*, so it's a collaboration medium both of you read — not a private
   scratchpad. Memory as a shared artifact.

That combination — *inspectable, correctable, deterministic, reversible memory
that lives on a surface you share* — is rare in shipped products precisely because
everyone reaches for embeddings + an LLM librarian. It's not a new equation. It's a
different, more honest **relationship with memory**, and for a companion you're
meant to trust beside you, the relationship is the point.

## Status & migration

- ✅ **Reconstruction engine** (`recall.ts`) — derives episodic + semantic memory
  live from the board; `reconstruct()` blends board (primary) with residue
  (secondary). Unit-tested, including the anti-rot property.
- ✅ **Board history = episodic memory** (`history.ts` + `recall.ts`). An
  append-only `BoardEvent` log (created / moved / completed / rescheduled /
  reprioritized / dropped) is the board's own changelog; `recallHistory()`
  reconstructs the *story* of what happened — ships an edit would bury, the
  sequence of reschedules, even tasks dropped that leave no card. Immutable past
  facts, so still rot-proof. `reconstruct()` uses the log for episodic memory and
  falls back to the `updated_at` proxy only when there's no log yet.
- ✅ **Trace layer** (`memory.ts`) — the thin, decaying store for the residue the
  board can't hold. Unit-tested. Demoted from "the memory" to "the footnotes".
- ⬜ **Record events from the app** — append a `BoardEvent` on each real board
  mutation (create/move/complete/reschedule/reprioritize/delete) + persist the
  log, so the history is real lived experience, not just a tested capability.
- ⬜ **Wire recall into the chat handlers** — answer "what's my deadline / what am
  I focused on / what did I just ship" from `reconstruct()` instead of the stored
  `companionNotes`, so those answers are always live. (This is where the old
  `recallFact` note-store, which *could* go stale, gets retired.)
- ⬜ **Shrink the residue** — keep only genuinely board-less facts (preferences,
  goals) in the trace layer; let the board carry everything else.
- ⬜ **Glass-box panel** — "what Boardy knows," split into *read from the board*
  (live) vs *things you told me* (the small editable/pinnable residue).

Each step is its own reviewable change. The board is the foundation; the trace
layer is the footnote.
