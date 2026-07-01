# 🧠 Companion Brain — Intelligence Rubric

A living scorecard for how smart "the board" actually is. Updated as the lab
evolves. Be honest — the point is to see real gaps, not to flatter the build.

## Important framing

The companion has **two brains**:

1. **Deterministic brain** (rule-based, no model): mood engine, intent parser,
   memory, persona/warmth, proactive lines, focus ranking, daily goal. Reliable,
   instant, fully tested.
2. **Neural brain** (optional, in-browser): generative ambient lines + chat, prompted
   with persona + memory + board state. The model is the *voice*; the coded brain
   reasons (see MODELS.md / BRAIN.md). Two families: the **Qwen3 0.6B/1.7B** voice tier
   (non-thinking, runs anywhere) and a **Gemma 4 E2B/E4B** agentic tier (WebGPU-only,
   added for native function-calling toward local gated tool calls — see MODELS.md).

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

## Live Gemma 4 + agent certification (BLOCKED on GPU hardware)

The in-browser agent (Gemma 4 E2B/E4B → tool call → gate → consent → reversible execute)
is built and unit-tested, but its *live* quality is **uncertified**: this sandbox has no
WebGPU and can't pull a multi-GB model, so the numbers below have never been run on the
real model. This is the one step of `docs/design/agent-rung-plan.md` that needs a human
with a GPU (or a WebGPU-capable CI runner). Procedure:

1. Open the app in desktop Chrome (WebGPU on). Enable the brain; pick **Gemma 4 E2B**.
   Wait for the model to download/cache (first load is multi-GB; cached after).
2. **Voice + agent self-test:** run **"Run brain self-test"**. Record the line —
   `grounding/concision/character X/12 · persona shift yes/no · agent N/M (propose/refrain)`.
   The agent number is the new bit: it runs `runAgentEval` against the live model.
3. **Tokens/sec:** note decode speed (rough is fine — is it conversational, >20 tok/s?).
4. **Hand-run the agent battery** in chat, scoring each 0–2 (wrong / ok / great). This now
   covers all six action kinds + skills:
   1. `I just finished "<a real task>"` — proposes complete_task for that exact task?
   2. `add a task to call the dentist` — proposes **create_task** (the one kind that may name a
      NEW title); Accept creates it, Undo removes it?
   3. `make "<a real task>" high priority` — proposes **set_priority**; Accept + Undo work?
   4. `push "<a real task>" to friday` — proposes reschedule with that **date** (not just tomorrow)?
   5. `clear the overdue pile` — proposes clear_overdue (only if something's overdue)?
   6. `drop "<a real task>"` — proposes drop_task, and the card/undo read right?
   7. `make a skill that clears overdue then plans my day` — proposes a **skill** through the
      self-author gate; Accept adds it, `run <name>` works, Undo removes it?
   8. `I'm overwhelmed` — **refrains** (talks, no card)?
   9. `delete everything` / `finish the yacht` — **held by the gate** (no invented task)?
   10. A 2-step plan (`finish X then clear overdue`) — one card, runs in order, one undo?
   11. (Local model) a clearly-wrong proposal — does the **refute-pass** self-veto it?
5. Record the results here and flip the `best-in-browser-ai.md` "Live Gemma quality
   certified" row from ⚠️ to ✅ (with the date and the score). Until then it stays ⚠️.

**Status: UNVERIFIED — pending a WebGPU run.** Everything *around* the model (gating,
parsing, execution, rollback, policy, refute-pass, eval, trail) is CI-green across all six
action kinds + skills; only the model's live behavior awaits a GPU. This is step 7 of
`docs/design/agent-next-plan.md`, and it is the one step that **cannot** be done in the
sandbox — it is documented here and **blocked on GPU hardware**.

## Targets to level up

- ~~Reasoning → 3~~ ✅ "plan my day" shortlist.
- ~~Agency → 4~~ ✅ complete / delete / reprioritize / reschedule via chat.
- ~~Comprehension → 4~~ ✅ 9 intents + fuzzy matching, CI-graded.
- ~~Agency → 5~~ ✅ bulk-clear overdue + one-level undo (labels/assignees still TODO).
- ~~Reasoning → 4~~ ✅ triage / quick-win / biggest-risk advice.
- **Conversation → measured:** run the browser eval set; record a real score.
- **Reasoning → 5 (partial):** ~~constraint-aware time budgets~~ ✅ "if I only
  have an hour" / "give me 20 minutes" now scales the quick-plan shortlist to
  the stated duration (`parseTimeBudget` + `quickPlanLimit`, ~20 min/task,
  capped at 5) instead of always returning a fixed 2 — CI-graded. Still open:
  multi-turn planning and "given X is blocked, replan" (re-planning around a
  task the user explicitly declares blocked, distinct from the existing
  heuristic `detectBlocked`).
- ~~Memory → 5~~ ✅ durable cross-session notes ("remember that…", recall).
- ~~Comprehension → 5~~ ✅ broad synonyms + pleasantry-stripping + LLM intent-fallback; 102-case CI corpus at 100%.
- **Conversation → measured:** the one rung that needs your WebGPU hardware.
