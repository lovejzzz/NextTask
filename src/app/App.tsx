import {
  closestCorners,
  type CollisionDetection,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock3,
  Command,
  Filter,
  Github,
  KanbanSquare,
  LogOut,
  Loader2,
  Mail,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  pendingOAuthFlowKey,
  pendingOAuthProviderKey,
  useAnonymousSession,
  type OAuthProvider,
  type SessionRecovery,
} from '../hooks/useAnonymousSession';
import { boardQueryKey, useBoardData, useBoardStats } from '../hooks/useBoardData';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { useTheme } from '../hooks/useTheme';
import { groupTasks, reorderForDrop } from '../lib/boardLogic';
import { PRIORITIES, STATUSES } from '../lib/constants';
import { activeFilterChips, defaultFilters, hasActiveFilters } from '../lib/filterLogic';
import { BoardColumn } from '../components/board/BoardColumn';
import { TaskCard } from '../components/board/TaskCard';
import { TaskDrawer } from '../components/drawer/TaskDrawer';
import { Avatar } from '../components/shared/Avatar';
import { Select } from '../components/shared/Select';
import { TaskSkeleton } from '../components/shared/Skeletons';
import { statusIcons } from '../components/shared/statusIcons';
import { useDialogFocus } from '../components/shared/useDialogFocus';
import type { ConfirmOptions, ConfirmRequest, DrawerMode, Toast } from '../lib/uiTypes';
import type {
  BoardFilters,
  BoardPayload,
  BoardStats,
  Label,
  Task,
  TaskStatus,
  TeamMember,
} from '../lib/types';
import { cx, randomColor, readableError } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';

type ChangelogEntry = {
  version: string;
  date: string;
  items: string[];
};

const EMPTY_TASKS: Task[] = [];
const APP_VERSION = __APP_VERSION__;
const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.0.3',
    date: '2026-06-18',
    items: [
      'Premium design pass: a full design-token system (spacing, radius, type, elevation, motion).',
      'Refreshed surfaces with softer radii, layered depth, a signature accent, and a glass header.',
      'Elevated stats with animated count-up, refined cards, and a more inviting empty state.',
      'Added a dark mode with a one-tap theme toggle.',
      'Tactile micro-interactions (press feedback) and AA-contrast, 44px touch targets throughout.',
    ],
  },
  {
    version: '0.0.2',
    date: '2026-06-18',
    items: [
      'Drag a card from anywhere on its body; a dedicated edit icon opens the detail drawer.',
      'Added a Clear board action to reset the board to an empty state.',
      'Atomic, transactional task reorder plus faster single-task hydration on the API.',
      'Granular activity events for assignee and label changes.',
      'Unit + component tests, two-user RLS isolation checks, CI, and a root error boundary.',
    ],
  },
  {
    version: '0.0.1',
    date: '2026-06-18',
    items: [
      'Added mobile status navigation and compact stats so every lane is discoverable at phone width.',
      'Added repeatable browser smoke coverage for create, edit, comment, filter, and drag/drop workflows.',
      'Refined drag/drop animation with long-press card activation, immediate handle drag, and stable overlay sizing.',
      'Added active filter chips, manual sync status, inline column task capture, and richer activity details.',
      'Improved task and workspace dialogs with focus handling, Escape close, and clearer keyboard states.',
      'Added this in-app changelog behind the version number.',
    ],
  },
];
const DROP_ANIMATION: DropAnimation = {
  duration: 230,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0',
      },
    },
  }),
};
const CARD_BODY_DRAG_DISTANCE_PX = 6;
const CARD_LONG_PRESS_DELAY_MS = 2500;
const MOUSE_LONG_PRESS_TOLERANCE_PX = 24;
const TOUCH_LONG_PRESS_TOLERANCE_PX = 8;
const BOARD_COLLISION_DETECTION: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
};
const socialProviders = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
] satisfies Array<{ id: OAuthProvider; label: string }>;
type AuthBusy = 'save' | 'link' | 'signout' | `signin-${OAuthProvider}`;

function isDragHandleEvent({ event }: { event: Event }) {
  return event.target instanceof Element && Boolean(event.target.closest('[data-drag-handle="true"]'));
}

export function App() {
  const session = useAnonymousSession();
  const [filters, setFilters] = useState<BoardFilters>(defaultFilters);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('edit');
  const [initialStatus, setInitialStatus] = useState<TaskStatus>('todo');
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>('todo');
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const queryClient = useQueryClient();
  const sessionReady = session.status === 'ready' && Boolean(session.userId);

  const boardQuery = useBoardData(session.userId, filters, sessionReady);
  const statsQuery = useBoardStats(session.userId, sessionReady);
  const mutations = useTaskMutations();
  const board = boardQuery.data;
  const stats = statsQuery.data;
  const tasks = board?.tasks ?? EMPTY_TASKS;
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const syncing = boardQuery.isFetching || statsQuery.isFetching || mutations.reorderTasks.isPending;
  const lastSyncedAt = Math.max(boardQuery.dataUpdatedAt || 0, statsQuery.dataUpdatedAt || 0);
  const canClear = tasks.length > 0 || (board?.teamMembers.length ?? 0) > 0 || (board?.labels.length ?? 0) > 0;

  const sensors = useSensors(
    // Mouse: drag from the body on movement, or hold still for long-press activation.
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: CARD_BODY_DRAG_DISTANCE_PX,
        delay: CARD_LONG_PRESS_DELAY_MS,
        tolerance: MOUSE_LONG_PRESS_TOLERANCE_PX,
      },
      bypassActivationConstraint: isDragHandleEvent,
    }),
    // Touch: require an intentional long press so taps and vertical scrolling remain stable.
    useSensor(TouchSensor, {
      activationConstraint: { delay: CARD_LONG_PRESS_DELAY_MS, tolerance: TOUCH_LONG_PRESS_TOLERANCE_PX },
      bypassActivationConstraint: isDragHandleEvent,
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => groupTasks(tasks), [tasks]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSelectedTaskId(null);
      setActiveTaskId(null);
      setDrawerMode('edit');
      setManagerOpen(false);
    });

    return () => {
      active = false;
    };
  }, [session.userId]);

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

  async function quickCreateTask(status: TaskStatus, title: string) {
    try {
      await mutations.createTask.mutateAsync({
        title,
        description: '',
        status,
        priority: 'normal',
        due_date: null,
        assignee_ids: [],
        label_ids: [],
      });
      setMobileStatus(status);
      notify('success', 'Task created');
    } catch (error) {
      notify('error', readableError(error));
      throw error;
    }
  }

  async function refreshBoard() {
    try {
      await Promise.all([boardQuery.refetch(), statsQuery.refetch()]);
      notify('success', 'Board refreshed');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function clearBoard() {
    const confirmed = await confirmAction({
      title: 'Clear the board?',
      message:
        'This permanently removes all tasks, comments, activity, team members, and labels, returning you to an empty board. This cannot be undone.',
      confirmLabel: 'Clear board',
    });
    if (!confirmed) return;

    try {
      await mutations.resetBoard.mutateAsync();
      setFilters(defaultFilters);
      setSelectedTaskId(null);
      setManagerOpen(false);
      setMobileStatus('todo');
      notify('success', 'Board cleared');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function applyReorder(updates: Array<{ id: string; status: TaskStatus; position: number }>) {
    const previous = board;
    if (previous) {
      queryClient.setQueryData<BoardPayload>(boardQueryKey(session.userId, filters), {
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
      if (previous) queryClient.setQueryData(boardQueryKey(session.userId, filters), previous);
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
        onRefresh={() => void refreshBoard()}
        syncing={syncing}
        lastSyncedAt={lastSyncedAt}
      />

      <main className="app-main">
        <StatsStrip stats={stats} loading={statsQuery.isLoading} />
        <ActiveFilterBar
          filters={filters}
          setFilters={setFilters}
          labels={board?.labels ?? []}
          members={board?.teamMembers ?? []}
          resultCount={tasks.length}
          totalCount={stats?.total ?? tasks.length}
        />
        <MobileStatusNav active={mobileStatus} grouped={grouped} onChange={setMobileStatus} />

        {boardQuery.isError ? (
          <FatalState title="Board could not load" message={readableError(boardQuery.error)} onRetry={() => void refreshBoard()} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={BOARD_COLLISION_DETECTION} onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                  onQuickCreate={quickCreateTask}
                  onOpen={openEdit}
                  onMove={moveTask}
                  mobileActive={mobileStatus === status.id}
                />
              ))}
            </section>
            <DragOverlay adjustScale={false} dropAnimation={DROP_ANIMATION}>
              {activeTask ? <TaskCard task={activeTask} overlay onOpen={() => undefined} /> : null}
            </DragOverlay>
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

      <AppFooter
        version={APP_VERSION}
        onOpenChangelog={() => setChangelogOpen(true)}
        canClear={canClear}
        clearing={mutations.resetBoard.isPending}
        onClear={() => void clearBoard()}
      />

      <TaskDrawer
        open={drawerMode === 'create' || Boolean(selectedTask)}
        mode={drawerMode}
        initialStatus={initialStatus}
        userId={session.userId}
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
      <ChangelogDialog open={changelogOpen} entries={CHANGELOG} onClose={() => setChangelogOpen(false)} />

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
  onRefresh,
  syncing,
  lastSyncedAt,
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
  onRefresh: () => void;
  syncing: boolean;
  lastSyncedAt: number;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
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
    setFiltersOpen(false);
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
        <button
          className="icon-button text-button"
          onClick={() => {
            setFiltersOpen(false);
            onManage();
          }}
          type="button"
          title="Team and labels"
        >
          <Users size={16} />
          Team & labels
        </button>
        <button
          className="icon-button text-button save-board-button"
          onClick={() => {
            setFiltersOpen(false);
            setAccountOpen(true);
            setEmailOpen(true);
          }}
          type="button"
          title="Save board"
        >
          <ShieldCheck size={16} />
          {session.isAnonymous ? 'Save board' : 'Saved'}
        </button>
        <button
          className="icon-button sync-button"
          onClick={toggleTheme}
          type="button"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          className="icon-button sync-button"
          onClick={() => {
            setFiltersOpen(false);
            onRefresh();
          }}
          type="button"
          title="Refresh board"
          aria-label="Refresh board"
        >
          <RefreshCw className={syncing ? 'spin' : undefined} size={16} />
        </button>
        <button
          className="primary-button"
          onClick={() => {
            setFiltersOpen(false);
            onCreate();
          }}
          type="button"
          title="New task"
        >
          <Plus size={17} />
          New task
        </button>
        <span className="sync-status" title={lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : 'Waiting for first sync'}>
          {syncing ? 'Syncing' : lastSyncedAt ? 'Synced' : 'Ready'}
        </span>
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
                <strong>{session.isAnonymous ? 'Guest board' : 'Signed-in account'}</strong>
                <span>{session.email || 'Sign in to recover this board anywhere.'}</span>
              </div>
            </div>
            <div className="account-actions">
              {session.isAnonymous ? (
                <>
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
                </>
              ) : (
                <p className="account-message success">Work is saving to this signed-in account.</p>
              )}
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

function ActiveFilterBar({
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

function MobileStatusNav({
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
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [memberEdits, setMemberEdits] = useState<Record<string, { name: string; color: string }>>({});
  const [labelEdits, setLabelEdits] = useState<Record<string, { name: string; color: string }>>({});
  const mutations = useTaskMutations();
  const memberInputRef = useRef<HTMLInputElement | null>(null);

  useDialogFocus(open, onClose, memberInputRef);

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

  function startMemberEdit(member: TeamMember) {
    setEditingMemberId(member.id);
    setMemberEdits((current) => ({ ...current, [member.id]: { name: member.name, color: member.color } }));
  }

  function startLabelEdit(label: Label) {
    setEditingLabelId(label.id);
    setLabelEdits((current) => ({ ...current, [label.id]: { name: label.name, color: label.color } }));
  }

  async function saveMember(member: TeamMember) {
    const edit = memberEdits[member.id];
    if (!edit?.name.trim()) return;
    try {
      await mutations.updateTeamMember.mutateAsync({ id: member.id, input: { name: edit.name.trim(), color: edit.color } });
      setEditingMemberId(null);
      notify('success', 'Team member saved');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function saveLabel(label: Label) {
    const edit = labelEdits[label.id];
    if (!edit?.name.trim()) return;
    try {
      await mutations.updateLabel.mutateAsync({ id: label.id, input: { name: edit.name.trim(), color: edit.color } });
      setEditingLabelId(null);
      notify('success', 'Label saved');
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
            className="manager-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-panel-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="drawer-header">
              <div>
                <span className="drawer-kicker">Workspace setup</span>
                <h2 id="manager-panel-title">Team & labels</h2>
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
                  <input ref={memberInputRef} value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Add member" />
                  <button className="icon-button" onClick={() => void addMember()} type="button" aria-label="Add team member">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="manager-list">
                  {(board?.teamMembers ?? []).map((member) => (
                    <div className="manager-row" key={member.id}>
                      <Avatar member={member} />
                      {editingMemberId === member.id ? (
                        <div className="manager-edit-fields">
                          <input
                            value={memberEdits[member.id]?.name ?? member.name}
                            onChange={(event) =>
                              setMemberEdits((current) => ({
                                ...current,
                                [member.id]: { name: event.target.value, color: current[member.id]?.color ?? member.color },
                              }))
                            }
                            aria-label={`Edit ${member.name} name`}
                          />
                          <input
                            type="color"
                            value={memberEdits[member.id]?.color ?? member.color}
                            onChange={(event) =>
                              setMemberEdits((current) => ({
                                ...current,
                                [member.id]: { name: current[member.id]?.name ?? member.name, color: event.target.value },
                              }))
                            }
                            aria-label={`Edit ${member.name} color`}
                          />
                        </div>
                      ) : (
                        <span>{member.name}</span>
                      )}
                      {editingMemberId === member.id ? (
                        <button className="mini-button" onClick={() => void saveMember(member)} type="button" aria-label={`Save ${member.name}`}>
                          <Save size={13} />
                        </button>
                      ) : (
                        <button className="mini-button" onClick={() => startMemberEdit(member)} type="button" aria-label={`Edit ${member.name}`}>
                          <Pencil size={13} />
                        </button>
                      )}
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
                      {editingLabelId === label.id ? (
                        <div className="manager-edit-fields">
                          <input
                            value={labelEdits[label.id]?.name ?? label.name}
                            onChange={(event) =>
                              setLabelEdits((current) => ({
                                ...current,
                                [label.id]: { name: event.target.value, color: current[label.id]?.color ?? label.color },
                              }))
                            }
                            aria-label={`Edit ${label.name} name`}
                          />
                          <input
                            type="color"
                            value={labelEdits[label.id]?.color ?? label.color}
                            onChange={(event) =>
                              setLabelEdits((current) => ({
                                ...current,
                                [label.id]: { name: current[label.id]?.name ?? label.name, color: event.target.value },
                              }))
                            }
                            aria-label={`Edit ${label.name} color`}
                          />
                        </div>
                      ) : (
                        <span>{label.name}</span>
                      )}
                      {editingLabelId === label.id ? (
                        <button className="mini-button" onClick={() => void saveLabel(label)} type="button" aria-label={`Save ${label.name}`}>
                          <Save size={13} />
                        </button>
                      ) : (
                        <button className="mini-button" onClick={() => startLabelEdit(label)} type="button" aria-label={`Edit ${label.name}`}>
                          <Pencil size={13} />
                        </button>
                      )}
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

function AppFooter({
  version,
  onOpenChangelog,
  canClear,
  clearing,
  onClear,
}: {
  version: string;
  onOpenChangelog: () => void;
  canClear: boolean;
  clearing: boolean;
  onClear: () => void;
}) {
  return (
    <footer className="app-footer">
      {canClear ? (
        <button className="footer-clear" onClick={onClear} type="button" disabled={clearing}>
          {clearing ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
          Clear board
        </button>
      ) : null}
      <button className="version-button" onClick={onOpenChangelog} type="button" aria-haspopup="dialog">
        v{version}
      </button>
    </footer>
  );
}

function ChangelogDialog({
  open,
  entries,
  onClose,
}: {
  open: boolean;
  entries: ChangelogEntry[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useDialogFocus(open, onClose, closeRef);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div className="confirm-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.section
            className="changelog-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="changelog-title"
            initial={{ opacity: 0, x: '-50%', y: 'calc(-50% + 14px)', scale: 0.98 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: 'calc(-50% + 12px)', scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="changelog-header">
              <div>
                <span className="drawer-kicker">Changelog</span>
                <h2 id="changelog-title">Next Task updates</h2>
              </div>
              <button ref={closeRef} className="icon-button" onClick={onClose} type="button" aria-label="Close changelog">
                <X size={18} />
              </button>
            </div>
            <div className="changelog-list">
              {entries.map((entry) => (
                <article className="changelog-entry" key={entry.version}>
                  <div>
                    <strong>v{entry.version}</strong>
                    <span>{entry.date}</span>
                  </div>
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
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

function FatalState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <section className="fatal-state">
      <AlertCircle size={28} />
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry ? (
        <button className="primary-button" onClick={onRetry} type="button">
          <RefreshCw size={16} />
          Retry
        </button>
      ) : null}
    </section>
  );
}
