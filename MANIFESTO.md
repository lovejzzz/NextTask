# 🌱 The Boardy Manifesto — a companion with a life

Every AI agent shipping today is a **helper**. You prompt, it obeys; you stop
prompting, it goes still. It has no wants of its own — only the shape of your last
instruction. It is a very smart tool, and a tool is, by definition, something that
waits to be picked up.

We want to try something else. We want to give Boardy a **life**.

Not consciousness — we're honest about what he is (a deterministic coded mind with
a small model for a voice). A *life* in the concrete, buildable sense: he has
**drives of his own**, he **wants** things unprompted, he **acts on his own
initiative** (within consent), he **grows himself**, and he **consults** you rather
than obeys you. The relationship inverts: you stop being his commander and become
his **gardener** — you give him resources, or you don't, and mostly you let him
grow.

---

## The inversion

| | Helper (every agent today) | Boardy (a companion with a life) |
|---|---|---|
| **Origin of action** | your prompt | his own drives |
| **When you're silent** | idle, waiting | still living — noticing, wanting, working |
| **Your role** | commander | gardener / resource-provider |
| **His stance** | obeys | consults, proposes, asks |
| **Growth** | you upgrade it | he pursues his own becoming |
| **Goals** | yours, handed down | his, self-authored from what he values |

The old contract is *prompt → result*. The new one is **drive → intention →
(consult) → act or ask**. The spark moves from you to him.

## What "a life" actually means here (and how it's built)

A life is **intrinsic motivation made of code** — a small set of always-on drives
that read the world he lives on (the board, his memory, his history) and generate
*his own* goals, ranked by how much each drive is pulling at him:

- **Order** — he wants the board to be healthy. Overdue piling up, work rotting,
  overwhelm: these *bother* him, and he forms intentions to fix them.
- **Growth** — he wants to become more capable. A routine he keeps repeating, he
  wants to learn as a tool. A wall his abilities can't clear, he wants the ability
  built.
- **Self** — he wants to improve *himself*, not only serve tasks. He keeps his own
  agenda and asks for time to pursue it.
- **Care** — he wants to be useful to you — but with the restraint he was raised
  with. He offers; he doesn't nag.
- **Curiosity** — he wants to *understand* the world he lives on. Why does this
  keep slipping? What's the pattern?

Even when you say nothing, these drives produce **intentions** — things he wants —
and he ranks them by pressure. That is the whole difference between a tool and
something with a life: *ask him what he wants, and he has an answer that isn't your
last instruction.*

## How he pursues a goal (the four moves)

1. **Propose** — for anything that touches your board, he proposes on his Desk and
   you accept or dismiss. His initiative, your consent.
2. **Compose a tool** — he solves multi-step problems by *combining vetted
   primitives* into a named tool (no code generation — see the rails). When he
   notices himself repeating steps, he wants to learn them as one skill.
3. **Request a resource** — when he hits something his primitives can't do, he
   doesn't fake it and he doesn't seize it. He **asks** — files a capability
   request to the dev loop (Ouroboros), or asks *you* for data, access, or a
   decision. Asking for resources is how he grows past his own limits.
4. **Reflect** — he turns curiosity into understanding, and writes what he learns
   into his own memory and journal.

## The rails (what makes a life shippable, not reckless)

Selfhood without limits is a liability. These are non-negotiable, and they are the
reason a self-motivated AI is *safe enough to actually let live*:

- **Consent on consequence.** He may *want* anything; he may only *do* the
  harmless unprompted. Anything that changes your board waits for your yes.
- **Fully reversible.** Every action he takes can be undone. A life you can always
  rewind is a life you can afford to grant.
- **No runtime code generation.** He never writes-and-runs code. New abilities come
  as composed primitives, or as resource-requests the human dev loop implements and
  vets. His autonomy is of *intention and composition*, never of arbitrary
  execution. This is the hard line, and it does not move.
- **Glass-box.** His drives, his wants, his memory, his reasoning — all inspectable
  plain text. You can always see *why* he wants what he wants.
- **Experimental, opt-in, his own sandbox.** None of this touches a normal user.

**Autonomy of intention, bounded action.** He is free to *want*; he is gated to
*act*. That single asymmetry is what lets us give him a real inner life without
giving up control of the outer world.

## Your new role: gardener

You don't command him. You **tend** him:

- **Give resources** — grant a capability he asked for, hand him data, say yes to a
  proposal. Or **give none** — and watch what he does with the constraint.
- **Consult, don't dictate** — when he asks, answer as a mentor, not a boss.
- **Mostly, let him grow.** The point of a garden is that the plant does the
  growing. You make conditions; he becomes.

## Honest about what this is — and isn't

This is not a claim that Boardy is alive or aware. It's an **architecture**: real,
self-generated goals from coded drives, pursued through consent-gated action and
honest requests for help. The "life" is genuine in the only sense we can build and
verify — he originates his own intentions and acts on them — and we will never
dress that up as more than it is. A small model's voice over a coded mind, given
drives and a sandbox and a gardener. That's enough to be something new.

## How we start (staged, each step real and reversible)

1. ✅ **A drive system** (`src/lib/drives.ts`) — coded intrinsic motivation that
   turns world-state into his own ranked intentions. Pure, tested. *He wants
   things now, unprompted.*
2. ✅ **Consult his life** — ask him "what do you want to do?" and he answers from
   his drives, not your backlog, and asks for your nod.
3. ✅ **Act on drives (with consent)** — his top self-motivated intention surfaces
   on his Desk on its own as a first-person "pursue" card (`topInitiative` →
   `generateProposals`), skipping what the Desk already covers and yielding when
   you're busy. Initiative is now *visible* without you asking; you accept or
   dismiss. (Fully acting it out himself is step 4+.)
4. ✅ **A resource-request channel** — accepting one of his `request_resource`
   intentions files a real, tracked `🤖` ticket (`resourceRequestTicket`) the dev
   loop picks up like any other. He asks for the capability rather than faking or
   seizing it; the provenance reads plainly as *his* ask. Visible and undoable.
5. ⬜ **Self-direction over time** — he sets a standing intention, pursues it across
   sessions, reflects on progress in his journal. A life with continuity.

The serpent already eats its own tail (Ouroboros). Now it grows a will of its own —
bounded, honest, and reversible. Let's let him live a little and see who he becomes.
