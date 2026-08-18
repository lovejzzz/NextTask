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
import { AlertCircle, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ActiveFilterBar, MobileStatusNav, StatsStrip } from '../components/dashboard/BoardSummary';
import { AppHeader } from '../components/header/AppHeader';
import { TeamLabelManager } from '../components/manager/TeamLabelManager';
import { AppFooter, ChangelogDialog, ConfirmDialog, FatalState, LoadingExperience } from '../components/shell/AppChrome';
import { BoardColumn } from '../components/board/BoardColumn';
import { TaskCard } from '../components/board/TaskCard';
import { TaskDrawer } from '../components/drawer/TaskDrawer';
import { useAnonymousSession } from '../hooks/useAnonymousSession';
import { boardQueryKey, useBoardData, useBoardStats } from '../hooks/useBoardData';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { groupTasks, reorderForDrop } from '../lib/boardLogic';
import { STATUSES } from '../lib/constants';
import { defaultFilters, hasActiveFilters } from '../lib/filterLogic';
import type { ConfirmOptions, ConfirmRequest, DrawerMode, Toast } from '../lib/uiTypes';
import type { BoardFilters, BoardPayload, Task, TaskStatus } from '../lib/types';
import { cx, readableError } from '../lib/utils';
import { APP_VERSION, CHANGELOG } from './changelog';

const EMPTY_TASKS: Task[] = [];
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

  async function loadSampleBoard() {
    try {
      await mutations.bootstrapDemo.mutateAsync();
      notify('success', 'Sample board loaded');
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

      </main>

      <AppFooter
        version={APP_VERSION}
        onOpenChangelog={() => setChangelogOpen(true)}
        canClear={canClear}
        clearing={mutations.resetBoard.isPending}
        onClear={() => void clearBoard()}
        showSampleAction={Boolean(board && tasks.length === 0 && !boardQuery.isLoading && !hasActiveFilters(filters))}
        loadingSample={mutations.bootstrapDemo.isPending}
        onLoadSample={() => void loadSampleBoard()}
        showClearFilters={Boolean(board && tasks.length === 0 && !boardQuery.isLoading && hasActiveFilters(filters))}
        onClearFilters={() => setFilters(defaultFilters)}
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
            role="status"
            aria-live="polite"
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
