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

export type Proposal =
  | { id: string; kind: 'clear_overdue'; count: number; summary: string }
  | { id: string; kind: 'run_skill'; name: string; steps: string[]; summary: string }
  | { id: string; kind: 'save_skill'; steps: string[]; summary: string }
  | { id: string; kind: 'upgrade'; idea: AutopilotProposal; summary: string };

export type SkillContinuation = { name: string; firstStep: string; remaining: string[] };

export type ProposalInput = {
  overdue: number; // count of overdue tasks
  ideas: AutopilotProposal[]; // Ouroboros upgrade ideas (already deduped vs board)
  learned?: string[] | null; // a repeated command sequence worth saving as a skill
  continuation?: SkillContinuation | null; // a saved skill whose first step just happened
};

/** What does Boardy want right now? Highest-leverage wants first. */
export function generateProposals({ overdue, ideas, learned, continuation }: ProposalInput): Proposal[] {
  const proposals: Proposal[] = [];

  if (continuation) {
    proposals.push({
      id: `run-skill-${continuation.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'run_skill',
      name: continuation.name,
      steps: continuation.remaining,
      summary: `You just did "${continuation.firstStep}". Want me to finish your "${continuation.name}" skill? (${continuation.remaining.join(' → ')})`,
    });
  }

  if (learned && learned.length) {
    proposals.push({
      id: `save-skill-${learned.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
      kind: 'save_skill',
      steps: learned,
      summary: `I keep doing this: ${learned.join(' → ')}. Want me to save it as a skill?`,
    });
  }

  if (overdue > 0) {
    proposals.push({
      id: 'clear-overdue',
      kind: 'clear_overdue',
      count: overdue,
      summary: `Let me clear your ${overdue} overdue task${overdue === 1 ? '' : 's'} — I'll knock them out.`,
    });
  }

  ideas.slice(0, 2).forEach((idea, index) => {
    proposals.push({
      id: `upgrade-${index}-${idea.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
      kind: 'upgrade',
      idea,
      summary: `I'd like to file an upgrade I want: "${idea.title}".`,
    });
  });

  return proposals;
}
