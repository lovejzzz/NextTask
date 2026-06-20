import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Flame,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useFocusTimer } from '../../hooks/useFocusTimer';
import { formatClock } from '../../lib/clock';
import { STATUSES } from '../../lib/constants';
import { dueLabel, dueTone } from '../../lib/dates';
import { focusReason, nextStatusFor, rankFocusTasks } from '../../lib/experimental';
import type { Task, TaskStatus } from '../../lib/types';
import { cx } from '../../lib/utils';

const STATUS_LABEL: Record<TaskStatus, string> = Object.fromEntries(
  STATUSES.map((status) => [status.id, status.label]),
) as Record<TaskStatus, string>;

const FOCUS_SECONDS = 25 * 60;

export function FocusSpotlight({
  tasks,
  loading,
  shippedToday,
  onOpen,
  onAdvance,
  onFocusComplete,
  onCopyStandup,
}: {
  tasks: Task[];
  loading: boolean;
  shippedToday: number;
  onOpen: (taskId: string) => void;
  onAdvance: (taskId: string, target: TaskStatus) => void;
  onFocusComplete: (taskId: string) => void;
  onCopyStandup: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [skips, setSkips] = useState(0);

  const ranked = useMemo(() => rankFocusTasks(tasks), [tasks]);
  const index = ranked.length ? skips % ranked.length : 0;
  const task = ranked[index] ?? null;

  // Hands-free hotkeys (experimental mode only — this is mounted only then).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

      if (event.key.toLowerCase() === 'c') {
        onCopyStandup();
        event.preventDefault();
        return;
      }

      if (!task) return;

      switch (event.key.toLowerCase()) {
        case 'n':
          setSkips((value) => value + 1);
          event.preventDefault();
          break;
        case 'o':
          onOpen(task.id);
          event.preventDefault();
          break;
        case 'm': {
          const nextTarget = nextStatusFor(task.status);
          if (nextTarget) onAdvance(task.id, nextTarget);
          event.preventDefault();
          break;
        }
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, onOpen, onAdvance, onCopyStandup]);

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
            {shippedToday > 0 ? (
              <div className="focus-spotlight-streak">
                <Flame size={14} />
                {shippedToday} shipped today — keep the streak alive
              </div>
            ) : null}

            {loading ? (
              <p className="focus-spotlight-empty">Reading your board…</p>
            ) : task ? (
              <SpotlightTask
                key={task.id}
                task={task}
                queueSize={ranked.length}
                position={index + 1}
                onOpen={onOpen}
                onAdvance={onAdvance}
                onSkip={() => setSkips((value) => value + 1)}
                onFocusComplete={onFocusComplete}
              />
            ) : (
              <div className="focus-spotlight-clear">
                <PartyPopper size={20} />
                <p>Nothing left to focus on. Inbox zero energy.</p>
              </div>
            )}

            <div className="focus-spotlight-toolbar">
              <button type="button" className="focus-spotlight-standup" onClick={onCopyStandup}>
                <ClipboardList size={14} />
                Copy standup
              </button>
              <span className="focus-spotlight-keys">{task ? 'N next · M move · O open · C standup' : 'C standup'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function SpotlightTask({
  task,
  queueSize,
  position,
  onOpen,
  onAdvance,
  onSkip,
  onFocusComplete,
}: {
  task: Task;
  queueSize: number;
  position: number;
  onOpen: (taskId: string) => void;
  onAdvance: (taskId: string, target: TaskStatus) => void;
  onSkip: () => void;
  onFocusComplete: (taskId: string) => void;
}) {
  const next = nextStatusFor(task.status);
  const reason = focusReason(task);
  const timer = useFocusTimer(FOCUS_SECONDS, () => onFocusComplete(task.id));
  const timerActive = timer.running || timer.remaining < FOCUS_SECONDS;

  return (
    <>
      <p className="focus-spotlight-lede">Your next move · {reason}</p>
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

      <div className={cx('focus-timer', timerActive && 'is-active')}>
        <div className="focus-timer-row">
          <span className="focus-timer-clock">
            <Timer size={15} />
            {formatClock(timer.remaining)}
          </span>
          <div className="focus-timer-controls">
            {timer.running ? (
              <button type="button" onClick={timer.pause} aria-label="Pause focus timer">
                <Pause size={15} />
              </button>
            ) : (
              <button type="button" onClick={timer.start} aria-label="Start focus timer">
                <Play size={15} />
              </button>
            )}
            <button type="button" onClick={timer.reset} aria-label="Reset focus timer" disabled={!timerActive}>
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
        <div className="focus-timer-track">
          <div className="focus-timer-fill" style={{ width: `${Math.round(timer.progress * 100)}%` }} />
        </div>
      </div>

      <div className="focus-spotlight-actions">
        {next ? (
          <button type="button" className="focus-spotlight-advance" onClick={() => onAdvance(task.id, next)}>
            Move to {STATUS_LABEL[next]}
            <ArrowRight size={15} />
          </button>
        ) : null}
        {queueSize > 1 ? (
          <button type="button" className="focus-spotlight-skip" onClick={onSkip} aria-label="Show another suggestion">
            <SkipForward size={14} />
            Skip
          </button>
        ) : null}
      </div>

      {queueSize > 1 ? (
        <p className="focus-spotlight-foot">
          {queueSize - 1} more waiting · suggestion {position} of {queueSize}
        </p>
      ) : null}
    </>
  );
}
