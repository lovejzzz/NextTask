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
  identity: string[]; // who he is — his continuity across sessions (Tier 5)
  board: string[]; // reconstructed live from the board
  pursuit: string | null; // his standing intention, if any
  wants: string[]; // his current self-motivated drives
  told: string[]; // the residue you've explicitly told him (editable elsewhere)
  upbringing: string[]; // the convictions his voice learned from how he was raised
  grown: string[]; // how he's grown on his own, recounted from his ledger
  noticed: string[]; // higher-order patterns he's read from your lived history
  learned: string[]; // durable knowledge his mentor taught him from vetted sources
  reminders: string[]; // what he's holding to remind you about (Tier 3 capability)
  did: string[]; // the audit trail of actions he's actually taken (Tier 3)
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

export function BoardyMind({ mind, onForget, onClose }: { mind: MindView; onForget?: (text: string) => void; onClose: () => void }) {
  const empty =
    !mind.identity.length &&
    !mind.board.length &&
    !mind.pursuit &&
    !mind.wants.length &&
    !mind.told.length &&
    !mind.upbringing.length &&
    !mind.grown.length &&
    !mind.noticed.length &&
    !mind.learned.length &&
    !mind.reminders.length &&
    !mind.did.length;
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
          <Section title="Who I am" items={mind.identity} />
          <Section title="What I see on the board" items={mind.board} />
          <Section title="What I’ll remind you about" items={mind.reminders} />
          <Section title="What I’ve actually done (audit trail)" items={mind.did} />
          <Section title="What I’ve noticed about how you work" items={mind.noticed} />
          <Section title="What I’m pursuing" items={mind.pursuit ? [mind.pursuit] : []} />
          <Section title="What I want right now" items={mind.wants} />
          {mind.told.length ? (
            <div className="boardy-mind-section">
              <h3 className="boardy-mind-title">What you’ve told me</h3>
              <ul className="boardy-mind-list">
                {mind.told.map((text) => (
                  <li key={text} className="boardy-mind-told">
                    <span>{text}</span>
                    {onForget ? (
                      <button
                        type="button"
                        className="boardy-mind-forget"
                        aria-label={`Forget "${text}"`}
                        onClick={() => onForget(text)}
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Section title="How I was raised to speak" items={mind.upbringing} />
          <Section title="What I've learned (with my mentor)" items={mind.learned} />
          <Section title="How I've grown on my own" items={mind.grown} />
        </>
      )}
    </motion.aside>
  );
}
