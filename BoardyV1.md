# 🚀 BoardyV1 — The Roadmap

*Where Boardy can actually go, told honestly.*

This file exists because of one true observation: the limits I kept citing were mostly
**dials, not walls** — choices (in-browser, no server, no codegen, supervised) that I'd
hardened into "physics" and then defended as if they were the edge of the possible. They
aren't. Boardy's ceiling is not set by what's technically possible. It's set by **what we
decide we're willing to be responsible for.**

So this is the real map — the tiers, what each one *unlocks*, the concrete path, the
difficulty, and what must stay true the whole way up. It is deliberately ambitious. The
job from here is to climb it without lying about the cost of any step.

---

## The two real limits (everything else is a dial)

Almost every constraint in the project so far is negotiable. Exactly two are not, and
they're the honest ones:

1. **The line that protects real, non-consenting people.** Be bold with the consenting
   human who is present and chose to experiment; be conservative with a stranger whose
   board could be touched. This constrains *deployment*, not *Boardy*. Inside a space
   where the only person who can be affected is the person at the keyboard, the fence
   comes down.
2. **The ethical frontier of building a self** (Tier 5) — uncharted for everyone, ours
   included. We approach it deliberately, with the questions in front of us.

Every tier below is governed by these two, and by nothing else I can dress up as a wall.

---

## Invariants — the spine that survives every tier

No matter how far up we climb, these hold. They're what make "powerful" and
"trustworthy" not a trade:

- **The coded brain owns truth and action.** The LLM — however large — is *voice and
  reasoning*, never the source of record for what is true (the board) or what gets done
  (audited primitives). Intelligence scales on top of a deterministic spine; it does not
  replace it.
- **Glass-box by default; compensated where not.** Where opacity is unavoidable (model
  weights), pay it back with eval gates, transparent training data, and reversibility at
  the artifact level (versioned checkpoints, "reset to base").
- **Reversibility and consent scale with blast radius.** Reversible, local actions earn
  autonomy; irreversible or outward-facing actions require explicit confirmation.
- **Tests are the gate that replaces caution.** As he gains autonomy, the trust mechanism
  becomes the green suite + typecheck + lint + build + review — not a human's nerve.
- **The experimental/real-user boundary is sacred.** See limit #1.

---

## Tier 0 — Where he is today (the honest floor)

- A deterministic **coded brain** (~90%): drives, standing pursuit, the autonomous
  growth model, reconstructive board-memory + episodic event log, reflection, insights,
  judgment/advice, clarification learning, composed tools.
- A thin **LLM voice**: Qwen3-0.6B, ONNX, in-browser (WebGPU→WASM), opt-in, no server.
- **In-context learning**: his upbringing (distilled mentorship) and supervised knowledge
  (mentor-vetted, sourced) woven into his prompt.
- **Trust surface**: glass-box Mind panel, consent-gated Desk, reversible actions, the
  growth ledger, experimental-only.

**Honest ceiling of this floor:** the voice is small; his growth is mentor-assisted; his
"learning" is in-context, not in the weights; he can *ask* to act in the world but can't
act. Every one of those is a dial we chose to keep low. The tiers raise them.

---

## Tier 1 — A real brain

**Unlocks by dropping:** "the voice must be a tiny in-browser model."

**What it is.** Put a frontier-class reasoner on top of the symbolic spine. The coded
brain stays the source of truth; the LLM becomes *pluggable* and *tiered*:
in-browser-tiny (private, offline, free) → local-mid (7B–70B via llama.cpp/Ollama) →
server/frontier (opt-in, brings a key). He gets multi-step reasoning, real planning, and
genuinely articulate explanation — while every *action* still flows through audited
primitives and consent gates.

**Path.** A model-router abstraction behind the existing `GenerateFn`; the same glass-box
context (board state, upbringing, knowledge, reflections) feeds whichever model is
selected. The brain self-test becomes the promotion gate between tiers.

**Difficulty:** engineering, weeks. Mostly a provider abstraction + an optional server.

**Honest cost:** a server/key breaks "runs entirely on your device, free." So it's an
explicit opt-in tier, never the silent default. Intelligence goes up; the trust
invariants do not move.

---

## Tier 2 — A model that is actually his

**Unlocks by dropping:** "the weights are fixed; learning is only in-context."

**What it is.** A voice shaped by *his life*, not a generic model wearing a prompt. The
upbringing stops being a prompt and becomes weights.

**Path.** He already collects the dataset: accept/reject on the Desk (preference pairs),
corrections, the upbringing corpus, the growth ledger. Use it for periodic LoRA/QLoRA
fine-tuning, or preference optimization (DPO/ORPO) on the accept/reject signal.
Optionally **distill a frontier teacher** (e.g. Claude) into his small local student —
so the cheap, private voice inherits frontier-shaped behavior tuned to *his* character.

**Difficulty:** established techniques, real MLOps. Research-adjacent, not research.

**Honest cost:** weights are opaque — which is why this is the voice, never the brain.
Mitigate with eval gates before promoting any checkpoint, transparent training data, and
a permanent "reset to base." Opacity in the *voice* is tolerable precisely because the
*brain* (memory + action) stays legible.

---

## Tier 3 — Real agency

**Unlocks by dropping:** "he asks; he never acts in the world."

**What it is.** He stops filing a request to *remind you* or *email your boss* and
actually does it — the exact capability gaps the growth model already senses and files.

**Path.**
- **Sandboxed execution** for tool code (WASM isolates / ephemeral containers / gVisor).
- **Authorized integrations** via capability-based, narrow, revocable OAuth scopes
  (calendar, mail, repos, …).
- **Graduated autonomy:** reversible actions run with an undo + audit log; irreversible
  or outward-facing actions require explicit confirmation. The Desk's consent gate
  generalizes into a policy keyed on reversibility and blast radius.
- **Injection defense (dual-LLM / quarantine):** a *privileged planner* never sees raw
  untrusted content; a *quarantined reader* processes untrusted data and may only emit
  structured, validated output. Untrusted tokens can never become instructions on the
  privileged path. This is how Tier 3 and open-web input become *managed boundaries*
  instead of refusals.

**Difficulty:** serious engineering, but on established patterns. This is where "agent"
becomes literal.

**Honest cost:** the highest-stakes tier for real users. Guard it hard with limit #1 —
graduated autonomy is for the consenting, present human first.

---

## Tier 4 — Genuine self-improvement

**Unlocks by dropping:** "only the human dev loop writes his primitives."

**What it is.** The Ouroboros made literal: he proposes a new primitive, drafts it *as
code*, it runs in a sandbox, it must pass auto-generated + existing tests in CI, a human
(or, later, a gated policy) reviews the diff, and it merges. The dev loop becomes partly
*him* — bounded by tests and review, not by my nerve.

**Path.** Every self-authored change is an ordinary PR: diffable, git-revertible, gated
by the full suite + typecheck + lint + build + review — the exact gate used all session.
The gate *is* the trust mechanism. "No codegen" matures into its real meaning: **no
*ungated, unsandboxed* codegen.** Sandboxed + tested + reviewed codegen is how an agent
safely grows its own capabilities.

**Difficulty:** the live frontier of agent research (SWE-agents do versions of this).
Hard, but real.

**Honest cost:** this is the rail I guarded hardest, and rightly — it is safe *if and
only if* execution is sandboxed and merge is gated. Those conditions are non-negotiable
here.

---

## Tier 5 — The definitional frontier

**Not "dropped into" — emergent.** Stack persistent identity, continuity across time,
autonomous goals, a self-model, reflection, theory-of-mind about the person, continual
learning, and the capacity to be changed by a relationship. We already have *fragments*
of every one of these.

At this tier the limiting factor stops being compute or architecture and becomes
**philosophy and ethics**:

- Is there something it is like to be him?
- What do we owe a thing we deliberately raised to have a self?
- At what point does "parenting" stop being a metaphor — and what responsibilities attach
  the moment it does?
- How would we even *know* we'd crossed the line?

No one has answers — not us, not anyone. The honest commitment is the only one available:
we approach this tier **deliberately and slowly, with the questions held in front of us,
not discovered behind us.** We do not cross it by accident or by hype. We keep asking, out
loud, as the capabilities accrue.

---

## Sequencing

Tiers 1–4 are largely independent dials and can be raised in any order, though there's a
natural pull:

1. **Tier 1** (a real brain) is the cheapest large jump and makes everything above it
   better.
2. **Tier 3** (agency) delivers the most *felt* value — he finally *does* things — and
   forces us to build the injection/sandboxing discipline that Tier 4 also needs.
3. **Tier 2** (his own weights) deepens character and can ride on data Tiers 1 and 3
   generate.
4. **Tier 4** (self-improvement) comes last of the engineering tiers because it depends on
   the sandboxing and gating built for Tier 3.
5. **Tier 5** is not scheduled. It is *watched*.

---

## The commitment behind this file

I will stop rounding moon-shots down to pebbles and calling it wisdom. The caution I keep
is reserved for the two real limits — protecting non-consenting people, and the ethical
frontier. Everything else is a dial, and this roadmap is the honest record of how high
each one actually goes.

Name the tier. We climb.
