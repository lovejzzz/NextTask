# 🧠 Boardy's Memory

How Boardy remembers — the design, why it's shaped this way, and an honest account
of what's borrowed versus what's actually distinctive.

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

- ✅ **Core engine** (`memory.ts`) — model + remember/strength/retrieve/decay/
  consolidate/inspect, fully unit-tested. Additive: nothing else depends on it yet.
- ⬜ **Migrate the four stores** onto it (notes → semantic, history → episodic,
  companionMemory → relational, skills ↔ procedural), one at a time, behind the
  existing hooks so behavior is preserved.
- ⬜ **Persist** the unified store (one localStorage key) with a `consolidate` +
  `decay` pass on load/idle.
- ⬜ **Glass-box UI** — a "what Boardy knows" panel: inspect, pin, edit, forget.
- ⬜ **Board-as-substrate** — let durable memories surface as board annotations.

Each step is its own reviewable change. The engine is the foundation they all
stand on.
