import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  CircleDotDashed,
  Clock3,
  Command,
  Filter,
  Flame,
  Gauge,
  Github,
  KanbanSquare,
  LogOut,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  pendingOAuthFlowKey,
  pendingOAuthProviderKey,
  useAnonymousSession,
  type OAuthProvider,
  type SessionRecovery,
} from '../hooks/useAnonymousSession';
import { boardQueryKey, useActivity, useBoardData, useBoardStats, useComments } from '../hooks/useBoardData';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { PRIORITIES, STATUSES } from '../lib/constants';
import { dueLabel, dueTone, relativeTime } from '../lib/dates';
import type {
  ActivityEvent,
  BoardFilters,
  BoardPayload,
  BoardStats,
  Label,
  Task,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from '../lib/types';
import { cx, initials, readableError } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';

type DrawerMode = 'create' | 'edit';
type Toast = { id: number; tone: 'success' | 'error'; message: string };
type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};
type ConfirmRequest = ConfirmOptions & {
  id: number;
  resolve: (confirmed: boolean) => void;
};

const defaultFilters: BoardFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  due: 'all',
  label_id: '',
  assignee_id: '',
};

const defaultDraft = {
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'normal' as TaskPriority,
  due_date: '',
  assignee_ids: [] as string[],
  label_ids: [] as string[],
};

const EMPTY_TASKS: Task[] = [];
const statusIcons = {
  todo: CircleDotDashed,
  in_progress: Workflow,
  in_review: Gauge,
  done: BadgeCheck,
} satisfies Record<TaskStatus, typeof CircleDotDashed>;
const socialProviders = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
] satisfies Array<{ id: OAuthProvider; label: string }>;
type AuthBusy = 'save' | 'link' | 'signout' | `signin-${OAuthProvider}`;

export function App() {
  const session = useAnonymousSession();
  const [filters, setFilters] = useState<BoardFilters>(defaultFilters);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('edit');
  const [initialStatus, setInitialStatus] = useState<TaskStatus>('todo');
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const queryClient = useQueryClient();

  const boardQuery = useBoardData(filters, session.status === 'ready');
  const statsQuery = useBoardStats(session.status === 'ready');
  const mutations = useTaskMutations();
  const board = boardQuery.data;
  const stats = statsQuery.data;
  const tasks = board?.tasks ?? EMPTY_TASKS;
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => groupTasks(tasks), [tasks]);

  function openCreate(status: TaskStatus = 'todo') {
    setDrawerMode('create');
    setInitialStatus(status);
    setSelectedTaskId(null);
  }

  function openEdit(taskId: string) {
    setDrawerMode('edit');
    setSelectedTaskId(taskId);
  }

  function notify(tone: Toast['tone'], message: string) {
    const item = { id: Date.now(), tone, message };
    setToast(item);
    window.setTimeout(() => {
      setToast((current) => (current?.id === item.id ? null : current));
    }, 3200);
  }

  function confirmAction(options: ConfirmOptions) {
    return new Promise<boolean>((resolve) => {
      setConfirmRequest({ ...options, id: Date.now(), resolve });
    });
  }

  function resolveConfirm(confirmed: boolean) {
    setConfirmRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    const active = tasks.find((task) => task.id === activeId);
    if (!active) return;

    const overTask = tasks.find((task) => task.id === overId);
    const targetStatus = overId.startsWith('column-') ? (overId.replace('column-', '') as TaskStatus) : overTask?.status;
    if (!targetStatus) return;

    const updates = reorderForDrop(tasks, active, targetStatus, overTask?.id);
    if (!updates.length) return;

    await applyReorder(updates);
  }

  async function moveTask(taskId: string, targetStatus: TaskStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === targetStatus) return;

    const updates = reorderForDrop(tasks, task, targetStatus);
    if (!updates.length) return;

    await applyReorder(updates);
  }

  async function applyReorder(updates: Array<{ id: string; status: TaskStatus; position: number }>) {
    const previous = board;
    if (previous) {
      queryClient.setQueryData<BoardPayload>(boardQueryKey(filters), {
        ...previous,
        tasks: previous.tasks.map((task) => {
          const update = updates.find((item) => item.id === task.id);
          return update ? { ...task, status: update.status, position: update.position } : task;
        }),
      });
    }

    try {
      await mutations.reorderTasks.mutateAsync(updates);
      notify('success', 'Board updated');
    } catch (error) {
      if (previous) queryClient.setQueryData(boardQueryKey(filters), previous);
      notify('error', readableError(error));
    }
  }

  if (session.status === 'loading') {
    return <LoadingExperience />;
  }

  if (session.status === 'error') {
    return <FatalState title="Guest session failed" message={session.error ?? 'Anonymous auth could not start.'} />;
  }

  return (
    <div className="app-shell">
      <AppHeader
        session={session}
        filters={filters}
        setFilters={setFilters}
        labels={board?.labels ?? []}
        members={board?.teamMembers ?? []}
        onCreate={() => openCreate('todo')}
        onManage={() => setManagerOpen(true)}
      />

      <main className="app-main">
        <StatsStrip stats={stats} loading={statsQuery.isLoading} />

        {boardQuery.isError ? (
          <FatalState title="Board could not load" message={readableError(boardQuery.error)} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <section className="board-scroll" aria-label="Task board">
              {STATUSES.map((status) => (
                <BoardColumn
                  key={status.id}
                  status={status.id}
                  title={status.label}
                  tone={status.tone}
                  tasks={grouped[status.id]}
                  loading={boardQuery.isLoading}
                  onCreate={() => openCreate(status.id)}
                  onOpen={openEdit}
                  onMove={moveTask}
                />
              ))}
            </section>
            <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay onOpen={() => undefined} /> : null}</DragOverlay>
          </DndContext>
        )}

        {board && tasks.length === 0 && !boardQuery.isLoading ? (
          <EmptyBoard
            hasFilters={hasActiveFilters(filters)}
            onClear={() => setFilters(defaultFilters)}
            onCreate={() => openCreate('todo')}
            onDemo={async () => {
              try {
                await mutations.bootstrapDemo.mutateAsync();
                notify('success', 'Sample board loaded');
              } catch (error) {
                notify('error', readableError(error));
              }
            }}
            loading={mutations.bootstrapDemo.isPending}
          />
        ) : null}
      </main>

      <TaskDrawer
        open={drawerMode === 'create' || Boolean(selectedTask)}
        mode={drawerMode}
        initialStatus={initialStatus}
        task={selectedTask}
        board={board}
        onClose={() => {
          setSelectedTaskId(null);
          setDrawerMode('edit');
        }}
        notify={notify}
        confirm={confirmAction}
      />

      <TeamLabelManager
        open={managerOpen}
        board={board}
        onClose={() => setManagerOpen(false)}
        notify={notify}
        confirm={confirmAction}
      />

      <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm} />

      <AnimatePresence>
        {toast ? (
          <motion.div
            className={cx('toast', toast.tone === 'error' ? 'toast-error' : 'toast-success')}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
          >
            {toast.tone === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AppHeader({
  session,
  filters,
  setFilters,
  labels,
  members,
  onCreate,
  onManage,
}: {
  session: {
    userId: string | null;
    email: string | null;
    isAnonymous: boolean;
  } & SessionRecovery;
  filters: BoardFilters;
  setFilters: (filters: BoardFilters) => void;
  labels: Label[];
  members: TeamMember[];
  onCreate: () => void;
  onManage: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [authRedirectError] = useState(() => readAuthRedirectError());
  const [accountOpen, setAccountOpen] = useState(Boolean(authRedirectError));
  const [emailInput, setEmailInput] = useState(session.email ?? '');
  const [emailOpen, setEmailOpen] = useState(!authRedirectError && Boolean(session.email));
  const [authBusy, setAuthBusy] = useState<AuthBusy | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(authRedirectError?.message ?? null);
  const [authRecoveryProvider, setAuthRecoveryProvider] = useState<OAuthProvider | null>(authRedirectError?.provider ?? null);
  const confirmedEmail = session.email?.trim().toLowerCase() ?? '';
  const enteredEmail = emailInput.trim().toLowerCase();
  const boardAlreadySaved = Boolean(confirmedEmail && !session.isAnonymous && confirmedEmail === enteredEmail);

  async function runAuthAction(kind: 'save' | 'link') {
    setAuthBusy(kind);
    setAuthMessage(null);
    setAuthRecoveryProvider(null);
    if (kind === 'save' && boardAlreadySaved) {
      setAuthMessage('This board is already recoverable with this email.');
      setAuthBusy(null);
      return;
    }

    try {
      const message =
        kind === 'save' ? await session.saveBoardToEmail(emailInput) : await session.sendSignInLink(emailInput);
      setAuthMessage(message);
    } catch (error) {
      setAuthMessage(readableError(error));
    } finally {
      setAuthBusy(null);
    }
  }

  async function signOut() {
    setAuthBusy('signout');
    setAuthMessage(null);
    setAuthRecoveryProvider(null);
    try {
      await session.signOut();
      setAccountOpen(false);
    } catch (error) {
      setAuthMessage(readableError(error));
    } finally {
      setAuthBusy(null);
    }
  }

  async function signInWithProvider(provider: OAuthProvider) {
    const action = `signin-${provider}` as const;
    setAuthBusy(action);
    setAuthMessage(null);
    setAuthRecoveryProvider(null);
    try {
      const message = await session.signInWithProvider(provider);
      setAuthMessage(message);
    } catch (error) {
      setAuthMessage(readableError(error));
    } finally {
      setAuthBusy(null);
    }
  }

  function toggleAccount() {
    if (!accountOpen && session.email) {
      setEmailInput(session.email);
      setEmailOpen(true);
    }
    setAccountOpen((value) => !value);
  }

  function toggleEmailPanel() {
    if (!emailOpen && session.email) setEmailInput(session.email);
    setAuthMessage(null);
    setEmailOpen((value) => !value);
  }

  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-mark">
          <KanbanSquare size={20} />
        </div>
        <div>
          <div className="brand-title">Next Task</div>
          <div className="brand-subtitle">Plan. Review. Ship.</div>
        </div>
      </div>

      <div className="header-actions">
        <div className="search-box">
          <Search size={16} />
          <input
            value={filters.search ?? ''}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Search tasks"
            aria-label="Search tasks"
          />
          {filters.search ? (
            <button className="search-clear" onClick={() => setFilters({ ...filters, search: '' })} type="button" aria-label="Clear search">
              <X size={14} />
            </button>
          ) : null}
        </div>
        <button
          className="icon-button text-button"
          onClick={() => setFiltersOpen((value) => !value)}
          type="button"
          title="Filters"
          aria-expanded={filtersOpen}
          aria-controls="board-filters"
        >
          <Filter size={16} />
          Filters
          <ChevronDown size={14} />
        </button>
        <button className="icon-button text-button" onClick={onManage} type="button" title="Team and labels">
          <Users size={16} />
          Team & labels
        </button>
        <button className="primary-button" onClick={onCreate} type="button" title="New task">
          <Plus size={17} />
          New task
        </button>
      </div>

      <button
        className="guest-chip"
        onClick={toggleAccount}
        type="button"
        aria-expanded={accountOpen}
        aria-controls="account-menu"
        title="Account recovery"
      >
        <span className="pulse-dot" />
        {session.email ? session.email : `Guest ${session.userId?.slice(0, 8) ?? 'local'}`}
      </button>

      <AnimatePresence>
        {filtersOpen ? (
          <motion.div
            id="board-filters"
            className="filter-popover"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Select
              label="Status"
              value={filters.status ?? 'all'}
              onChange={(value) => setFilters({ ...filters, status: value as BoardFilters['status'] })}
              options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((status) => ({ value: status.id, label: status.label }))]}
            />
            <Select
              label="Priority"
              value={filters.priority ?? 'all'}
              onChange={(value) => setFilters({ ...filters, priority: value as BoardFilters['priority'] })}
              options={[{ value: 'all', label: 'All priorities' }, ...PRIORITIES.map((priority) => ({ value: priority.id, label: priority.label }))]}
            />
            <Select
              label="Due"
              value={filters.due ?? 'all'}
              onChange={(value) => setFilters({ ...filters, due: value as BoardFilters['due'] })}
              options={[
                { value: 'all', label: 'Any due date' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'soon', label: 'Due soon' },
                { value: 'none', label: 'No due date' },
              ]}
            />
            <Select
              label="Label"
              value={filters.label_id ?? ''}
              onChange={(value) => setFilters({ ...filters, label_id: value })}
              options={[{ value: '', label: 'Any label' }, ...labels.map((label) => ({ value: label.id, label: label.name }))]}
            />
            <Select
              label="Assignee"
              value={filters.assignee_id ?? ''}
              onChange={(value) => setFilters({ ...filters, assignee_id: value })}
              options={[{ value: '', label: 'Anyone' }, ...members.map((member) => ({ value: member.id, label: member.name }))]}
            />
            <button className="ghost-button" onClick={() => setFilters(defaultFilters)} type="button">
              Reset filters
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {accountOpen ? (
          <motion.div
            id="account-menu"
            className="account-popover"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="account-heading">
              <span className="account-icon">
                <ShieldCheck size={16} />
              </span>
              <div>
                <strong>{session.isAnonymous ? 'Guest board' : 'Recoverable board'}</strong>
                <span>{session.email || 'Sign in to recover this board anywhere.'}</span>
              </div>
            </div>
            <div className="account-actions">
              <div className="auth-choice-grid" aria-label="Account recovery options">
                {socialProviders.map((provider) => {
                  const action = `signin-${provider.id}` as const;
                  return (
                    <button
                      className="ghost-button provider-button"
                      key={provider.id}
                      onClick={() => void signInWithProvider(provider.id)}
                      type="button"
                      disabled={Boolean(authBusy)}
                    >
                      {authBusy === action ? <Loader2 className="spin" size={16} /> : <ProviderMark provider={provider.id} />}
                      Continue with {provider.label}
                    </button>
                  );
                })}
                <button
                  className="ghost-button provider-button email-provider-button"
                  onClick={toggleEmailPanel}
                  type="button"
                  disabled={Boolean(authBusy)}
                  aria-expanded={emailOpen}
                >
                  <Mail size={16} />
                  Use email
                </button>
              </div>
              <AnimatePresence>
                {emailOpen ? (
                  <motion.div
                    className="email-auth-panel"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <label className="field compact-field">
                      <span>Email recovery</span>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(event) => setEmailInput(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <div className="email-auth-actions">
                      <button
                        className="primary-button"
                        onClick={() => void runAuthAction('save')}
                        type="button"
                        disabled={Boolean(authBusy) || boardAlreadySaved}
                      >
                        {authBusy === 'save' ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
                        {boardAlreadySaved ? 'Board saved' : 'Save with email'}
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void runAuthAction('link')}
                        type="button"
                        disabled={Boolean(authBusy)}
                      >
                        {authBusy === 'link' ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}
                        Sign-in link
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <button className="ghost-button" onClick={() => void signOut()} type="button" disabled={Boolean(authBusy)}>
                {authBusy === 'signout' ? <Loader2 className="spin" size={16} /> : <LogOut size={16} />}
                Sign out
              </button>
            </div>
            {authMessage ? (
              <div className="account-message-stack">
                <p className={cx('account-message', authRecoveryProvider && 'warning')}>{authMessage}</p>
                {authRecoveryProvider ? (
                  <button
                    className="ghost-button"
                    onClick={() => void signInWithProvider(authRecoveryProvider)}
                    type="button"
                    disabled={Boolean(authBusy)}
                  >
                    {authBusy === `signin-${authRecoveryProvider}` ? (
                      <Loader2 className="spin" size={16} />
                    ) : (
                      <ProviderMark provider={authRecoveryProvider} />
                    )}
                    Sign in with {providerLabel(authRecoveryProvider)}
                  </button>
                ) : null}
              </div>
            ) : boardAlreadySaved ? (
              <p className="account-message success">Board recovery is active for this email.</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function ProviderMark({ provider }: { provider: OAuthProvider }) {
  if (provider === 'github') return <Github size={16} />;
  return <span className="provider-mark">G</span>;
}

function providerLabel(provider: OAuthProvider) {
  return socialProviders.find((item) => item.id === provider)?.label ?? provider;
}

function readAuthRedirectError(): { message: string; provider: OAuthProvider | null } | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = searchParams.get('error') ?? hashParams.get('error');
  const code = searchParams.get('error_code') ?? hashParams.get('error_code');
  const description = searchParams.get('error_description') ?? hashParams.get('error_description');

  if (!error && !code && !description) return null;

  const provider = readPendingOAuthProvider();
  clearPendingOAuthProvider();
  clearAuthRedirectFromUrl();

  if (code === 'email_exists') {
    return {
      provider,
      message: provider
        ? `That email is already used by another Next Task account. Sign in to that account first, or choose a different ${providerLabel(
            provider,
          )} account to save this guest board.`
        : 'That email is already used by another Next Task account. Sign in to that account first, or choose a different account to save this guest board.',
    };
  }

  return {
    provider: null,
    message: description || 'Sign-in could not finish. Try again or choose another sign-in method.',
  };
}

function readPendingOAuthProvider(): OAuthProvider | null {
  const provider = window.sessionStorage.getItem(pendingOAuthProviderKey);
  return provider === 'google' || provider === 'github' ? provider : null;
}

function clearPendingOAuthProvider() {
  window.sessionStorage.removeItem(pendingOAuthProviderKey);
  window.sessionStorage.removeItem(pendingOAuthFlowKey);
}

function clearAuthRedirectFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('error');
  url.searchParams.delete('error_code');
  url.searchParams.delete('error_description');
  if (url.hash.includes('error=')) url.hash = '';

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl || '/');
}

function StatsStrip({ stats, loading }: { stats?: BoardStats; loading: boolean }) {
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
            {loading ? <span className="stat-skeleton" /> : <motion.strong key={item.value}>{item.value}</motion.strong>}
          </motion.div>
        );
      })}
    </section>
  );
}

function BoardColumn({
  status,
  title,
  tone,
  tasks,
  loading,
  onCreate,
  onOpen,
  onMove,
}: {
  status: TaskStatus;
  title: string;
  tone: string;
  tasks: Task[];
  loading: boolean;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
  const StatusIcon = statusIcons[status];
  return (
    <div ref={setNodeRef} className={cx('board-column', `tone-${tone}`, isOver && 'column-over')}>
      <div className="column-header">
        <div>
          <span className="column-kicker">Status</span>
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

      <button className="column-add" onClick={onCreate} type="button">
        <Plus size={16} />
        Add task
      </button>
    </div>
  );
}

function SortableTaskCard({ task, onOpen, onMove }: { task: Task; onOpen: (id: string) => void; onMove: (id: string, status: TaskStatus) => void }) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
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

function TaskCard({
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
  return (
    <motion.article
      ref={refCallback}
      className={cx('task-card', isDragging && 'task-card-dragging', overlay && 'task-card-overlay')}
      style={style}
      layout
      initial={false}
      whileHover={{ y: -2 }}
      onClick={() => onOpen(task.id)}
    >
      <div className="task-topline">
        <span className={cx('priority-dot', `priority-${task.priority}`)} />
        <span className="priority-label">{task.priority}</span>
        {task.priority === 'high' ? (
          <span className="priority-signal" aria-label="High priority">
            <Flame size={12} />
          </span>
        ) : null}
        <button
          ref={activatorRef}
          className="drag-handle"
          type="button"
          aria-label={`Drag ${task.title}`}
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <MoreHorizontal size={15} />
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
        <label className="mobile-move-row" onClick={(event) => event.stopPropagation()}>
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
      ) : null}
    </motion.article>
  );
}

function TaskDrawer({
  open,
  mode,
  task,
  board,
  initialStatus,
  onClose,
  notify,
  confirm,
}: {
  open: boolean;
  mode: DrawerMode;
  task: Task | null;
  board?: BoardPayload;
  initialStatus: TaskStatus;
  onClose: () => void;
  notify: (tone: Toast['tone'], message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(defaultDraft);
  const commentsQuery = useComments(task?.id ?? null);
  const activityQuery = useActivity(task?.id ?? null);
  const mutations = useTaskMutations();

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
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="task-drawer"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="drawer-header">
              <div>
                <span className="drawer-kicker">{mode === 'create' ? 'New task' : 'Task details'}</span>
                <h2>{mode === 'create' ? 'Create work item' : 'Refine the task'}</h2>
              </div>
              <button className="icon-button" onClick={onClose} type="button" aria-label="Close drawer">
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <label className="field">
                <span>Title</span>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Add task title" />
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
                <input type="date" value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} />
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
              <button className="primary-button" onClick={save} type="button" disabled={mutations.createTask.isPending || mutations.updateTask.isPending}>
                {mutations.createTask.isPending || mutations.updateTask.isPending ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
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
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TeamLabelManager({
  open,
  board,
  onClose,
  notify,
  confirm,
}: {
  open: boolean;
  board?: BoardPayload;
  onClose: () => void;
  notify: (tone: Toast['tone'], message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const [memberName, setMemberName] = useState('');
  const [labelName, setLabelName] = useState('');
  const mutations = useTaskMutations();

  async function addMember() {
    if (!memberName.trim()) return;
    try {
      await mutations.createTeamMember.mutateAsync({ name: memberName, color: randomColor(board?.teamMembers.length ?? 0) });
      setMemberName('');
      notify('success', 'Team member added');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function addLabel() {
    if (!labelName.trim()) return;
    try {
      await mutations.createLabel.mutateAsync({ name: labelName, color: randomColor(board?.labels.length ?? 0) });
      setLabelName('');
      notify('success', 'Label added');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function removeMember(member: TeamMember) {
    const confirmed = await confirm({
      title: 'Delete team member?',
      message: `"${member.name}" will be removed from the workspace and unassigned from tasks.`,
      confirmLabel: 'Delete member',
    });
    if (!confirmed) return;

    try {
      await mutations.deleteTeamMember.mutateAsync(member.id);
      notify('success', 'Team member deleted');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function removeLabel(label: Label) {
    const confirmed = await confirm({
      title: 'Delete label?',
      message: `"${label.name}" will be removed from the workspace and from any tagged tasks.`,
      confirmLabel: 'Delete label',
    });
    if (!confirmed) return;

    try {
      await mutations.deleteLabel.mutateAsync(label.id);
      notify('success', 'Label deleted');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="manager-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="drawer-header">
              <div>
                <span className="drawer-kicker">Workspace setup</span>
                <h2>Team & labels</h2>
              </div>
              <button className="icon-button" onClick={onClose} type="button" aria-label="Close team and labels">
                <X size={18} />
              </button>
            </div>
            <div className="manager-grid">
              <section className="manager-card">
                <h3>
                  <Users size={16} />
                  Team members
                </h3>
                <div className="inline-create">
                  <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Add member" />
                  <button className="icon-button" onClick={() => void addMember()} type="button" aria-label="Add team member">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="manager-list">
                  {(board?.teamMembers ?? []).map((member) => (
                    <div className="manager-row" key={member.id}>
                      <Avatar member={member} />
                      <span>{member.name}</span>
                      <button className="mini-button" onClick={() => void removeMember(member)} type="button" aria-label={`Delete ${member.name}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section className="manager-card">
                <h3>
                  <Tag size={16} />
                  Labels
                </h3>
                <div className="inline-create">
                  <input value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="Add label" />
                  <button className="icon-button" onClick={() => void addLabel()} type="button" aria-label="Add label">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="manager-list">
                  {(board?.labels ?? []).map((label) => (
                    <div className="manager-row" key={label.id}>
                      <span className="picker-color" style={{ background: label.color }} />
                      <span>{label.name}</span>
                      <button className="mini-button" onClick={() => void removeLabel(label)} type="button" aria-label={`Delete ${label.name}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ConfirmDialog({
  request,
  onResolve,
}: {
  request: ConfirmRequest | null;
  onResolve: (confirmed: boolean) => void;
}) {
  useEffect(() => {
    if (!request) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onResolve(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request, onResolve]);

  return (
    <AnimatePresence>
      {request ? (
        <>
          <motion.div
            className="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onResolve(false)}
          />
          <motion.div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-title-${request.id}`}
            aria-describedby={`confirm-message-${request.id}`}
            initial={{ opacity: 0, x: '-50%', y: 'calc(-50% + 14px)', scale: 0.98 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: 'calc(-50% + 12px)', scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="confirm-icon">
              <AlertCircle size={19} />
            </div>
            <h2 id={`confirm-title-${request.id}`}>{request.title}</h2>
            <p id={`confirm-message-${request.id}`}>{request.message}</p>
            <div className="confirm-actions">
              <button className="ghost-button" onClick={() => onResolve(false)} type="button">
                {request.cancelLabel ?? 'Cancel'}
              </button>
              <button className="danger-button" onClick={() => onResolve(true)} type="button">
                <Trash2 size={16} />
                {request.confirmLabel ?? 'Delete'}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function EmptyBoard({
  hasFilters,
  onClear,
  onCreate,
  onDemo,
  loading,
}: {
  hasFilters: boolean;
  onClear: () => void;
  onCreate: () => void;
  onDemo: () => void;
  loading: boolean;
}) {
  return (
    <motion.section className="empty-board" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="empty-orbit">
        <Sparkles size={24} />
      </div>
      <h2>{hasFilters ? 'No matching tasks' : 'Shape the next play'}</h2>
      <p>
        {hasFilters
          ? 'Clear filters or adjust the search to bring work back into view.'
          : 'Start with a focused task or load a rich sample board to inspect the full product experience.'}
      </p>
      <div className="empty-actions">
        {hasFilters ? (
          <button className="primary-button" onClick={onClear} type="button">
            Clear filters
          </button>
        ) : (
          <>
            <button className="primary-button" onClick={onCreate} type="button">
              <Plus size={16} />
              Create task
            </button>
            <button className="ghost-button" onClick={onDemo} type="button" disabled={loading}>
              {loading ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
              Load sample board
            </button>
          </>
        )}
      </div>
    </motion.section>
  );
}

function LoadingExperience() {
  return (
    <div className="app-shell">
      <main className="loading-stage">
        <div className="brand-mark large">
          <KanbanSquare size={28} />
        </div>
        <h1>Preparing Next Task</h1>
        <p>Creating a secure guest workspace and polishing the board surface.</p>
        <div className="loading-board">
          {STATUSES.map((status) => (
            <div className="board-column skeleton-column" key={status.id}>
              <TaskSkeleton />
              <TaskSkeleton />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function FatalState({ title, message }: { title: string; message: string }) {
  return (
    <section className="fatal-state">
      <AlertCircle size={28} />
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

function TaskSkeleton() {
  return (
    <div className="task-skeleton">
      <span />
      <strong />
      <p />
      <p />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="field compact-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AvatarStack({ members }: { members: TeamMember[] }) {
  if (!members.length) return <span className="unassigned">Unassigned</span>;
  return (
    <div className="avatar-stack">
      {members.slice(0, 3).map((member) => (
        <Avatar member={member} key={member.id} />
      ))}
      {members.length > 3 ? <span className="avatar-overflow">+{members.length - 3}</span> : null}
    </div>
  );
}

function Avatar({ member }: { member: TeamMember }) {
  return (
    <span className="avatar" style={{ background: member.color }} title={member.name}>
      {member.avatar_url ? <img src={member.avatar_url} alt="" /> : initials(member.name)}
    </span>
  );
}

function groupTasks(tasks: Task[]) {
  return STATUSES.reduce(
    (acc, status) => {
      acc[status.id] = tasks.filter((task) => task.status === status.id).sort((a, b) => a.position - b.position);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );
}

function reorderForDrop(tasks: Task[], active: Task, targetStatus: TaskStatus, overTaskId?: string) {
  const sourceStatus = active.status;
  const updates: Array<{ id: string; status: TaskStatus; position: number }> = [];
  const targetTasks = tasks
    .filter((task) => task.status === targetStatus && task.id !== active.id)
    .sort((a, b) => a.position - b.position);
  const moved = { ...active, status: targetStatus };
  const overIndex = overTaskId ? targetTasks.findIndex((task) => task.id === overTaskId) : -1;
  targetTasks.splice(overIndex >= 0 ? overIndex : targetTasks.length, 0, moved);

  targetTasks.forEach((task, index) => {
    const position = (index + 1) * 1000;
    const original = tasks.find((item) => item.id === task.id);
    if (original?.position !== position || original?.status !== targetStatus) {
      updates.push({ id: task.id, status: targetStatus, position });
    }
  });

  if (sourceStatus !== targetStatus) {
    tasks
      .filter((task) => task.status === sourceStatus && task.id !== active.id)
      .sort((a, b) => a.position - b.position)
      .forEach((task, index) => {
        const position = (index + 1) * 1000;
        if (task.position !== position) updates.push({ id: task.id, status: sourceStatus, position });
      });
  }

  return updates;
}

function hasActiveFilters(filters: BoardFilters) {
  return Boolean(filters.search || (filters.status && filters.status !== 'all') || (filters.priority && filters.priority !== 'all') || filters.label_id || filters.assignee_id || (filters.due && filters.due !== 'all'));
}

function randomColor(index: number) {
  return ['#7A5AF8', '#2E90FA', '#12B76A', '#F79009', '#E9354A'][index % 5];
}
