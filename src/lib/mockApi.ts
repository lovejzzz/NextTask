import { addDays } from 'date-fns';

import { formatDateInput } from './dates';
import type {
  ActivityEvent,
  BoardFilters,
  BoardPayload,
  BoardStats,
  Comment,
  Label,
  LabelInput,
  ReorderUpdate,
  Task,
  TaskCreateInput,
  TaskPriority,
  TaskStatus,
  TaskUpdateInput,
  TeamMember,
  TeamMemberInput,
} from './types';

type MockState = {
  userId: string;
  tasks: Task[];
  teamMembers: TeamMember[];
  labels: Label[];
  comments: Comment[];
  activity: ActivityEvent[];
};

const STORAGE_KEY = 'next-task-local-demo-v1';
const userId = 'local-demo-user';

export const mockApi = {
  async getBoard(filters: BoardFilters = {}) {
    await delay(140);
    return hydrate(applyFilters(readState().tasks, filters));
  },

  async getStats() {
    await delay(80);
    return computeStats(readState().tasks);
  },

  async bootstrapDemo() {
    const state = createSeedState();
    writeState(state);
    await delay(220);
    return hydrate(state.tasks);
  },

  async resetBoard() {
    const state: MockState = { userId, tasks: [], teamMembers: [], labels: [], comments: [], activity: [] };
    writeState(state);
    await delay(160);
    return hydrate(state.tasks);
  },

  async createTask(input: TaskCreateInput) {
    const state = readState();
    const status = input.status ?? 'todo';
    const task: Task = {
      id: id(),
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      status,
      priority: input.priority ?? 'normal',
      due_date: input.due_date ?? null,
      position: nextPosition(state.tasks, status),
      created_at: now(),
      updated_at: now(),
      assignees: state.teamMembers.filter((member) => input.assignee_ids?.includes(member.id)),
      labels: state.labels.filter((label) => input.label_ids?.includes(label.id)),
      comment_count: 0,
      latest_activity_at: null,
    };
    state.tasks.push(task);
    addActivity(state, task.id, 'task_created', 'Created task', { title: task.title });
    writeState(state);
    await delay(140);
    return hydrateTask(task.id);
  },

  async updateTask(idValue: string, input: TaskUpdateInput) {
    const state = readState();
    const task = state.tasks.find((item) => item.id === idValue);
    if (!task) throw new Error('Task not found');
    const previousStatus = task.status;

    if (input.title !== undefined) task.title = input.title.trim();
    if (input.description !== undefined) task.description = input.description.trim();
    if (input.status !== undefined) task.status = input.status;
    if (input.priority !== undefined) task.priority = input.priority;
    if (input.due_date !== undefined) task.due_date = input.due_date ?? null;
    if (input.position !== undefined) task.position = input.position;
    if (input.assignee_ids !== undefined) {
      task.assignees = state.teamMembers.filter((member) => input.assignee_ids?.includes(member.id));
    }
    if (input.label_ids !== undefined) {
      task.labels = state.labels.filter((label) => input.label_ids?.includes(label.id));
    }
    task.updated_at = now();

    if (input.status && input.status !== previousStatus) {
      addActivity(state, task.id, 'task_moved', `Moved from ${statusLabel(previousStatus)} to ${statusLabel(input.status)}`, {
        from: previousStatus,
        to: input.status,
      });
    } else {
      addActivity(state, task.id, 'task_updated', 'Updated task');
    }

    writeState(state);
    await delay(120);
    return hydrateTask(task.id);
  },

  async reorderTasks(updates: ReorderUpdate[]) {
    const state = readState();
    for (const update of updates) {
      const task = state.tasks.find((item) => item.id === update.id);
      if (!task) continue;
      const previousStatus = task.status;
      task.status = update.status;
      task.position = update.position;
      task.updated_at = now();
      if (previousStatus !== update.status) {
        addActivity(state, task.id, 'task_moved', `Moved from ${statusLabel(previousStatus)} to ${statusLabel(update.status)}`, {
          from: previousStatus,
          to: update.status,
        });
      }
    }
    writeState(state);
    await delay(180);
    return hydrate(readState().tasks);
  },

  async deleteTask(taskId: string) {
    const state = readState();
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    state.comments = state.comments.filter((comment) => comment.task_id !== taskId);
    state.activity = state.activity.filter((event) => event.task_id !== taskId);
    writeState(state);
    await delay(100);
  },

  async createTeamMember(input: TeamMemberInput) {
    const state = readState();
    const member: TeamMember = {
      id: id(),
      user_id: userId,
      name: input.name.trim(),
      avatar_url: input.avatar_url ?? null,
      color: input.color ?? '#7A5AF8',
      created_at: now(),
      updated_at: now(),
    };
    state.teamMembers.push(member);
    writeState(state);
    await delay(100);
    return member;
  },

  async updateTeamMember(memberId: string, input: Partial<TeamMemberInput>) {
    const state = readState();
    const member = state.teamMembers.find((item) => item.id === memberId);
    if (!member) throw new Error('Team member not found');
    if (input.name !== undefined) member.name = input.name.trim();
    if (input.avatar_url !== undefined) member.avatar_url = input.avatar_url;
    if (input.color !== undefined) member.color = input.color;
    member.updated_at = now();
    writeState(state);
    await delay(100);
    return member;
  },

  async deleteTeamMember(memberId: string) {
    const state = readState();
    state.teamMembers = state.teamMembers.filter((member) => member.id !== memberId);
    state.tasks = state.tasks.map((task) => ({ ...task, assignees: task.assignees.filter((member) => member.id !== memberId) }));
    writeState(state);
    await delay(100);
  },

  async createLabel(input: LabelInput) {
    const state = readState();
    const label: Label = {
      id: id(),
      user_id: userId,
      name: input.name.trim(),
      color: input.color ?? '#2E90FA',
      created_at: now(),
      updated_at: now(),
    };
    state.labels.push(label);
    writeState(state);
    await delay(100);
    return label;
  },

  async updateLabel(labelId: string, input: Partial<LabelInput>) {
    const state = readState();
    const label = state.labels.find((item) => item.id === labelId);
    if (!label) throw new Error('Label not found');
    if (input.name !== undefined) label.name = input.name.trim();
    if (input.color !== undefined) label.color = input.color;
    label.updated_at = now();
    state.tasks = state.tasks.map((task) => ({
      ...task,
      labels: task.labels.map((taskLabel) => (taskLabel.id === labelId ? label : taskLabel)),
    }));
    writeState(state);
    await delay(100);
    return label;
  },

  async deleteLabel(labelId: string) {
    const state = readState();
    state.labels = state.labels.filter((label) => label.id !== labelId);
    state.tasks = state.tasks.map((task) => ({ ...task, labels: task.labels.filter((label) => label.id !== labelId) }));
    writeState(state);
    await delay(100);
  },

  async getComments(taskId: string) {
    await delay(80);
    return readState().comments.filter((comment) => comment.task_id === taskId);
  },

  async createComment(taskId: string, body: string) {
    const state = readState();
    const comment: Comment = {
      id: id(),
      task_id: taskId,
      user_id: userId,
      body: body.trim(),
      created_at: now(),
      updated_at: now(),
    };
    state.comments.push(comment);
    addActivity(state, taskId, 'comment_added', 'Commented', { comment_id: comment.id });
    writeState(state);
    await delay(120);
    return comment;
  },

  async deleteComment(taskId: string, commentId: string) {
    const state = readState();
    state.comments = state.comments.filter((comment) => comment.id !== commentId);
    addActivity(state, taskId, 'comment_deleted', 'Deleted a comment', { comment_id: commentId });
    writeState(state);
    await delay(100);
  },

  async getActivity(taskId: string) {
    await delay(80);
    return readState().activity.filter((event) => event.task_id === taskId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};

function readState(): MockState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const state = createSeedState();
    writeState(state);
    return state;
  }
  return JSON.parse(stored) as MockState;
}

function writeState(state: MockState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createSeedState(): MockState {
  const teamMembers: TeamMember[] = [
    member('Avery Stone', '#7A5AF8'),
    member('Mina Chen', '#2E90FA'),
    member('Leo Park', '#12B76A'),
  ];

  const labels: Label[] = [
    label('Feature', '#2E90FA'),
    label('Bug', '#E9354A'),
    label('Design', '#7A5AF8'),
    label('Launch', '#F79009'),
  ];

  const today = new Date();
  const tasks: Task[] = [
    task('Design polished drag overlay', 'Make movement feel tactile with a lifted preview and clear drop targets.', 'todo', 'high', formatDateInput(addDays(today, 1)), 1000, [teamMembers[0]], [labels[2]]),
    task('Write RLS verification notes', 'Document how anonymous users are isolated by policy and bearer token.', 'todo', 'normal', formatDateInput(addDays(today, 7)), 2000, [teamMembers[1]], [labels[3]]),
    task('Build comment composer', 'Add compact comments with timestamps and matching activity events.', 'in_progress', 'normal', formatDateInput(addDays(today, 3)), 1000, [teamMembers[2]], [labels[0]]),
    task('Tune mobile board controls', 'Ship a reliable status fallback while keeping desktop drag smooth.', 'in_progress', 'high', formatDateInput(addDays(today, 1)), 2000, [teamMembers[0], teamMembers[1]], [labels[2]]),
    task('Review task card hierarchy', 'Confirm metadata scans well with long titles, labels, and assignees.', 'in_review', 'high', formatDateInput(addDays(today, -2)), 1000, [teamMembers[1]], [labels[1], labels[2]]),
    task('Create default label set', 'Seed useful labels so demo boards are immediately legible.', 'in_review', 'low', null, 2000, [teamMembers[2]], [labels[0]]),
    task('Set up anonymous guest session', 'Automatically create a guest user on first launch.', 'done', 'high', null, 1000, [teamMembers[0]], [labels[0]]),
    task('Define Next Task visual system', 'Lock palette, spacing, states, and motion timings.', 'done', 'normal', null, 2000, [teamMembers[1], teamMembers[2]], [labels[2], labels[3]]),
  ];

  const comments: Comment[] = tasks.slice(0, 4).map((item, index) => ({
    id: id(),
    task_id: item.id,
    user_id: userId,
    body: [
      'This polish detail will be visible immediately during review.',
      'Keep the security explanation concise and concrete.',
      'The drawer should feel calm, not modal-heavy.',
      'Verify this at 390px before deployment.',
    ][index],
    created_at: now(),
    updated_at: now(),
  }));

  const activity: ActivityEvent[] = tasks.map((item) => ({
    id: id(),
    task_id: item.id,
    user_id: userId,
    type: 'task_created',
    message: 'Created task',
    metadata: { title: item.title },
    created_at: item.created_at,
  }));

  return { userId, tasks, teamMembers, labels, comments, activity };
}

function hydrate(tasks: Task[]): BoardPayload {
  const state = readState();
  return {
    tasks: tasks.map((task) => hydrateTaskFromState(task, state)).sort((a, b) => a.position - b.position),
    teamMembers: state.teamMembers,
    labels: state.labels,
  };
}

function hydrateTask(taskId: string): Task {
  const state = readState();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error('Task not found');
  return hydrateTaskFromState(task, state);
}

function hydrateTaskFromState(task: Task, state: MockState): Task {
  const taskComments = state.comments.filter((comment) => comment.task_id === task.id);
  const latestActivity = state.activity
    .filter((event) => event.task_id === task.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    ...task,
    comment_count: taskComments.length,
    latest_activity_at: latestActivity?.created_at ?? null,
  };
}

function applyFilters(tasks: Task[], filters: BoardFilters) {
  const search = filters.search?.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = addDays(today, 3);

  return tasks.filter((task) => {
    if (search && !`${task.title} ${task.description}`.toLowerCase().includes(search)) return false;
    if (filters.status && filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.label_id && !task.labels.some((label) => label.id === filters.label_id)) return false;
    if (filters.assignee_id && !task.assignees.some((member) => member.id === filters.assignee_id)) return false;
    if (filters.due === 'none' && task.due_date) return false;
    if (filters.due === 'overdue') {
      if (!task.due_date || task.status === 'done') return false;
      return new Date(`${task.due_date}T00:00:00`) < today;
    }
    if (filters.due === 'soon') {
      if (!task.due_date || task.status === 'done') return false;
      const due = new Date(`${task.due_date}T00:00:00`);
      return due >= today && due <= soon;
    }
    return true;
  });
}

function computeStats(tasks: Task[]): BoardStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = addDays(today, 3);
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 'done').length,
    overdue: tasks.filter((task) => task.due_date && task.status !== 'done' && new Date(`${task.due_date}T00:00:00`) < today).length,
    dueSoon: tasks.filter((task) => {
      if (!task.due_date || task.status === 'done') return false;
      const due = new Date(`${task.due_date}T00:00:00`);
      return due >= today && due <= soon;
    }).length,
    byStatus: {
      todo: tasks.filter((task) => task.status === 'todo').length,
      in_progress: tasks.filter((task) => task.status === 'in_progress').length,
      in_review: tasks.filter((task) => task.status === 'in_review').length,
      done: tasks.filter((task) => task.status === 'done').length,
    },
    byPriority: {
      low: tasks.filter((task) => task.priority === 'low').length,
      normal: tasks.filter((task) => task.priority === 'normal').length,
      high: tasks.filter((task) => task.priority === 'high').length,
    },
  };
}

function addActivity(
  state: MockState,
  taskId: string,
  type: ActivityEvent['type'],
  message: string,
  metadata: Record<string, unknown> = {},
) {
  state.activity.push({
    id: id(),
    task_id: taskId,
    user_id: userId,
    type,
    message,
    metadata,
    created_at: now(),
  });
}

function member(name: string, color: string): TeamMember {
  return { id: id(), user_id: userId, name, avatar_url: null, color, created_at: now(), updated_at: now() };
}

function label(name: string, color: string): Label {
  return { id: id(), user_id: userId, name, color, created_at: now(), updated_at: now() };
}

function task(
  title: string,
  description: string,
  status: TaskStatus,
  priority: TaskPriority,
  due_date: string | null,
  position: number,
  assignees: TeamMember[],
  labels: Label[],
): Task {
  const timestamp = now();
  return {
    id: id(),
    user_id: userId,
    title,
    description,
    status,
    priority,
    due_date,
    position,
    created_at: timestamp,
    updated_at: timestamp,
    assignees,
    labels,
    comment_count: 0,
    latest_activity_at: timestamp,
  };
}

function nextPosition(tasks: Task[], status: TaskStatus) {
  return Math.max(0, ...tasks.filter((task) => task.status === status).map((task) => task.position)) + 1000;
}

function statusLabel(status: TaskStatus) {
  return {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
  }[status];
}

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
