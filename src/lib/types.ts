export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export type TeamMember = {
  id: string;
  board_id: string;
  user_id: string | null;
  name: string;
  avatar_url: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Label = {
  id: string;
  board_id: string;
  user_id: string | null;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  board_id: string;
  user_id: string | null;
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
  board_id: string;
  user_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type ActivityEvent = {
  id: string;
  task_id: string;
  board_id: string;
  user_id: string | null;
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

export type WorkspaceBoard = {
  id: string;
  workspace_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  display_name: string;
  invited_by: string | null;
  joined_at: string;
  updated_at: string;
};

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  invitee_email: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  is_personal: boolean;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
  boards: WorkspaceBoard[];
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
};

export type WorkspacesPayload = {
  workspaces: Workspace[];
  selectedBoardId?: string;
  selectedWorkspaceId?: string;
};

export type InvitationResult = {
  id: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  email: string | null;
  expires_at: string;
  invite_url: string;
};

export type WorkspaceAuditEvent = {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  subject_user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WorkspaceAuditPayload = {
  events: WorkspaceAuditEvent[];
};

export type BoardPresenceMember = {
  user_id: string;
  display_name: string;
  role: WorkspaceRole;
  online_at: string;
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
