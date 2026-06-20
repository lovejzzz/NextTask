import { motion } from 'framer-motion';
import { type LucideIcon, CornerDownLeft, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { filterCommands, type CommandItem } from '../../lib/commandPalette';
import { cx } from '../../lib/utils';
import { useDialogFocus } from '../shared/useDialogFocus';

export type Command = CommandItem & {
  hint?: string;
  icon: LucideIcon;
  run: () => void;
};

/**
 * Experimental Command Palette (⌘K / Ctrl+K). A filterable, keyboard-driven
 * launcher for quick board actions. Lives behind experimental mode.
 *
 * The body mounts only while open so its query/selection state resets cleanly
 * on each invocation.
 */
export function CommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}) {
  if (!open) return null;
  return <CommandPaletteBody commands={commands} onClose={onClose} />;
}

function CommandPaletteBody({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useDialogFocus(true, onClose, inputRef);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);
  const activeIndex = results.length ? Math.min(active, results.length - 1) : 0;

  function runAt(index: number) {
    const command = results[index];
    if (!command) return;
    onClose();
    command.run();
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => (results.length ? (value + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => (results.length ? (value - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runAt(activeIndex);
    }
  }

  return (
    <motion.div
      className="command-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
    >
      <motion.div
        className="command-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-search">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Type a command…"
            aria-label="Search commands"
          />
          <span className="command-badge">Experimental</span>
        </div>

        <ul className="command-list" role="listbox" aria-label="Commands">
          {results.length === 0 ? (
            <li className="command-empty">No matching commands</li>
          ) : (
            results.map((command, index) => {
              const Icon = command.icon;
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cx('command-item', index === activeIndex && 'is-active')}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => runAt(index)}
                  >
                    <Icon size={16} />
                    <span className="command-label">{command.label}</span>
                    {command.hint ? <span className="command-hint">{command.hint}</span> : null}
                    {index === activeIndex ? <CornerDownLeft size={14} className="command-enter" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}
