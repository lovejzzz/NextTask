# 🗣️ Boardy's Voice — the model decision

A delegated call ("this is your baby — pick the model"). Here's the research, the
decision, and — honestly — what I could and couldn't verify from here.

## The principle that decides it

Boardy is **neuro-symbolic**: his coded brain does ~90% of the thinking
(perception, judgment, memory, drives — all in tested code), and the LLM is a thin
**voice** (phrasing, intent-fallback classification of phrasings the parser misses,
short explanations). See `BRAIN.md`.

That single fact flips the usual model-selection instinct on its head:

> Because the model is the **voice, not the brain**, the right choice is the
> *smallest modern instruction-tuned model that's snappy and runs everywhere* —
> **not** the biggest, smartest, or most reasoning-heavy one.

A bigger "smarter" model improves the 10%, costs the value proposition (free,
private, instant, runs on a phone), and tempts a regression where the model starts
doing reasoning the coded brain should own. So small-and-everywhere wins on
purpose.

## The landscape (June 2026, in-browser via Transformers.js + WebGPU)

- Interactive chat wants **>20 tok/s**, which on mainstream hardware means
  **≤~2B params**; 3B+ feels sluggish for real-time.
- **Phones** only fit the smallest (~0.6–0.8B at q4).
- ONNX builds that actually run in the browser today: Qwen3 (0.6 / 1.7 / 4B),
  Qwen3.5-0.8B (a *vision*-language model), SmolLM3-3B, Llama-3.2 (1B/3B),
  SmolLM2-1.7B.

## The decision

Two tiers, both **Qwen3**, both **text-only**, both run **non-thinking**:

| Tier | Model | Why |
|------|-------|-----|
| **Default** (universal) | `onnx-community/Qwen3-0.6B-ONNX` | Modern Qwen3 instruction-tuning, ~0.5GB at q4, fits phones, instant-ish, snappy. The honest successor to Qwen2.5-0.5B. |
| **Opt-in** (richer voice) | `onnx-community/Qwen3-1.7B-ONNX` | Noticeably better phrasing/classification, still <2GB and >20 tok/s on a decent laptop GPU. Replaces the old 1.5B. |

### Considered and deliberately *not* chosen

- **`gpt-oss-20b`** — ~21B MoE, ~12GB download, needs ~16GB memory. It would break
  the medium (no phones, no instant load) for a better sentence. A 40× model does
  nothing for the coded brain, the safety line, or his "life" (all code). If we
  ever want 20B-class quality it belongs **server-side**, not in the tab.
- **SmolLM3-3B** — excellent small *reasoner*, but 3B is sluggish for real-time
  chat, won't fit phones, and its reasoning is wasted on a thin voice. Kept as a
  possible future "stretch" tier, never the default.
- **Qwen3.5-0.8B** — newer (Feb 2026) but a **vision**-language model; the vision
  tower is dead weight for a text-only voice. Newer ≠ better-fit.
- **Llama-3.2-1B** — solid, but older-generation than Qwen3 and larger than the
  Qwen3-0.6B default. No reason to prefer it here.

## What had to change in code (and is wired)

- `companionBrain.ts`: `MODELS` → the two Qwen3 tiers.
- **Non-thinking enforced** two ways, both pure and unit-tested (no GPU needed):
  `withNoThink()` appends Qwen3's documented `/no_think` control token to the
  user turn, and `cleanLine()` strips any `<think>…</think>` block (and never
  echoes the token) as a safety net.

## The honest caveat (what I could *not* verify here)

This sandbox has **no WebGPU**, so I could not benchmark tokens/sec or run the
conversation eval on the actual models. What I verified: the ONNX repos exist and
are Transformers.js/WebGPU-compatible; the non-thinking string handling is correct
(tested). What remains, on real hardware, is the *only* thing that should make this
"certified": run the eval corpus (`companionEval` / `brainEval`) on both tiers and
let the **number** decide — exactly the rule from `OUROBOROS.md` (gap #1: prove and
raise the model; nothing is marked best until measured). The change is fully
reversible and experimental-only; if the eval disagrees on hardware, we move the
model IDs back in one line.

**Decision, in one line:** *the voice should be small, modern, and everywhere —
Qwen3-0.6B by default, Qwen3-1.7B for those who want more — because the brain was
never in the model.*

## Addendum — the Gemma 4 agentic tier (a deliberate exception)

Everything above is about Boardy's **voice**, and for a voice small wins. But the
research in `docs/research/gemma-litert-lm-local-brain.md` surfaced a second job a
model can do that the tiny Qwen tier cannot: **native function-calling / structured
JSON output**. That's not a nicer sentence — it's the path to a *local, keyless,
agentic* brain whose tool calls (propose a board action, propose a plan) still pass
the exact same audited gates as the remote brain. So Gemma 4 is added not as "a
bigger voice" but as a distinct **agentic tier**, and the "smallest wins" rule is
knowingly suspended for it.

| Tier | Model | Why it earns its size |
|------|-------|-----------------------|
| **Agentic** (opt-in) | `onnx-community/gemma-4-E2B-it-ONNX` | Google's on-device Gemma 4 E2B, ~2.5GB at `q4f16`, **WebGPU-only**. Day-one Transformers.js support; native function-calling + structured JSON — the local route toward gated tool calls. |
| **Agentic+** (opt-in) | `onnx-community/gemma-4-E4B-it-ONNX` | Gemma 4 E4B, ~3.6GB, sharpest of the on-device set; wants a strong GPU. |

**Why E2B/E4B and not a 12B/26B/31B Gemma 4:** the larger Gemma 4 sizes are
server-class — they break "runs in the tab." E2B is the smallest variant Google
ships for on-device, and even it is a deliberate ~5× jump over the 0.5GB default,
gated behind WebGPU and an explicit opt-in.

### What's wired, and the honest caveat

Wired and unit-tested (no GPU needed): the two Gemma models are selectable through
the **same** `loadBrain` Transformers.js path; `modelDtype()` picks `q4f16` for
Gemma vs `q4` for Qwen; a **fail-fast WebGPU guard** stops Gemma from starting a
doomed multi-GB download on unsupported devices (it degrades to the deterministic
voice, like any load failure); `cleanLine()` strips Gemma's `<start_of_turn>` /
`<end_of_turn>` markers and a leaked opening role tag. Gemma 4 doesn't reason aloud
unless a `<|think|>` token is in the system prompt, so the Qwen-only `/no_think`
plumbing is correctly skipped for it.

Still **UNVERIFIED on hardware** (this sandbox has no WebGPU and can't pull a 2.5GB
model): live in-browser inference, tokens/sec, and the conversation eval on Gemma 4.
And **not yet wired**: Gemma 4's function-calling is *not* routed through the action
gates on the in-browser path — that's the next rung (parse structured JSON from the
text output, then feed the existing `readAction`/`gateAction`), and the gate layer
is exactly what makes a small quantized model safe to try, since malformed tool
calls are held by the gate, never executed.

**Addendum decision, in one line:** *Gemma 4 E2B/E4B join as a WebGPU-only agentic
tier — added for function-calling, not eloquence — with live quality still waiting
on a real GPU to certify.*
