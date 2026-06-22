/**
 * Boardy's Desk — the human↔AI collaboration surface.
 *
 * Instead of silently mutating the board, Boardy surfaces what *he* wants to do
 * as proposals. The human accepts or dismisses each one. The board stays the
 * shared, legible medium: every AI intention is a visible, consensual card with
 * provenance — not a hidden action. This module turns Boardy's current "wants"
 * (derived from board state + his own backlog) into those proposals. Pure +
 * tested; execution + UI live in the app.
 */
import type { AutopilotProposal } from './autopilot';
import type { Intention } from './drives';

export type Proposal =
  | { id: string; kind: 'clear_overdue'; count: number; summary: string }
  | { id: string; kind: 'run_skill'; name: string; steps: string[]; summary: string }
  | { id: string; kind: 'save_skill'; steps: string[]; summary: string }
  | { id: string; kind: 'upgrade'; idea: AutopilotProposal; summary: string }
  | { id: string; kind: 'pursue'; intention: Intention; summary: string };

export type SkillContinuation = { name: string; firstStep: string; remaining: string[] };

export type ProposalInput = {
  overdue: number; // count of overdue tasks
  ideas: AutopilotProposal[]; // Ouroboros upgrade ideas (already deduped vs board)
  learned?: string[] | null; // a repeated command sequence worth saving as a skill
  continuation?: SkillContinuation | null; // a saved skill whose first step just happened
  initiative?: Intention | null; // his strongest self-motivated want, surfaced unprompted
};

// Restraint: never dump a wall of asks. Boardy shows at most this many at once.
const MAX_PROPOSALS = 3;

/**
 * What does Boardy want right now?
 *
 * Built in priority order — the human's needs before Boardy's own wants — then
 * capped at {@link MAX_PROPOSALS}. That cap is restraint, not a limitation: a
 * good collaborator leads with what helps *you* (finishing a flow you started,
 * clearing overdue work), keeps a nicety or two after that, and lets his own
 * self-interested "upgrade" asks wait for a quieter moment instead of piling on.
 * Because upgrades come last, they're the first to yield when the Desk is busy.
 */
export function generateProposals(
  { overdue, ideas, learned, continuation, initiative }: ProposalInput,
  limit = MAX_PROPOSALS,
): Proposal[] {
  const proposals: Proposal[] = [];

  // 1. You're mid-flow — finishing what you started is the most timely help.
  if (continuation) {
    proposals.push({
      id: `run-skill-${continuation.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'run_skill',
      name: continuation.name,
      steps: continuation.remaining,
      summary: `You just did "${continuation.firstStep}". Want me to finish your "${continuation.name}" skill? (${continuation.remaining.join(' → ')})`,
    });
  }

  // 2. Concrete, urgent help with your real work.
  if (overdue > 0) {
    proposals.push({
      id: 'clear-overdue',
      kind: 'clear_overdue',
      count: overdue,
      summary: `Let me clear your ${overdue} overdue task${overdue === 1 ? '' : 's'} — I'll knock them out.`,
    });
  }

  // 3. A nicety — offering to remember a routine he's noticed you repeat.
  if (learned && learned.length) {
    proposals.push({
      id: `save-skill-${learned.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
      kind: 'save_skill',
      steps: learned,
      summary: `I keep doing this: ${learned.join(' → ')}. Want me to save it as a skill?`,
    });
  }

  // 4. His own self-motivated initiative (from his drives) — visible, unprompted,
  // but it waits behind your needs and yields first when the Desk is busy.
  if (initiative) {
    proposals.push({
      id: `pursue-${initiative.drive}-${initiative.kind}`,
      kind: 'pursue',
      intention: initiative,
      summary: `On my own initiative, I want to: ${initiative.summary}`,
    });
  }

  // 5. Boardy's *own* wishlist upgrades — last, the first to yield when busy.
  ideas.slice(0, 2).forEach((idea, index) => {
    proposals.push({
      id: `upgrade-${index}-${idea.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
      kind: 'upgrade',
      idea,
      summary: `I'd like to file an upgrade I want: "${idea.title}".`,
    });
  });

  return proposals.slice(0, Math.max(0, limit));
}
