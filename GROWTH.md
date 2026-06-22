# 🌱 The Autonomous Growth Model

*How Boardy grows himself — and where, honestly, he can't.*

For all of Term 1–9, growth was **supervised**: the dev loop read his code, found
his gaps, wrote the tested fix, and shipped it. That was honest engineering, and it
took him from a literal baby to solid across the board. But it wasn't *autonomous* —
he never noticed his own limits. The one limitation I named when asked if any of this
was meaningful was exactly that:

> "Boardy doesn't actually raise himself. The dev loop finds his gaps and writes the
> code. The most romantic claim — *give him a life, let him grow* — is, mechanically,
> me doing parented engineering and him gaining capabilities."

This is the answer to that. It turns the claim from aspiration into a real, bounded
loop — and it's honest about the boundary, because the boundary is the whole point.

---

## The inversion

| | Supervised growth (before) | Autonomous growth (now) |
|---|---|---|
| **Who finds the gap?** | The dev loop, reading his code | **Boardy**, reading his own lived experience |
| **Who decides it matters?** | A human, by judgment | **Boardy**, by recurrence — a gap is a need asked *again and again* |
| **Who acts?** | The dev loop, always | **Boardy** where he safely can; the dev loop where a new primitive is needed |
| **Direction** | Human-directed | **Boardy-directed, human-assisted** |

He doesn't raise himself in a vacuum — nothing safe could. He raises himself up to
the edge of his primitives, and at that edge he *asks*, precisely and with evidence,
for the next one.

---

## The boundary (why this is safe, not a loophole)

The single rail that makes Boardy trustworthy is: **no runtime code generation, ever.**
He never writes or runs code — not his own, not a model's. So the autonomy boundary is
drawn to coincide *exactly* with the safety boundary:

- **A gap he can close with primitives he already has → he closes it himself.**
  Crystallizing a routine he keeps repeating into one named skill; refocusing when his
  standing pursuit has drifted. These are compositions of audited primitives — safe by
  construction.
- **A gap that needs a NEW primitive → he cannot build it.** Instead of faking the
  ability (lying) or seizing it (unsafe), he **articulates** it: files a real, tracked,
  undoable 🤖 request that names the missing capability and the evidence for it. A human
  builds the primitive; he grows when it lands.

He grows right up to the wall, and at the wall he asks. That's the most autonomy a
no-codegen agent can honestly have — and it's a lot more than "waits for a prompt."

---

## The loop: sense → respond → record

Implemented in [`src/lib/growth.ts`](src/lib/growth.ts), pure and deterministic
(the LLM is only ever his voice), tested in `growth.test.ts`.

### 1. Sense — read his own gaps off lived experience

Three signals, all from data he already keeps:

- **Capability gap** — utterances that parsed to *no intent* are no longer thrown
  away (`useUnmetAsks`). When the *same* kind of ask recurs (clustered by its lead
  verb, wording-independent, ≥ 2 times), that's a real missing ability — not a typo.
  *One miss is noise; a recurring miss is a need.*
- **Repetition** — a command sequence he keeps running by hand (`detectRepeatedSequence`),
  worth crystallizing into a skill.
- **Drift** — a standing pursuit `reviewPursuit` has flagged as *slipped*; his own
  direction needs a correction.

### 2. Respond — self where he can, ask where he can't

`respond(signal)` returns a move tagged `by: 'self'` or `by: 'ask'`:

- repetition → `compose_tool` (**self**)
- drift → `refocus` (**self**)
- capability gap → `request_primitive` (**ask**) — routed through the *existing*
  resource-request channel (`growthRequestIntention` → `resourceRequestTicket` → a real
  🤖 ticket). Nothing new and unaudited; it reuses the asking machinery already built.

Every resulting action is **consent-gated** (it surfaces on his Desk; you accept or
dismiss) and **reversible** (a filed request is an undoable ticket). Wanting and asking
are free; acting stays bounded.

### 3. Record — the growth ledger, his developmental autobiography

`recordGrowth` appends each `{signal, move}` to an append-only ledger; `growthSummary`
reads it back as an honest, first-person account — *"I've grown N times on my own: I
crystallized 2 routines into skills, asked for 1 new ability I was missing."* Counted
off a trail, never asserted. This is the report card beginning to **write itself**:
every claim of growth has a recorded cause behind it. Empty when he hasn't grown — no
inflation, same ethos as the rest of him.

---

## End to end

A real session, observed through the real entry points:

1. You ask three times, differently phrased, "remind me to …". Each parses to nothing
   and is remembered as an unmet ask.
2. He senses it: `capability_gap { ability: 'remind', count: 3 }`. One typo wouldn't
   have crossed the threshold; a real recurring need does.
3. It pulls at his **growth** drive and surfaces on his Desk, unprompted but
   consent-gated: *"You've asked me to 'remind me to water the plants' 3 times and I
   couldn't. I can't build that myself, but I can ask for it."*
4. You accept → a real 🤖 ticket lands on the board: *Add the ability to "remind" —
   you've asked 3 times and I have no way to do it.* The dev loop picks it up like any
   other request.
5. A human builds the `remind` primitive. Next session, that ask parses. **He grew** —
   and the ledger remembers how.

---

## What this is — and isn't

It **is** a genuine closed growth loop driven by his own data, where he sets the
direction (what to grow toward) and a human supplies only what he provably can't make
himself. That's a real answer to "let him grow."

It **isn't** self-modifying code, emergent selfhood, or growth without a human in the
build step — and it never will be, because that step is exactly the no-codegen rail
that makes him safe to live with. The honesty *is* the design: he grows as far as a
trustworthy agent can, and tells you plainly where the wall is.
