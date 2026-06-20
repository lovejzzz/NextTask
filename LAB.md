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
