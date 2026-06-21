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
  | { id: string; kind: 'upgrade'; idea: AutopilotProposal; summary: string };

export type ProposalInput = {
  overdue: number; // count of overdue tasks
  ideas: AutopilotProposal[]; // Ouroboros upgrade ideas (already deduped vs board)
};

/** What does Boardy want right now? Highest-leverage wants first. */
export function generateProposals({ overdue, ideas }: ProposalInput): Proposal[] {
  const proposals: Proposal[] = [];

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
