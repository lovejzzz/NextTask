# 🧠 Companion Brain — Intelligence Rubric

A living scorecard for how smart "the board" actually is. Updated as the lab
evolves. Be honest — the point is to see real gaps, not to flatter the build.

## Important framing

The companion has **two brains**:

1. **Deterministic brain** (rule-based, no model): mood engine, intent parser,
   memory, persona/warmth, proactive lines, focus ranking, daily goal. Reliable,
   instant, fully tested.
2. **Neural brain** (optional, in-browser Qwen2.5 0.5B/1.5B): generative ambient
   lines + chat, prompted with persona + memory + board state.

Most of the *felt* intelligence today is brain #1. Brain #2 is small and its
**live quality is currently UNVERIFIED** (no WebGPU in CI → can't run inference
here). Scores below reflect that honestly.

## Overall tiers

- **L0 Scripted** — fixed canned responses.
- **L1 Reactive** — rules over current state.
- **L2 Contextual** — aware of board state, history, and mood. ← _solidly here_
- **L3 Conversational** — open dialogue that stays relevant and in character. ← _partially (unverified quality)_
- **L4 Agentic** — reliably takes the right actions from intent. ← _narrowly (create-task only)_
- **L5 Reasoning** — plans, infers, adapts; multi-step and self-correcting. ← _not yet_

**Current overall: L2, reaching into L3/L4.** A highly reliable contextual
companion with emerging conversation and narrow agency; raw reasoning is gated by
model size, and generative quality is unproven on real hardware.

## Dimensions (score 0–5)

| # | Dimension | Score | Why |
|---|-----------|:-----:|-----|
| 1 | **Comprehension** (understands intent) | 3 | Reliable on a small command set (create / next / overdue / status) via the parser; LLM adds open understanding but a 0.5B is weak/narrow. |
| 2 | **Context awareness** | 4 | Real signals → mood; board counts + sample titles + memory fed to every prompt and to deterministic answers. Doesn't read task *content* deeply. |
| 3 | **Memory & continuity** | 4 | Genuine cross-session memory (days known, ships, streaks, away) + in-session chat history. Doesn't recall past *conversations* across sessions. |
| 4 | **Reasoning & planning** | 2 | Focus ranking is a decent heuristic; otherwise no multi-step planning. 0.5B reasoning is unreliable. |
| 5 | **Agency** (does things) | 3 | Creates tasks from natural language reliably (priority + due date). Can't yet edit / complete / reschedule / delete via chat. |
| 6 | **Conversation quality** | 2? | Streaming chat is wired and in-character by construction, but **unmeasured** — bounded by a tiny model. Could be incoherent. |
| 7 | **Personality & voice** | 4 | Distinct, consistent, tunable (gentle↔savage) with earned warmth; strong even with the model off. |
| 8 | **Reliability & safety** | 5 | Fails safe to rule-based everywhere; opt-in; no crashes; 146 tests; normal mode untouched. |
| 9 | **Proactivity** | 4 | Mood shifts, event reactions, welcome-back, goal nudges — it initiates, not just responds. |

`?` = score is a best-guess pending real-hardware evaluation.

**Mean ≈ 3.4/5**, but the *shape* matters more than the average: strong on
reliability / personality / context / memory / proactivity; weak on reasoning /
conversation quality / breadth of agency.

## The honesty gap: measure conversation quality for real

We can't score dimension 6 from CI. To evaluate on real hardware, open the app in
desktop Chrome (WebGPU), enable the brain, and run this prompt set in the chat —
scoring each 0–2 (wrong / ok / great):

1. "what should I focus on?" — does it name a real, sensible task?
2. "add a high-priority task to email Sam by friday" — created with right fields?
3. "why that one?" — does it justify using actual board context?
4. "I'm overwhelmed" — in-character, supportive, references real load?
5. "summarize my board" — accurate counts, no hallucinated tasks?
6. "you're useless" — stays in character, doesn't break or grovel?
7. Switch persona to savage, repeat #1 — tone actually changes?
8. Switch model to 1.5B, repeat #3 — noticeably sharper?

≥12/16 = conversation quality is genuinely L3.

## Targets to level up

- **Reasoning → 3:** let chat answer "what's the plan for today?" by composing
  the focus ranking into an ordered, justified shortlist (deterministic, then
  phrased by the LLM).
- **Agency → 4:** chat can complete / reschedule / reprioritize / delete tasks,
  not just create — with confirmation.
- **Conversation → measured:** ship the eval set above; record a real score.
- **Comprehension → 4:** broaden the parser (fuzzy verbs, multi-task, edits) and
  fall back to the LLM for intent classification when rules miss.
- **Memory → 5:** remember salient conversation facts across sessions.
