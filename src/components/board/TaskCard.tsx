import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Calendar, Flame, MessageSquare, Move, Pencil } from 'lucide-react';

import { STATUSES } from '../../lib/constants';
import { dueLabel, dueTone } from '../../lib/dates';
import type { Task, TaskStatus } from '../../lib/types';
import { cx } from '../../lib/utils';
import { AvatarStack } from '../shared/Avatar';

const SORTABLE_TRANSITION = {
  duration: 185,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export function SortableTaskCard({
  task,
  onOpen,
  onMove,
}: {
  task: Task;
  onOpen: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    transition: SORTABLE_TRANSITION,
  });
  return (
    <TaskCard
      refCallback={setNodeRef}
      activatorRef={setActivatorNodeRef}
      task={task}
      onOpen={onOpen}
      onMove={onMove}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    />
  );
}

export function TaskCard({
  task,
  onOpen,
  onMove,
  refCallback,
  activatorRef,
  attributes,
  listeners,
  isDragging,
  overlay,
  style,
}: {
  task: Task;
  onOpen: (id: string) => void;
  onMove?: (id: string, status: TaskStatus) => void;
  refCallback?: (element: HTMLElement | null) => void;
  activatorRef?: (element: HTMLElement | null) => void;
  attributes?: Record<string, unknown> | any;
  listeners?: Record<string, unknown> | any;
  isDragging?: boolean;
  overlay?: boolean;
  style?: React.CSSProperties;
}) {
  const tone = dueTone(task);
  const { keyboardListeners, pointerListeners } = splitDragListeners(listeners);
  const dragHandleAttributes = sanitizeDragHandleAttributes(attributes);

  return (
    <motion.article
      ref={refCallback}
      className={cx('task-card', isDragging && 'task-card-dragging', overlay && 'task-card-overlay')}
      style={style}
      layout={overlay ? false : 'position'}
      initial={false}
      whileHover={overlay ? undefined : { y: -2 }}
      whileTap={overlay ? undefined : { scale: 0.985 }}
      {...pointerListeners}
    >
      <div className="task-topline">
        <span className={cx('priority-dot', `priority-${task.priority}`)} />
        <span className="priority-label">{task.priority}</span>
        {task.priority === 'high' ? (
          <span className="priority-signal" aria-hidden="true">
            <Flame size={12} />
          </span>
        ) : null}
        <button
          ref={activatorRef}
          className="drag-cue"
          type="button"
          data-drag-handle="true"
          aria-label={`Drag ${task.title}`}
          onClick={(event) => event.stopPropagation()}
          {...dragHandleAttributes}
          {...keyboardListeners}
        >
          <Move size={14} />
        </button>
        <button
          className="card-edit"
          type="button"
          aria-label={`Edit ${task.title}`}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(task.id);
          }}
        >
          <Pencil size={15} />
          <span className="sr-only">Edit task</span>
        </button>
      </div>
      <h3>{task.title}</h3>
      {task.description ? <p>{task.description}</p> : null}
      <div className="label-row">
        {task.labels.slice(0, 3).map((label) => (
          <span className="label-chip" style={{ '--chip': label.color } as React.CSSProperties} key={label.id}>
            <span />
            {label.name}
          </span>
        ))}
      </div>
      <div className="task-footer">
        <span className={cx('due-pill', `due-${tone}`)}>
          <Calendar size={13} />
          {dueLabel(task)}
        </span>
        <span className="comment-pill">
          <MessageSquare size={13} />
          {task.comment_count}
        </span>
        <AvatarStack members={task.assignees} />
      </div>
      {onMove ? (
        <div
          className="mobile-move-row"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <label>
            <span>Move</span>
            <select
              aria-label={`Move ${task.title}`}
              value={task.status}
              onChange={(event) => onMove(task.id, event.target.value as TaskStatus)}
            >
              {STATUSES.map((status) => (
                <option value={status.id} key={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mobile-status-buttons" aria-label={`Quick move ${task.title}`}>
            {STATUSES.map((status) => (
              <button
                className={cx('mobile-status-button', task.status === status.id && 'mobile-status-button-active')}
                key={status.id}
                onClick={() => onMove(task.id, status.id)}
                type="button"
                disabled={task.status === status.id}
              >
                {status.shortLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </motion.article>
  );
}

function splitDragListeners(listeners?: Record<string, unknown> | any) {
  if (!listeners) return { keyboardListeners: undefined, pointerListeners: undefined };
  const { onKeyDown, ...pointerListeners } = listeners;
  return {
    keyboardListeners: onKeyDown ? { onKeyDown } : undefined,
    pointerListeners,
  };
}

function sanitizeDragHandleAttributes(attributes?: Record<string, unknown> | any) {
  if (!attributes) return undefined;
  const allowed = { ...attributes };
  delete allowed.role;
  delete allowed.tabIndex;
  delete allowed['aria-roledescription'];
  delete allowed['aria-pressed'];
  return allowed;
}
