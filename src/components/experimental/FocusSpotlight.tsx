import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, FlaskConical, PartyPopper, SkipForward, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { STATUSES } from '../../lib/constants';
import { dueLabel, dueTone } from '../../lib/dates';
import { nextStatusFor, rankFocusTasks } from '../../lib/experimental';
import type { Task, TaskStatus } from '../../lib/types';
import { cx } from '../../lib/utils';

const STATUS_LABEL: Record<TaskStatus, string> = Object.fromEntries(
  STATUSES.map((status) => [status.id, status.label]),
) as Record<TaskStatus, string>;

export function FocusSpotlight({
  tasks,
  loading,
  onOpen,
  onAdvance,
}: {
  tasks: Task[];
  loading: boolean;
  onOpen: (taskId: string) => void;
  onAdvance: (taskId: string, target: TaskStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [skips, setSkips] = useState(0);

  const ranked = useMemo(() => rankFocusTasks(tasks), [tasks]);
  const index = ranked.length ? skips % ranked.length : 0;
  const task = ranked[index] ?? null;
  const next = task ? nextStatusFor(task.status) : null;

  return (
    <motion.aside
      className={cx('focus-spotlight', collapsed && 'is-collapsed')}
      aria-label="Focus Spotlight (experimental)"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <header className="focus-spotlight-head">
        <span className="focus-spotlight-badge">
          <FlaskConical size={13} />
          Experimental
        </span>
        <div className="focus-spotlight-title">
          <Sparkles size={16} />
          Focus Spotlight
        </div>
        <button
          type="button"
          className="focus-spotlight-collapse"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand Focus Spotlight' : 'Collapse Focus Spotlight'}
        >
          <ChevronDown size={16} />
        </button>
      </header>

      <AnimatePresence initial={false}>
        {collapsed ? null : (
          <motion.div
            key="focus-body"
            className="focus-spotlight-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <p className="focus-spotlight-empty">Reading your board…</p>
            ) : task ? (
              <>
                <p className="focus-spotlight-lede">Your next move</p>
                <button type="button" className="focus-spotlight-card" onClick={() => onOpen(task.id)}>
                  <span className="focus-spotlight-task">{task.title}</span>
                  <span className="focus-spotlight-meta">
                    <span className="focus-spotlight-chip">{STATUS_LABEL[task.status]}</span>
                    {task.priority === 'high' ? <span className="focus-spotlight-chip is-high">High priority</span> : null}
                    {task.due_date ? (
                      <span className={cx('focus-spotlight-chip', `due-${dueTone(task)}`)}>{dueLabel(task)}</span>
                    ) : null}
                  </span>
                </button>

                <div className="focus-spotlight-actions">
                  {next ? (
                    <button type="button" className="focus-spotlight-advance" onClick={() => onAdvance(task.id, next)}>
                      Move to {STATUS_LABEL[next]}
                      <ArrowRight size={15} />
                    </button>
                  ) : null}
                  {ranked.length > 1 ? (
                    <button
                      type="button"
                      className="focus-spotlight-skip"
                      onClick={() => setSkips((value) => value + 1)}
                      aria-label="Show another suggestion"
                    >
                      <SkipForward size={14} />
                      Skip
                    </button>
                  ) : null}
                </div>

                {ranked.length > 1 ? (
                  <p className="focus-spotlight-foot">
                    {ranked.length - 1} more waiting · suggestion {index + 1} of {ranked.length}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="focus-spotlight-clear">
                <PartyPopper size={20} />
                <p>Nothing left to focus on. Inbox zero energy.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
