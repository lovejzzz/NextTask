import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, Flame, X } from 'lucide-react';
import { useRef } from 'react';

import { STATUSES } from '../../lib/constants';
import type { BoardInsights as Insights } from '../../lib/insights';
import { useDialogFocus } from '../shared/useDialogFocus';

const TONE_VAR: Record<string, string> = {
  slate: 'var(--slate)',
  blue: 'var(--blue)',
  violet: 'var(--violet)',
  emerald: 'var(--emerald)',
};

/**
 * Experimental Board Insights — a read-only analytics panel summarising the
 * board: completion, per-status distribution, and risk signals. Mounts only
 * while open so focus handling stays simple.
 */
export function BoardInsights({
  open,
  insights,
  onClose,
}: {
  open: boolean;
  insights: Insights;
  onClose: () => void;
}) {
  if (!open) return null;
  return <BoardInsightsBody insights={insights} onClose={onClose} />;
}

function BoardInsightsBody({ insights, onClose }: { insights: Insights; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(true, onClose, closeRef);

  const completionPct = Math.round(insights.completion * 100);
  const peak = Math.max(1, ...STATUSES.map((status) => insights.byStatus[status.id]));

  return (
    <motion.div
      className="insights-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
    >
      <motion.div
        className="insights-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Board insights"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="insights-head">
          <div className="insights-title">
            <BarChart3 size={18} />
            Board Insights
            <span className="insights-badge">Experimental</span>
          </div>
          <button ref={closeRef} type="button" className="insights-close" onClick={onClose} aria-label="Close insights">
            <X size={18} />
          </button>
        </header>

        <div className="insights-completion">
          <div
            className="insights-ring"
            style={{ background: `conic-gradient(var(--accent) ${completionPct * 3.6}deg, var(--surface-strong) 0)` }}
          >
            <span>{completionPct}%</span>
          </div>
          <div className="insights-completion-text">
            <strong>
              {insights.done} of {insights.total || 0} done
            </strong>
            <span>{insights.active} still active</span>
          </div>
        </div>

        <div className="insights-bars">
          {STATUSES.map((status) => {
            const count = insights.byStatus[status.id];
            return (
              <div key={status.id} className="insights-bar-row">
                <span className="insights-bar-label">{status.label}</span>
                <div className="insights-bar-track">
                  <div
                    className="insights-bar-fill"
                    style={{ width: `${(count / peak) * 100}%`, background: TONE_VAR[status.tone] ?? 'var(--accent)' }}
                  />
                </div>
                <span className="insights-bar-count">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="insights-chips">
          <span className={`insights-chip${insights.overdue > 0 ? ' is-warn' : ''}`}>
            <AlertTriangle size={14} />
            {insights.overdue} overdue
          </span>
          <span className="insights-chip">
            <Flame size={14} />
            {insights.highPriority} high priority
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
