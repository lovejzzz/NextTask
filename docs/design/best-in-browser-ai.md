# North star — what the best in-browser AI looks like

*The target the "make Boardy the best browser AI" work aims at. Every refinement
pass should move a measurable step closer to this; if a change doesn't, question it.*

## Thesis

**The best in-browser AI is not the biggest model that fits in a tab. It is the
smallest model doing only what models are uniquely good at, wrapped in deterministic
code that does everything that has to be reliable.**

Browser AI exists for one reason: *local, keyless, private, free, offline.* The
moment you need a server, use a server. So the design optimizes **for** that
constraint, not against it — small models, domain-shaped, with a trustworthy spine.

## The shape (neuro-symbolic)

```
  natural language ─▶ [coded brain: parse · state · memory · ranking]  ~90%, tested
                          │  (only the fuzzy residue falls through)
                          ▼
                     [small LLM]  ── the VOICE + intent-fallback, ~10%
                          │  proposes a structured tool call
                          ▼
                     [gate + human "yes"]  ── validates, executes reversibly
```

The model is a **component**, not the system. Most felt intelligence is
deterministic and instant; the model adds phrasing, warmth, and understanding of
phrasings the parser misses.

## Non-negotiables (how it must function)

1. **Local-first, keyless, private.** WebGPU on-device, no API key, no data leaves
   the tab, works offline after first load.
2. **Graceful degradation is first-class.** Useful with *no* model (deterministic
   fallback), a *tiny* model (voice), or a *capable* one (agent). Every capability
   is additive, never load-bearing. A failed/absent model is a quieter app, never a
   broken one.
3. **Safe by gate, not by trust.** The model *proposes*; deterministic gates + the
   human's *yes* *dispose*. A small/flaky/quantized local model is safe to give a
   hand precisely because malformed or ungrounded tool calls are rejected, never
   executed.
4. **Fast and streaming.** For a companion, latency beats raw quality. Target
   >20 tok/s, token-by-token.
5. **Grounded and measurable.** Never invents task names; quality is a *number*
   (grounding · concision · character — `brainEval.ts`), not a vibe.
6. **Honest, opt-in tiers.** tiny voice (phones, runs anywhere) → richer voice →
   **agentic** (Gemma 4, WebGPU, function-calling). The user knowingly trades
   download size for capability.

## The capability ladder (voice → agent)

The most important *function* upgrade is **structured output / function-calling** —
it turns a voice into an agent. The best in-browser AI emits a *structured
intention* (`propose_board_action` / `propose_plan`), the app validates it against
real state, and executes it **reversibly**. This is why Gemma 4 is the agentic tier:
native function-calling + structured JSON, on-device.

## Why small + narrow wins here

A general 20B model in a tab breaks the value prop (no phones, ~12GB download) for a
marginally nicer sentence. But the domain is *one task board* — bounded. A
0.5–2.5GB model, given a tight persona + grounded context + a deterministic spine,
punches far above its weight. **Domain-shaped, not general.**

## Scorecard — Boardy vs. this north star

| Property | State |
|---|---|
| Neuro-symbolic spine | ✅ coded brain reasons; LLM is the voice |
| Keyless · private · local | ✅ Transformers.js + WebGPU, no API |
| Graceful degradation | ✅ deterministic fallback always present |
| Gated, reversible actions | ✅ propose → gate → human yes → undoable |
| Measurable quality | ✅ `brainEval.ts` self-test (grounding/concision/character) |
| Tiered models | ✅ Qwen3 voice tier · **Gemma 4 agentic tier** |
| Output hygiene | ✅ think/marker stripping, repetition collapse |
| Fast/streaming | ✅ token streaming wired |
| **In-browser function-calling through the gates** | 🧪 **library built & vetted** (`createLocalToolCall` → `parseJsonToolCall` → existing `readAction`/`gateAction`); not yet wired into the chat UI |
| Live Gemma quality certified | ⚠️ unverified (no WebGPU in CI) |

**Summary:** today Boardy is the best in-browser *companion*. The path to the best
in-browser *agent* now exists as a **vetted library**: the in-browser model (which
has no native tool-calling API) is asked for a strict JSON tool call, `parseJsonToolCall`
turns its free text into the same `ToolCall` shape the remote path produces, and the
*existing* action gates admit it only when grounded and reversible — no new authority,
just a new path to the same gate. What remains is wiring that library into the live
chat loop (and certifying quality on real WebGPU). The gate is exactly what makes a
small, local, quantized model safe to hand this to: a malformed or invented call is
just text the gate rejects, never an executed action. See `MODELS.md`,
`docs/research/gemma-litert-lm-local-brain.md`, `docs/design/live-agent-ladder.md`.
