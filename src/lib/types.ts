export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export type TeamMember = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Label = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignees: TeamMember[];
  labels: Label[];
  comment_count: number;
  latest_activity_at: string | null;
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type ActivityEvent = {
  id: string;
  task_id: string;
  user_id: string;
  type:
    | 'task_created'
    | 'task_updated'
    | 'task_moved'
    | 'assignee_added'
    | 'assignee_removed'
    | 'label_added'
    | 'label_removed'
    | 'comment_added'
    | 'comment_deleted'
    | 'task_deleted';
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BoardPayload = {
  tasks: Task[];
  teamMembers: TeamMember[];
  labels: Label[];
};

export type BoardFilters = {
  search?: string;
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  label_id?: string;
  assignee_id?: string;
  due?: 'overdue' | 'soon' | 'none' | 'all';
};

export type BoardStats = {
  total: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
};

export type TaskCreateInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assignee_ids?: string[];
  label_ids?: string[];
};

export type TaskUpdateInput = Partial<TaskCreateInput> & {
  position?: number;
};

export type ReorderUpdate = {
  id: string;
  status: TaskStatus;
  position: number;
};

export type TeamMemberInput = {
  name: string;
  avatar_url?: string | null;
  color?: string;
};

export type LabelInput = {
  name: string;
  color?: string;
};
