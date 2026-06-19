import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';

import type { Task, TaskStatus } from '../../lib/types';
import { cx } from '../../lib/utils';
import { statusIcons } from '../shared/statusIcons';
import { TaskSkeleton } from '../shared/Skeletons';
import { SortableTaskCard } from './TaskCard';

export function BoardColumn({
  status,
  title,
  tone,
  tasks,
  loading,
  onCreate,
  onQuickCreate,
  onOpen,
  onMove,
  mobileActive,
}: {
  status: TaskStatus;
  title: string;
  tone: string;
  tasks: Task[];
  loading: boolean;
  onCreate: () => void;
  onQuickCreate: (status: TaskStatus, title: string) => Promise<void>;
  onOpen: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
  mobileActive: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
  const [inlineOpen, setInlineOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const StatusIcon = statusIcons[status];

  async function submitQuickCreate(event: React.FormEvent) {
    event.preventDefault();
    const titleValue = quickTitle.trim();
    if (!titleValue) return;

    setSaving(true);
    try {
      await onQuickCreate(status, titleValue);
      setQuickTitle('');
      setInlineOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cx('board-column', `tone-${tone}`, mobileActive && 'mobile-active-column', isOver && 'column-over')}
    >
      <div className="column-header">
        <div>
          <h2>
            <span className="status-icon">
              <StatusIcon size={15} />
            </span>
            {title}
          </h2>
        </div>
        <motion.span className="count-pill" key={tasks.length} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
          {tasks.length}
        </motion.span>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="card-stack">
          {loading ? (
            <>
              <TaskSkeleton />
              <TaskSkeleton />
              <TaskSkeleton />
            </>
          ) : tasks.length ? (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} onOpen={onOpen} onMove={onMove} />)
          ) : (
            <div className="empty-column">
              <Sparkles size={17} />
              <span>No tasks here</span>
            </div>
          )}
        </div>
      </SortableContext>

      {inlineOpen ? (
        <form className="inline-task-create" onSubmit={(event) => void submitQuickCreate(event)}>
          <input
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            placeholder={`Add ${title.toLowerCase()} task`}
            aria-label={`Add task to ${title}`}
            autoFocus
          />
          <div>
            <button className="ghost-button" onClick={() => setInlineOpen(false)} type="button" disabled={saving}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving || !quickTitle.trim()}>
              {saving ? <Loader2 className="spin" size={15} /> : <Plus size={15} />}
              Add
            </button>
          </div>
        </form>
      ) : (
        <div className="column-actions">
          <button className="column-add" onClick={() => setInlineOpen(true)} type="button">
            <Plus size={16} />
            Add task
          </button>
          <button className="column-details-add" onClick={onCreate} type="button">
            Details
          </button>
        </div>
      )}
    </div>
  );
}
