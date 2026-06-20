import { motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useRef } from 'react';

import { useDialogFocus } from '../shared/useDialogFocus';

type Shortcut = { keys: string[]; label: string };

const SHORTCUTS: Shortcut[] = [
  { keys: ['triple-tap logo'], label: 'Toggle experimental mode' },
  { keys: ['⌘/Ctrl', 'K'], label: 'Open command palette' },
  { keys: ['N'], label: 'Next suggestion' },
  { keys: ['M'], label: 'Move focused task forward' },
  { keys: ['O'], label: 'Open focused task' },
  { keys: ['C'], label: 'Copy standup' },
  { keys: ['?'], label: 'Show this cheat sheet' },
];

/**
 * Experimental keyboard shortcuts cheat sheet. As the lab accumulates hotkeys,
 * this keeps them discoverable (opened with "?" or from the command palette).
 */
export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <ShortcutsHelpBody onClose={onClose} />;
}

function ShortcutsHelpBody({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(true, onClose, closeRef);

  return (
    <motion.div
      className="shortcuts-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
    >
      <motion.div
        className="shortcuts-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="shortcuts-head">
          <div className="shortcuts-title">
            <Keyboard size={18} />
            Shortcuts
            <span className="shortcuts-badge">Experimental</span>
          </div>
          <button ref={closeRef} type="button" className="shortcuts-close" onClick={onClose} aria-label="Close shortcuts">
            <X size={18} />
          </button>
        </header>

        <ul className="shortcuts-list">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.label} className="shortcuts-row">
              <span className="shortcuts-label">{shortcut.label}</span>
              <span className="shortcuts-keys">
                {shortcut.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
