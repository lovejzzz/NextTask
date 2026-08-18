import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, KanbanSquare, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { useRef } from 'react';

import type { ChangelogEntry } from '../../app/changelog';
import type { ConfirmRequest } from '../../lib/uiTypes';
import { TaskSkeleton } from '../shared/Skeletons';
import { STATUSES } from '../../lib/constants';
import { useDialogFocus } from '../shared/useDialogFocus';

export function ConfirmDialog({
  request,
  onResolve,
}: {
  request: ConfirmRequest | null;
  onResolve: (confirmed: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useDialogFocus(Boolean(request), () => onResolve(false), cancelRef);

  return (
    <AnimatePresence>
      {request ? (
        <>
          <motion.div
            className="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onResolve(false)}
          />
          <motion.div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-title-${request.id}`}
            aria-describedby={`confirm-message-${request.id}`}
            initial={{ opacity: 0, x: '-50%', y: 'calc(-50% + 14px)', scale: 0.98 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: 'calc(-50% + 12px)', scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="confirm-icon">
              <AlertCircle size={19} />
            </div>
            <h2 id={`confirm-title-${request.id}`}>{request.title}</h2>
            <p id={`confirm-message-${request.id}`}>{request.message}</p>
            <div className="confirm-actions">
              <button ref={cancelRef} className="ghost-button" onClick={() => onResolve(false)} type="button">
                {request.cancelLabel ?? 'Cancel'}
              </button>
              <button className="danger-button" onClick={() => onResolve(true)} type="button">
                <Trash2 size={16} />
                {request.confirmLabel ?? 'Delete'}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function AppFooter({
  version,
  onOpenChangelog,
  canClear,
  clearing,
  onClear,
  showSampleAction,
  loadingSample,
  onLoadSample,
  showClearFilters,
  onClearFilters,
}: {
  version: string;
  onOpenChangelog: () => void;
  canClear: boolean;
  clearing: boolean;
  onClear: () => void;
  showSampleAction: boolean;
  loadingSample: boolean;
  onLoadSample: () => void;
  showClearFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <footer className="app-footer">
      {canClear ? (
        <button className="footer-clear" onClick={onClear} type="button" disabled={clearing}>
          {clearing ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
          Clear board
        </button>
      ) : null}
      {showSampleAction ? (
        <button className="footer-text-button" onClick={onLoadSample} type="button" disabled={loadingSample}>
          {loadingSample ? 'Loading sample...' : 'Load sample board'}
        </button>
      ) : null}
      {showClearFilters ? (
        <button className="footer-text-button" onClick={onClearFilters} type="button">
          Clear filters
        </button>
      ) : null}
      <button className="version-button" onClick={onOpenChangelog} type="button" aria-haspopup="dialog">
        v{version}
      </button>
    </footer>
  );
}

export function ChangelogDialog({
  open,
  entries,
  onClose,
}: {
  open: boolean;
  entries: ChangelogEntry[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useDialogFocus(open, onClose, closeRef);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            className="changelog-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="changelog-title"
            initial={{ opacity: 0, x: '-50%', y: 'calc(-50% + 14px)', scale: 0.98 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: 'calc(-50% + 12px)', scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="changelog-header">
              <div>
                <span className="drawer-kicker">Changelog</span>
                <h2 id="changelog-title">Next Task updates</h2>
              </div>
              <button ref={closeRef} className="icon-button" onClick={onClose} type="button" aria-label="Close changelog">
                <X size={18} />
              </button>
            </div>
            <div className="changelog-list">
              {entries.map((entry) => (
                <article className="changelog-entry" key={entry.version}>
                  <div>
                    <strong>v{entry.version}</strong>
                    <span>{entry.date}</span>
                  </div>
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function LoadingExperience() {
  return (
    <div className="app-shell">
      <main className="loading-stage">
        <div className="brand-mark large">
          <KanbanSquare size={28} />
        </div>
        <h1>Preparing Next Task</h1>
        <p>Creating a secure guest workspace and polishing the board surface.</p>
        <div className="loading-board">
          {STATUSES.map((status) => (
            <div className="board-column skeleton-column" key={status.id}>
              <TaskSkeleton />
              <TaskSkeleton />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function FatalState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <section className="fatal-state">
      <AlertCircle size={28} />
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry ? (
        <button className="primary-button" onClick={onRetry} type="button">
          <RefreshCw size={16} />
          Retry
        </button>
      ) : null}
    </section>
  );
}
