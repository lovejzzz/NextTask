import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock3, Loader2, MessageSquare, Plus, Tag, Trash2, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useActivity, useComments } from '../../hooks/useBoardData';
import { useTaskMutations } from '../../hooks/useTaskMutations';
import { describeActivityMetadata } from '../../lib/activity';
import { PRIORITIES, STATUSES } from '../../lib/constants';
import { relativeTime } from '../../lib/dates';
import type { ActivityEvent, BoardPayload, Label, Task, TaskPriority, TaskStatus, TeamMember } from '../../lib/types';
import type { ConfirmOptions, DrawerMode, Toast } from '../../lib/uiTypes';
import { cx, readableError } from '../../lib/utils';
import { Select } from '../shared/Select';
import { useDialogFocus } from '../shared/useDialogFocus';

const defaultDraft = {
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'normal' as TaskPriority,
  due_date: '',
  assignee_ids: [] as string[],
  label_ids: [] as string[],
};

export function TaskDrawer({
  open,
  mode,
  userId,
  task,
  board,
  initialStatus,
  onClose,
  notify,
  confirm,
}: {
  open: boolean;
  mode: DrawerMode;
  userId: string | null;
  task: Task | null;
  board?: BoardPayload;
  initialStatus: TaskStatus;
  onClose: () => void;
  notify: (tone: Toast['tone'], message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(defaultDraft);
  const commentsQuery = useComments(userId, task?.id ?? null);
  const activityQuery = useActivity(userId, task?.id ?? null);
  const mutations = useTaskMutations();
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useDialogFocus(open, onClose, titleInputRef);

  useEffect(() => {
    let active = true;
    const nextDraft =
      mode === 'edit' && task
        ? {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date ?? '',
            assignee_ids: task.assignees.map((member) => member.id),
            label_ids: task.labels.map((label) => label.id),
          }
        : { ...defaultDraft, status: initialStatus };

    queueMicrotask(() => {
      if (active) setDraft(nextDraft);
    });

    return () => {
      active = false;
    };
  }, [mode, task, initialStatus]);

  async function save() {
    if (!draft.title.trim()) {
      notify('error', 'Task title is required');
      return;
    }

    try {
      if (mode === 'create') {
        await mutations.createTask.mutateAsync({
          ...draft,
          due_date: draft.due_date || null,
        });
        notify('success', 'Task created');
      } else if (task) {
        await mutations.updateTask.mutateAsync({
          id: task.id,
          input: {
            ...draft,
            due_date: draft.due_date || null,
          },
        });
        notify('success', 'Task saved');
      }
      onClose();
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function remove() {
    if (!task) return;
    const confirmed = await confirm({
      title: 'Delete task?',
      message: `"${task.title}" and its comments/activity will be permanently removed.`,
      confirmLabel: 'Delete task',
    });
    if (!confirmed) return;

    try {
      await mutations.deleteTask.mutateAsync(task.id);
      notify('success', 'Task deleted');
      onClose();
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="task-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-drawer-title"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="drawer-header">
              <div>
                <span className="drawer-kicker">{mode === 'create' ? 'New task' : 'Task details'}</span>
                <h2 id="task-drawer-title">{mode === 'create' ? 'Create work item' : 'Refine the task'}</h2>
              </div>
              <button className="icon-button" onClick={onClose} type="button" aria-label="Close drawer">
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <label className="field">
                <span>Title</span>
                <input
                  ref={titleInputRef}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Add task title"
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  placeholder="Describe what needs to happen"
                  rows={4}
                />
              </label>
              <div className="field-grid">
                <Select
                  label="Status"
                  value={draft.status}
                  onChange={(value) => setDraft({ ...draft, status: value as TaskStatus })}
                  options={STATUSES.map((status) => ({ value: status.id, label: status.label }))}
                />
                <Select
                  label="Priority"
                  value={draft.priority}
                  onChange={(value) => setDraft({ ...draft, priority: value as TaskPriority })}
                  options={PRIORITIES.map((priority) => ({ value: priority.id, label: priority.label }))}
                />
              </div>
              <label className="field">
                <span>Due date</span>
                <input
                  type="date"
                  value={draft.due_date}
                  onChange={(event) => setDraft({ ...draft, due_date: event.target.value })}
                />
              </label>

              <MultiPicker
                title="Assignees"
                icon={<Users size={15} />}
                items={board?.teamMembers ?? []}
                selected={draft.assignee_ids}
                onChange={(assignee_ids) => setDraft({ ...draft, assignee_ids })}
              />
              <MultiPicker
                title="Labels"
                icon={<Tag size={15} />}
                items={board?.labels ?? []}
                selected={draft.label_ids}
                onChange={(label_ids) => setDraft({ ...draft, label_ids })}
              />

              {mode === 'edit' && task ? (
                <>
                  <CommentPanel
                    taskId={task.id}
                    comments={commentsQuery.data ?? []}
                    loading={commentsQuery.isLoading}
                    onCreate={async (body) => {
                      try {
                        await mutations.createComment.mutateAsync({ taskId: task.id, body });
                        notify('success', 'Comment added');
                      } catch (error) {
                        notify('error', readableError(error));
                      }
                    }}
                    onDelete={async (commentId) => {
                      const confirmed = await confirm({
                        title: 'Delete comment?',
                        message: 'This comment will be permanently removed from the task.',
                        confirmLabel: 'Delete comment',
                      });
                      if (!confirmed) return;

                      try {
                        await mutations.deleteComment.mutateAsync({ taskId: task.id, commentId });
                        notify('success', 'Comment deleted');
                      } catch (error) {
                        notify('error', readableError(error));
                      }
                    }}
                  />
                  <ActivityTimeline events={activityQuery.data ?? []} loading={activityQuery.isLoading} />
                </>
              ) : null}
            </div>

            <div className="drawer-footer">
              {mode === 'edit' ? (
                <button className="danger-button" onClick={remove} type="button">
                  <Trash2 size={16} />
                  Delete
                </button>
              ) : (
                <span />
              )}
              <button className="ghost-button" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={save}
                type="button"
                disabled={mutations.createTask.isPending || mutations.updateTask.isPending}
              >
                {mutations.createTask.isPending || mutations.updateTask.isPending ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                Save
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function MultiPicker({
  title,
  icon,
  items,
  selected,
  onChange,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<TeamMember | Label>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="picker-block">
      <div className="picker-title">
        {icon}
        {title}
      </div>
      <div className="picker-grid">
        {items.length ? (
          items.map((item) => {
            const active = selected.includes(item.id);
            return (
              <button
                className={cx('picker-chip', active && 'picker-chip-active')}
                onClick={() => onChange(active ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
                type="button"
                key={item.id}
              >
                <span className="picker-color" style={{ background: item.color }} />
                {item.name}
              </button>
            );
          })
        ) : (
          <span className="muted-small">Create {title.toLowerCase()} first.</span>
        )}
      </div>
    </div>
  );
}

function CommentPanel({
  comments,
  loading,
  onCreate,
  onDelete,
}: {
  taskId: string;
  comments: Array<{ id: string; body: string; created_at: string }>;
  loading: boolean;
  onCreate: (body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  return (
    <section className="detail-section">
      <div className="section-title">
        <MessageSquare size={15} />
        Comments
      </div>
      <div className="comment-list">
        {loading ? <span className="muted-small">Loading comments...</span> : null}
        {comments.map((comment) => (
          <motion.div className="comment-item" key={comment.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <p>{comment.body}</p>
              <span>{relativeTime(comment.created_at)}</span>
            </div>
            <button className="mini-button" onClick={() => void onDelete(comment.id)} type="button" aria-label="Delete comment">
              <Trash2 size={13} />
            </button>
          </motion.div>
        ))}
      </div>
      <div className="comment-composer">
        <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a comment..." />
        <button
          className="icon-button"
          onClick={() => {
            if (!body.trim()) return;
            void onCreate(body).then(() => setBody(''));
          }}
          type="button"
        >
          <Plus size={15} />
        </button>
      </div>
    </section>
  );
}

function ActivityTimeline({ events, loading }: { events: ActivityEvent[]; loading: boolean }) {
  return (
    <section className="detail-section">
      <div className="section-title">
        <Clock3 size={15} />
        Activity
      </div>
      <div className="activity-list">
        {loading ? <span className="muted-small">Loading activity...</span> : null}
        {events.map((event) => (
          <motion.div className="activity-item" key={event.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
            <span className="activity-dot" />
            <div>
              <strong>{event.message}</strong>
              <span>{relativeTime(event.created_at)}</span>
              <ActivityMeta event={event} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ActivityMeta({ event }: { event: ActivityEvent }) {
  const details = describeActivityMetadata(event);
  if (!details.length) return null;

  return (
    <div className="activity-meta">
      {details.map((detail) => (
        <span key={detail}>{detail}</span>
      ))}
    </div>
  );
}
