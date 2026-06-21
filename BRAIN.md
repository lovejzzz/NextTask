# 🧠 Boardy's brain — coded cognition + a thin language layer

**Thesis:** Boardy is smart because of code we write, not because of the model.
A small, local LLM is a weak *reasoner* but a fine *translator*. So we split the
brain in two and grow the part we control.

This is **neuro-symbolic** by design: neural for perception/expression, symbolic
(hand-coded) for reasoning.

## Two layers

- **Cognition layer — the real brain (hand-coded).** Decisions, judgment,
  memory, planning, prioritization. Deterministic, tested, free, fast, and
  *auditable* (you can read exactly what it will do). Improvable by us, on demand.
- **Language layer — the LLM (optional).** Understand fuzzy natural language;
  speak with personality. Bounded to what it's genuinely good at. Everything
  degrades gracefully to the cognition layer when the model is off or wrong.

## It's already ~90% code

| Capability | Layer |
|---|---|
| Mood / emotional state (`readMood`) | code |
| Understanding you — 21 intents, 102-case corpus (`parseIntent`) | code (LLM = fallback only) |
| Judgment — next / risk / quick-win / triage / blocked | code (`rankFocusTasks`, `companionAdvice`) |
| Memory, persona/warmth, goals, streaks | code |
| Proposals — Boardy's Desk (`proposals.ts`) | code |
| Tools / macros (`tools.ts`) | code |
| Self-evaluation (`brainEval.ts`) | code |
| Ambient phrasing, free chat, the gated "why", intent-fallback | the LLM |

The model does the *language*; the code does the *thinking*. That's why Boardy is
reliable despite a baby model — and why it works with the model off entirely.

## How we make Boardy smarter — by coding (primary path)

- **Deeper planning** — multi-step, constraint- and dependency-aware sequencing.
- **Real prioritization** — encode PM judgment: effort, deadlines, dependencies,
  available time/energy. A scoring model *we* tune and test.
- **Pattern detection** — notice habits in code ("you defer Fridays") → sharper
  proposals on Boardy's Desk.
- **A structured knowledge store** — facts/preferences Boardy *knows*, queryable
  and persisted, living in **our data structures, not the model's weights**.
- **A deterministic planner** that sequences tools toward a goal; the LLM only
  translates the goal in and the result out.

## Learning loop (Boardy's playground)

Experimental mode is Boardy's playground, and he learns from experience — a safe
take on Voyager's skill library and Hermes Agent's automated skill creation:

- **Skill library** = tools/macros (`tools.ts`).
- **Skill acquisition** = when Boardy notices he keeps running the same command
  sequence (`detectRepeatedSequence` over recent history), he offers to **save it
  as a skill** on Boardy's Desk; accept → it's in his library, reusable via
  "run <name>". Procedural memory, earned from use — composition only, no codegen.
- **Self-verification** = the brain self-test (`brainEval.ts`).
- **Curriculum** = Boardy's Desk proposals + the Ouroboros backlog.

## The honest tradeoff

- **Code:** reliable / fast / free / testable / auditable — but only knows what we
  teach it; doesn't generalize to the genuinely novel.
- **LLM:** generalizes to anything — but limited and unreliable at a size we can
  run locally and free.
- **Strategy:** code the known patterns (the 95% that matters); let the LLM take
  the fuzzy long tail and the voice. As local models improve, hand more to the
  model — but the coded core stays the trustworthy spine. **The model is upside,
  not the foundation.**
