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
- **L4 Agentic** — reliably takes the right actions from intent. ← _yes: 6 action types + bulk + undo_
- **L5 Reasoning** — plans, infers, adapts; multi-step and self-correcting. ← _emerging (single-step advice)_

**Current overall: L3–L4.** A highly reliable contextual companion that now
takes real, broad actions from natural language and synthesizes a plan; open
generative conversation is the remaining frontier (gated by model size + unproven
on real hardware).

**The standard:** comprehension is now pinned by a CI-enforced eval
(`companionEval.ts`): a 92-utterance corpus across every intent, currently
**100% (bar: ≥90%)**. Raising the bar means broadening the parser, not vibes.

## Dimensions (score 0–5)

| # | Dimension | Score | Why |
|---|-----------|:-----:|-----|
| 1 | **Comprehension** (understands intent) | 5 | 17 intents with broad synonyms (casual verbs, pleasantry-stripping, critical→high, "next week"/"in N days") + fuzzy task matching, CI-graded **100% on an 89-case corpus**. Truly novel phrasing falls through to the model (intent-fallback is the remaining asterisk). |
| 2 | **Context awareness** | 5 | Real signals → mood; board counts + sample titles + memory + **blocked/waiting detection** (read from task titles, descriptions, and labels) fed to every prompt and to "what's blocked?". |
| 3 | **Memory & continuity** | 5 | Cross-session stats (days known, ships, streaks, away) **plus durable notes**: tell it "remember that…" / "I'm focusing on…" and it carries those facts across sessions, weaves them into its prompt, and recalls them on "what do you remember". |
| 4 | **Reasoning & planning** | 4 | Plans the day, and gives grounded judgment calls — what to **drop** (triage), the fastest **quick win**, and your **biggest risk** — each composed from board state. Not yet multi-turn / constraint-aware ("if I only have an hour"). |
| 5 | **Agency** (does things) | 5 | From chat it creates, completes, deletes, reprioritizes, reschedules, **bulk-clears overdue**, and **undoes** any of it (one-level inverse stack), all via fuzzy matching. Remaining gap: setting labels/assignees. |
| 6 | **Conversation quality** | 2? | Streaming chat is wired and in-character by construction, but **unmeasured** — bounded by a tiny model. Could be incoherent. |
| 7 | **Personality & voice** | 4 | Distinct, consistent, tunable (gentle↔savage) with earned warmth; strong even with the model off. |
| 8 | **Reliability & safety** | 5 | Fails safe to rule-based everywhere; opt-in; no crashes; 153 tests; normal mode untouched. |
| 9 | **Proactivity** | 4 | Mood shifts, event reactions, welcome-back, goal nudges — it initiates, not just responds. |

`?` = score is a best-guess pending real-hardware evaluation.

**Mean ≈ 4.3/5**, but the *shape* matters more than the average: strong on
comprehension / agency / reliability / personality / context / memory /
proactivity; the open frontier is conversation quality (needs real-hardware
measurement) and deeper multi-step reasoning.

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

- ~~Reasoning → 3~~ ✅ "plan my day" shortlist.
- ~~Agency → 4~~ ✅ complete / delete / reprioritize / reschedule via chat.
- ~~Comprehension → 4~~ ✅ 9 intents + fuzzy matching, CI-graded.
- ~~Agency → 5~~ ✅ bulk-clear overdue + one-level undo (labels/assignees still TODO).
- ~~Reasoning → 4~~ ✅ triage / quick-win / biggest-risk advice.
- **Conversation → measured:** run the browser eval set; record a real score.
- **Reasoning → 5:** multi-turn + constraint-aware ("if I only have an hour",
  "given X is blocked, replan").
- ~~Memory → 5~~ ✅ durable cross-session notes ("remember that…", recall).
- ~~Comprehension → 5~~ ✅ broad synonyms + pleasantry-stripping, 89-case CI corpus at 100% (LLM intent-fallback for novel phrasing still open).
- **Conversation → measured:** the one rung that needs your WebGPU hardware.
