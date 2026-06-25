import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

/**
 * A consent card for a gate-admitted board action (or plan). Boardy's brain may
 * *propose* a change, but it never executes one: the proposal is surfaced here for
 * the human to Accept or Dismiss, and every accepted action maps to an audited,
 * undoable primitive (see liveAction.ts). This component is purely presentational —
 * the parent computes the display strings from `toProposal()` / `explainPlan()` and
 * owns execution + undo. A plan variant lists its steps and is accepted/dismissed as
 * one sequence.
 */
export type ProposalView = {
  summary: string; // the single-line consent prompt
  reason?: string; // one honest line on why
  steps?: string[]; // present only for a plan: ordered, human-readable step lines
};

export function ActionProposalCard({
  proposal,
  onAccept,
  onDismiss,
  decided,
}: {
  proposal: ProposalView;
  onAccept: () => void;
  onDismiss: () => void;
  decided?: 'accepted' | 'dismissed';
}) {
  const isPlan = Boolean(proposal.steps?.length);
  return (
    <motion.div
      className="companion-proposal"
      role="group"
      aria-label={isPlan ? 'Proposed plan' : 'Proposed board action'}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
    >
      <p className="companion-proposal-summary">{proposal.summary}</p>
      {isPlan ? (
        <ol className="companion-proposal-steps">
          {proposal.steps!.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      ) : null}
      {proposal.reason ? <p className="companion-proposal-reason">{proposal.reason}</p> : null}
      {decided ? (
        <p className="companion-proposal-decided" aria-live="polite">
          {decided === 'accepted' ? 'Done — and reversible.' : 'Dismissed. Nothing changed.'}
        </p>
      ) : (
        <div className="companion-proposal-actions">
          <button type="button" className="companion-proposal-accept" onClick={onAccept} aria-label="Accept suggestion">
            <Check size={14} aria-hidden /> Accept
          </button>
          <button type="button" className="companion-proposal-dismiss" onClick={onDismiss} aria-label="Dismiss suggestion">
            <X size={14} aria-hidden /> Dismiss
          </button>
        </div>
      )}
    </motion.div>
  );
}
