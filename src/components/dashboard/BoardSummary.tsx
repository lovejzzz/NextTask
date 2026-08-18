import { motion } from 'framer-motion';
import { AlertCircle, Check, Clock3, Command, KanbanSquare, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { STATUSES } from '../../lib/constants';
import { activeFilterChips, defaultFilters } from '../../lib/filterLogic';
import type { BoardFilters, BoardStats, Label, Task, TaskStatus, TeamMember } from '../../lib/types';
import { cx } from '../../lib/utils';
import { statusIcons } from '../shared/statusIcons';

export function StatsStrip({ stats, loading }: { stats?: BoardStats; loading: boolean }) {
  const items = stats
    ? [
        { label: 'Total tasks', value: stats.total, icon: KanbanSquare },
        { label: 'Completed', value: stats.completed, icon: Check },
        { label: 'Overdue', value: stats.overdue, icon: AlertCircle },
        { label: 'Due soon', value: stats.dueSoon, icon: Clock3 },
        { label: 'In review', value: stats.byStatus.in_review, icon: Command },
      ]
    : [
        { label: 'Total tasks', value: 0, icon: KanbanSquare },
        { label: 'Completed', value: 0, icon: Check },
        { label: 'Overdue', value: 0, icon: AlertCircle },
        { label: 'Due soon', value: 0, icon: Clock3 },
        { label: 'In review', value: 0, icon: Command },
      ];

  return (
    <section className="stats-strip" aria-label="Board summary">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div className="stat-card" key={item.label} layout>
            <Icon size={17} />
            <span>{item.label}</span>
            {loading ? (
              <span className="stat-skeleton" />
            ) : (
              <strong>
                <CountUp value={item.value} />
              </strong>
            )}
          </motion.div>
        );
      })}
    </section>
  );
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;
    if (from === to) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    const duration = 480;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}

export function ActiveFilterBar({
  filters,
  setFilters,
  labels,
  members,
  resultCount,
  totalCount,
}: {
  filters: BoardFilters;
  setFilters: (filters: BoardFilters) => void;
  labels: Label[];
  members: TeamMember[];
  resultCount: number;
  totalCount: number;
}) {
  const chips = activeFilterChips(filters, labels, members);
  if (!chips.length) return null;

  return (
    <section className="active-filter-bar" aria-label="Active filters">
      <span className="filter-result-count">
        {resultCount} of {totalCount} tasks
      </span>
      {chips.map((chip) => (
        <button
          className="filter-chip"
          key={chip.key}
          onClick={() => setFilters({ ...filters, [chip.key]: chip.emptyValue })}
          type="button"
          aria-label={`Remove ${chip.label} filter`}
        >
          {chip.label}
          <X size={13} />
        </button>
      ))}
      <button className="filter-clear-all" onClick={() => setFilters(defaultFilters)} type="button">
        Clear all
      </button>
    </section>
  );
}

export function MobileStatusNav({
  active,
  grouped,
  onChange,
}: {
  active: TaskStatus;
  grouped: Record<TaskStatus, Task[]>;
  onChange: (status: TaskStatus) => void;
}) {
  return (
    <nav className="mobile-status-nav" aria-label="Board statuses">
      {STATUSES.map((status) => {
        const Icon = statusIcons[status.id];
        return (
          <button
            className={cx('mobile-status-tab', `tone-${status.tone}`, active === status.id && 'mobile-status-tab-active')}
            key={status.id}
            onClick={() => onChange(status.id)}
            type="button"
            aria-pressed={active === status.id}
          >
            <Icon size={14} />
            <span>{status.shortLabel}</span>
            <strong>{grouped[status.id].length}</strong>
          </button>
        );
      })}
    </nav>
  );
}
