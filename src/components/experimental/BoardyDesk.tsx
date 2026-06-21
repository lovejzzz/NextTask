import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

import { COMPANION_NAME } from '../../lib/companion';
import type { Proposal } from '../../lib/proposals';

/**
 * Boardy's Desk — the visible collaboration surface. Boardy puts what he wants
 * to do here; the human accepts or dismisses each one. The board stays the
 * shared, consensual medium.
 */
export function BoardyDesk({
  proposals,
  onAccept,
  onDismiss,
  onClose,
}: {
  proposals: Proposal[];
  onAccept: (proposal: Proposal) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.aside
      className="boardy-desk"
      role="dialog"
      aria-label={`${COMPANION_NAME}'s Desk`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
    >
      <header className="boardy-desk-head">
        <span className="boardy-desk-title">🤖 {COMPANION_NAME}’s Desk</span>
        <button type="button" className="boardy-desk-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </header>

      <p className="boardy-desk-sub">Here’s what I want to do. You decide.</p>

      <div className="boardy-desk-list">
        <AnimatePresence initial={false}>
          {proposals.length === 0 ? (
            <motion.p key="empty" className="boardy-desk-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Nothing I want right now. The board’s in good shape — or you’ve dismissed me. Rude, but fair.
            </motion.p>
          ) : (
            proposals.map((proposal) => (
              <motion.div
                key={proposal.id}
                className="boardy-proposal"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
              >
                <span className="boardy-proposal-text">{proposal.summary}</span>
                <span className="boardy-proposal-actions">
                  <button type="button" className="boardy-accept" onClick={() => onAccept(proposal)} aria-label="Accept">
                    <Check size={14} /> Accept
                  </button>
                  <button type="button" className="boardy-dismiss" onClick={() => onDismiss(proposal.id)} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
