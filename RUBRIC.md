# 🧠 Companion Brain — Intelligence Rubric

A living scorecard for how smart "the board" actually is. Updated as the lab
evolves. Be honest — the point is to see real gaps, not to flatter the build.

## Important framing

The companion has **two brains**:

1. **Deterministic brain** (rule-based, no model): mood engine, intent parser,
   memory, persona/warmth, proactive lines, focus ranking, daily goal. Reliable,
   instant, fully tested.
2. **Neural brain** (optional, in-browser Qwen3 0.6B/1.7B, non-thinking): generative
   ambient lines + chat, prompted with persona + memory + board state. The model is
   the *voice*; the coded brain reasons (see MODELS.md / BRAIN.md).

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

**Current overall: L4, brushing L5.** Eight of nine dimensions are a CI-proven 5/5. A highly reliable contextual companion that now
takes real, broad actions from natural language and synthesizes a plan; open
generative conversation is the remaining frontier (gated by model size + unproven
on real hardware).

**The standard:** comprehension is now pinned by a CI-enforced eval
(`companionEval.ts`): a 102-utterance corpus across every intent, currently
**100% (bar: ≥90%)**. Raising the bar means broadening the parser, not vibes.

## Dimensions (score 0–5)

| # | Dimension | Score | Why |
|---|-----------|:-----:|-----|
| 1 | **Comprehension** (understands intent) | 5 | 21 intents with broad synonyms (casual verbs, pleasantry-stripping, critical→high, "next week"/"in N days") + fuzzy task matching, CI-graded **100% on a 102-case corpus**, plus an LLM intent-fallback (safe queries only) for phrasings the rules miss. |
| 2 | **Context awareness** | 5 | Real signals → mood; board counts + sample titles + memory + **blocked/waiting detection** (read from task titles, descriptions, and labels) fed to every prompt and to "what's blocked?". |
| 3 | **Memory & continuity** | 5 | Cross-session stats (days known, ships, streaks, away) **plus durable notes**: tell it "remember that…" / "I'm focusing on…" and it carries those facts across sessions, weaves them into its prompt, and recalls them on "what do you remember". |
| 4 | **Reasoning & planning** | 5 | Plans the day (skipping blocked tasks), adapts to constraints ("I only have an hour" → a tight quick-win plan), and gives grounded judgment calls — what to **drop**, the fastest **win**, your **biggest risk**. Asterisk: true multi-turn self-correction is model-gated. |
| 5 | **Agency** (does things) | 5 | From chat it creates, completes, deletes, reprioritizes, reschedules, **assigns teammates**, **applies labels**, **bulk-clears overdue**, and **undoes** any of it (one-level inverse stack), all via fuzzy matching. |
| 6 | **Conversation quality** | 3? | Now partly **measurable**: `brainEval.ts` auto-scores each reply for grounding (no invented task names), concision, and staying in character — runnable in CI with a mock and live via the **"Run brain self-test"** command. Raw eloquence still needs a human, so the number isn't certified until run on WebGPU. |
| 7 | **Personality & voice** | 5 | Tunable gentle↔balanced↔savage with earned warmth — and the tone is now **consistent across both brains**: the rule-based mood quips are persona-tiered too, so the voice doesn't change when the model is off. |
| 8 | **Reliability & safety** | 5 | Fails safe to rule-based everywhere; opt-in; no crashes; 153 tests; normal mode untouched. |
| 9 | **Proactivity** | 5 | Initiates on many signals: mood shifts, ship/milestone/goal reactions, **one-away-from-goal** nudge, **streak-at-risk** nudge on return, welcome-back after time away, and created/cleared lines. |

`?` = score is a best-guess pending real-hardware evaluation.

**Mean ≈ 4.8/5**, but the *shape* matters more than the average: strong on
comprehension / agency / reliability / personality / context / memory /
proactivity; the open frontier is conversation quality (needs real-hardware
measurement) and deeper multi-step reasoning.

## The honesty gap: measure conversation quality for real

**Now automated (objective part):** with the brain on, run **"Run brain self-test"**
from the command palette. It runs the battery through the live model and scores
grounding · concision · in-character out of 12. That number IS certifiable on
WebGPU — it just can't run in CI (no GPU).

For the fuller human read (eloquence, helpfulness), open the app in desktop
Chrome (WebGPU), enable the brain, and run this prompt set in the chat — scoring
each 0–2 (wrong / ok / great):

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
- ~~Comprehension → 5~~ ✅ broad synonyms + pleasantry-stripping + LLM intent-fallback; 102-case CI corpus at 100%.
- **Conversation → measured:** the one rung that needs your WebGPU hardware.
