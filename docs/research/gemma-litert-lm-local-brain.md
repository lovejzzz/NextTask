# Research: Gemma 4 + LiteRT-LM as a local, keyless brain for NextTask

*Verified deep-research synthesis. As of 2026-06-24. Sources are Google primary docs/blogs
plus HF model cards; claims below survived 3-vote adversarial verification (vote shown).
This space is moving release-to-release — re-verify against live docs before building.*

## Question

Could Google's LiteRT-LM stack with Gemma replace NextTask's remote frontier-model brain
(currently reached over a bridge) with a **local, keyless, in-browser** brain — given that
NextTask is a client-side React/TypeScript app (Vite, localStorage)?

## Bottom line

**Viable now, with one catch that lands exactly on NextTask's design.** The runtime and model
exist and run in-browser; but the feature the live-agent ladder depends on — the model emitting
structured **tool calls** (`propose_board_action`, `propose_plan`) — is **not in the LiteRT-LM
Web SDK yet** (text-in/text-out only). Workable today via prompt-engineered JSON or
Transformers.js; cleanest long-term once the web SDK ships tool-use.

## Confirmed findings

- **LiteRT-LM has a first-class in-browser path** (WASM + JS API, WebGPU), shipped ~May 2026 —
  but the web/JS binding is explicitly **"Early Preview"** (only Python/Kotlin/C++ are Stable).
  *(in-browser 2-1; early-preview 3-0)*
- **Gemma 4 exists** — released 2026-04-02, Apache 2.0; sizes **E2B, E4B**, 26B MoE, 31B Dense.
  No "nano"; on-device variants are E2B/E4B. Up to 32k context, 2/4/8-bit mobile quant. *(3-0)*
- **Web stack ships Gemma 4 E2B/E4B** as `.litertlm` web files. **E2B ≈ 2.58 GB** download
  (607 MB runtime footprint); E4B ≈ 3.65 GB. *(3-0)*
- **Performance adequate** — up to 76 tok/s decode, but best-case on an M4 Max MacBook in
  Chrome, not mid-range hardware. *(3-0)*
- **MediaPipe LLM Inference (old web path) is maintenance-only**; Google says migrate to the
  LiteRT-LM JS API.
- **Gemma 4 has day-one Transformers.js (browser) support** — an alternative path where the app
  parses structured JSON itself. *(3-0)*

## The catch for NextTask

Gemma 4 the model **and** LiteRT-LM the runtime support native function-calling — but the
**LiteRT-LM Web SDK does NOT expose tool/function calling yet** (documented for
Python/Kotlin/Swift only; the Web SDK is text-in/text-out). *(3-0, verified hard.)* The ladder's
entire premise is structured tool calls, so this is the load-bearing gap.

## Options

| Option | Tool calls via | Trade-off |
|---|---|---|
| A. LiteRT-LM web + wait | future web SDK tool-use API | cleanest long-term; blocked today |
| B. LiteRT-LM web + prompt-engineered JSON | force/parse JSON from text output | works now; quantized reliability unproven |
| **C. Transformers.js + Gemma 4 E2B** | Gemma 4 native JSON, parsed by app | **recommended PoC** — no Early-Preview dependency |

## Recommendation

Prototype with **Option C (Transformers.js + Gemma 4 E2B)**. Gemma 4 emits structured JSON
natively, so NextTask can parse `propose_board_action`/`propose_plan` itself without waiting on
the web SDK's tool-use API.

**Why this fits the ladder's safety model:** a small quantized model is *less reliable* at
producing valid tool calls — but NextTask's existing gates (`readAction` / `gateAction` /
`gatePlan`) already **reject malformed or ungrounded output**. So a flaky local brain degrades
to *"held by the gate,"* never *"wrong action executed."* The invariant — *the brain proposes;
a gate and the human's yes decide* — is exactly what makes a weak local brain tolerable.

## Risks (verified)

- **~2.58 GB first-load** (E2B) in a browser app — caching/first-run UX unbenchmarked.
- **WebGPU required** — cross-browser/mobile availability + fallback unverified.
- **Early-Preview churn** — Gemma 4 + web SDK are weeks old, post-date the Jan-2026 training
  cutoff; API/model list actively changing.
- **Small-quantized tool-calling reliability** vs. a frontier model is unproven by any source.
- **Licensing** — model is Apache 2.0, but Gemma use is also subject to Google's Gemma Terms of
  Use (not independently verified here).

## Minimal proof-of-concept

1. Add a `localBrain` provider alongside the remote one (mirror `brainProviders.createRemoteGenerate`).
2. Load Gemma 4 E2B via Transformers.js + WebGPU; cache the weights (Cache API / IndexedDB).
3. Prompt for strict JSON matching the `BOARD_ACTION_TOOL` / `PLAN_TOOL` schemas; parse with the
   **existing** `readAction` / `readPlan`, then `gateAction` / `gatePlan` — unchanged.
4. Offer a **hybrid** toggle: local Gemma for offline/simple turns, remote frontier model for
   complex/tool-heavy turns — the likely best architecture given the size/reliability risks.

## Open questions

- When will the LiteRT-LM Web SDK expose native tool-calling?
- Real in-browser tool-call/JSON reliability of quantized E2B/E4B for short task-board prompts?
- First-load UX for a ~2.58 GB download; minimum device RAM/GPU; WebGPU coverage in the target
  audience?
- Is a hybrid (local + remote) the right architecture rather than all-local?

## Primary sources

- Google Developers Blog — *Blazing fast on-device GenAI with LiteRT-LM* (2026-05-19)
- LiteRT-LM JS docs & API overview — developers.google.com/edge/litert-lm/js
- LiteRT-LM GitHub README (support matrix, v0.12–v0.13)
- Google blog — *Gemma 4* (2026-04-02)
- Hugging Face — `litert-community/gemma-4-E2B-it-litert-lm`
- Gemma 4 function-calling docs — ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4
