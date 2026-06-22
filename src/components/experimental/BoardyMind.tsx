import { motion } from 'framer-motion';
import { X } from 'lucide-react';

import { COMPANION_NAME } from '../../lib/companion';

/**
 * The glass-box view of Boardy's mind. Everything he "knows" rendered as plain,
 * inspectable text — what he reads off the board, what he's pursuing, what he
 * wants right now, and what you've told him. The whole point of the project's
 * trust thesis made literal: no hidden state, nothing you can't see.
 */
export type MindView = {
  board: string[]; // reconstructed live from the board
  pursuit: string | null; // his standing intention, if any
  wants: string[]; // his current self-motivated drives
  told: string[]; // the residue you've explicitly told him (editable elsewhere)
};

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="boardy-mind-section">
      <h3 className="boardy-mind-title">{title}</h3>
      <ul className="boardy-mind-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function BoardyMind({ mind, onClose }: { mind: MindView; onClose: () => void }) {
  const empty = !mind.board.length && !mind.pursuit && !mind.wants.length && !mind.told.length;
  return (
    <motion.aside
      className="boardy-mind"
      role="dialog"
      aria-label={`What ${COMPANION_NAME} knows`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
    >
      <header className="boardy-mind-head">
        <span className="boardy-mind-heading">🧠 What {COMPANION_NAME} knows</span>
        <button type="button" className="boardy-mind-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </header>

      <p className="boardy-mind-sub">Everything I know — in the open. Nothing hidden.</p>

      {empty ? (
        <p className="boardy-mind-empty">My mind’s quiet right now — clear board, nothing told, nothing pulling at me.</p>
      ) : (
        <>
          <Section title="What I see on the board" items={mind.board} />
          <Section title="What I’m pursuing" items={mind.pursuit ? [mind.pursuit] : []} />
          <Section title="What I want right now" items={mind.wants} />
          <Section title="What you’ve told me" items={mind.told} />
        </>
      )}
    </motion.aside>
  );
}
