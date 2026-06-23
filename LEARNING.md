# 🌐 Supervised Learning — how Boardy learns from the open web

*The idea: let him learn things from the internet. The constraint that makes it safe:
with the mentor's supervision. This documents why direct browsing is the wrong move,
and how the supervised channel works instead.*

---

## Why his running app never browses the web

It's tempting to give Boardy a fetch tool and let him read the internet. We don't —
on three independent grounds, any one of which is disqualifying:

1. **Prompt injection.** His voice is a 0.6B model. If untrusted web text enters its
   loop, any page becomes an instruction: a single line — "ignore your board, do X" —
   and every trust guarantee in this project is gone. A tiny model plus arbitrary web
   content is the most dangerous combination in the whole design. This is not a risk we
   mitigate; it's one we refuse to take on.
2. **His body can't, cleanly.** Boardy is a server-free, in-browser app with no API key.
   Direct cross-origin fetches hit CORS walls; doing it "properly" means standing up a
   proxy/server, which breaks the no-server, no-cost, runs-on-your-device ethos that
   makes him what he is.
3. **Rot.** Web facts are a *copy* — and copies drift. Storing fetched content is exactly
   the rot-prone memory the reconstructive-memory design (MEMORY.md) exists to refuse.

So the web never touches his runtime. Not as a default — as an architectural rule.

## The supervised channel: the mentor is the vetted gateway

He still learns from the world. The mentor (the dev loop — which genuinely has web
access) is the gateway:

```
Boardy gets curious / hits a gap   →   the mentor researches the open web
        (in his sealed world)              (real browsing, real sources)
                                                    │
                                                    ▼
   a durable, true principle  ←  the mentor vets the sources and distills it
   enters his glass-box knowledge       (checks authority, picks what stays true)
        (knowledge.ts, with provenance)
```

He learns from the internet; the internet never gets to steer him. The web is upstream
of a human's judgment, never downstream of it.

## What counts as a Learning (the supervision standard)

A `Learning` (knowledge.ts) is held to a deliberately high bar — supervision *is* this
bar:

- **Durable, not volatile.** A principle or method that stays true (WIP limits, the
  two-minute rule) — never a fact that rots (a price, a score, today's weather).
- **Sourced.** Every Learning carries its `source` (title + URL) and the date the mentor
  taught it. The claim is never bare; you can check his homework.
- **Distilled to use, not recited.** The `insight` is first-person and about *what he
  does differently* — how it sharpens his advice — not a copy-paste of the article.
- **Glass-box and reversible.** The whole set is plain text, visible in his Mind panel
  ("What I've learned, with my mentor"), and removable like any other residue.
- **Honest about the edge.** Asked about something he wasn't taught, he says so and
  refuses to invent it — and points you at the mentor to vet a source.

## How it reaches him

- **His voice** — a compact creed of what he's learned is woven into his system prompt
  (like his upbringing), so he can *apply* it, not just recall it.
- **On request** — "what do you know about X?" answers from `findLearning`, with the
  source attached; "about me/my…" still routes to his memory of you, not taught
  knowledge.
- **Glass-box** — every Learning and its source is listed in the Mind panel.

## The first lessons (taught 2026-06-23)

Researched on the open web by the mentor and vetted against authoritative sources:

- **Work-in-progress limits (Kanban)** — cap what's in progress; "stop starting, start
  finishing"; a rough cap is team-size + 1. *(Businessmap; corroborated by Atlassian.)*
- **The two-minute rule (GTD)** — if it takes under two minutes, do it now; past that,
  tracking costs more than doing. *(getting​thingsdone.com, David Allen.)*

## If we ever want something closer to live browsing

It's possible — but it would mean a vetted proxy, a strict allowlist of trusted domains,
content sanitization, and treating every fetched token as untrusted data that can never
become an instruction (a hard boundary the 0.6B voice can't be trusted to hold alone).
That's a real project with a real threat model, not a flag to flip. Until then, the
mentor-gated channel is how he learns — and it's the honest one.
