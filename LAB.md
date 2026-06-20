# 🧪 Experimental Mode — The Lab

Secret, opt-in playground for creative features. **Unlock:** triple-tap the app
logo. Normal mode stays byte-for-byte unchanged; everything here lives behind
`useExperimentalMode`.

**North star:** _focus & momentum_ — help one person see the next right thing,
do it, and feel the streak. New ideas should reinforce that, not sprawl.

---

## Feature catalog

| # | Feature | Code |
|---|---------|------|
| 1 | **Focus Spotlight** — ranks your next task, explains why, open/advance/skip, hotkeys `N M O C` | `components/experimental/FocusSpotlight.tsx`, `lib/experimental.ts` |
| 2 | **Momentum streak + 7-day sparkline** — "N today · N this week" | `hooks/useMomentum.ts`, `lib/momentum.ts` |
| 3 | **Confetti** — fires on ship-to-Done and focus-session complete | `components/experimental/Confetti.tsx` |
| 4 | **Pomodoro Focus Timer** — 25:00 per task, start/pause/reset | `hooks/useFocusTimer.ts`, `lib/clock.ts` |
| 5 | **Standup generator** — markdown standup to clipboard | `lib/standup.ts` |
| 6 | **Command Palette (⌘K)** — 12 commands + quick capture | `components/experimental/CommandPalette.tsx`, `lib/commandPalette.ts` |
| 7 | **Board Insights** — completion ring, status bars, overdue/high-pri/avg-age | `components/experimental/BoardInsights.tsx`, `lib/insights.ts` |
| 8 | **Accent themes** — cycle 5 palettes, reverts when lab is off | `hooks/useAccent.ts`, `lib/accents.ts` |
| 9 | **Shortcuts cheat sheet** — `?` | `components/experimental/ShortcutsHelp.tsx` |
| 10 | **The Board Has Feelings** ⭐ — a deterministic mood engine (no LLM) gives the board a face + raw personality that reacts to how you actually work | `components/experimental/BoardCompanion.tsx`, `hooks/useCompanion.ts`, `lib/companion.ts` |

⭐ = the "revolutionary / raw" headline. The board gloats when you ship, panics
about overdue piles, calls out fidgeting (recoloring instead of doing), and
dozes off when neglected. Behavioural signals (idle time, fidgets, pokes) blend
with board state to pick one of 9 moods, each with its own voice.

| 11 | **Give the board a brain (beta)** 🧠 — an optional **in-browser LLM** (Transformers.js + Qwen2.5-0.5B, WebGPU→WASM) that makes the companion's voice generative. $0: runs on the visitor's device, no API. Rule-based engine stays as fallback. | `lib/companionBrain.ts`, `hooks/useBoardBrain.ts` |

The brain is fully opt-in (palette: "Give the board a brain"). Transformers.js is
loaded lazily from a CDN — **not** in the main bundle — and the ~0.5GB model
downloads only after the user opts in (cached after). If WebGPU is missing it
falls back to WASM/CPU; if anything fails it silently reverts to the
deterministic quips. Persona + prompt live in `companionBrain.ts` (tested).

**Deepened (it's a real companion now):**
- **Memory** — it remembers you across sessions: days known, visits, all-time
  ships, best/current streak, days away. Fed into every prompt. (`companionMemory.ts`, `useCompanionMemory.ts`)
- **Chat** — actually talk to your board (💬). Replies stream token-by-token and
  are aware of your tasks, history, and mood. (`CompanionChat.tsx`)
- **Personality dial** — palette "Board personality": gentle ↔ balanced ↔
  savage, and a *warmth* that grows ~1 level per 5 ships and cools if you vanish.
  (`persona.ts`)

---

## Loop protocol

Each tick rotates through a mode so quality compounds instead of sprawling:

1. **Build** — one new feature from the backlog (on-theme). New components ship
   with at least one render/interaction test.
2. **Polish** — refine/dedupe an existing feature; add a missing test or an
   accessibility fix.
3. **Harden** — cross-cutting health: a11y, perf, storage hygiene, z-index, debt.

Every tick: `typecheck` + `lint` + `test` + `build` must stay green before push.

---

## Backlog (pull from here)

**The Board Has Feelings — deepen the headline**
- Model picker: 0.5B (default) ↔ Llama-3.2-1B for sharper output
- Let chat *do* things: "add a high-priority task to email Sam Friday"
- Proactive lines: the board speaks up on real events (a ship, an overdue flip)
- More moods & a wider quip pool; reduce repetition with better seeding
- Count DnD-to-Done ships toward memory/momentum (not just spotlight advances)
- ~~Cross-session memory~~ ✅ · ~~chat~~ ✅ · ~~personality/warmth~~ ✅

**On-theme features**
- Daily ship goal with a progress ring + bigger celebration on hit
- Zen mode — distraction-free overlay around the spotlighted task + timer
- "Stalest task" nudge surfaced from Board Insights
- Pin/lock the current Spotlight suggestion during deep work
- Ship velocity (rolling 7-day average) in Insights

**Polish / harden (from the audit)**
- Confetti + motion respect `prefers-reduced-motion`
- Real focus trap (Tab cycling) in palette / insights / shortcuts modals
- Single z-index scale for lab overlays (currently ad-hoc 20/40/60/80)
- Prune old `next-task:shipped:*` keys from localStorage
- Component tests for the 5 experimental components (none yet)
- Theme-aware accent colors (currently fixed across light/dark)

---

## Known debt

- UI is untested — all current experimental tests are pure-logic units.
- Modals set initial focus + Escape but do not trap Tab.
- Confetti animates regardless of reduced-motion preference.
- Momentum writes one localStorage key per day, never pruned.
