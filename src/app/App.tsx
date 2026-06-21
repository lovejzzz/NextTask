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
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Command,
  Filter,
  FlaskConical,
  Drama,
  Github,
  KanbanSquare,
  Keyboard,
  Sparkles,
  LogOut,
  Loader2,
  Mail,
  Moon,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sun,
  Tag,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  pendingOAuthFlowKey,
  pendingOAuthProviderKey,
  useAnonymousSession,
  type OAuthProvider,
  type SessionRecovery,
} from '../hooks/useAnonymousSession';
import { boardQueryKey, useBoardData, useBoardStats } from '../hooks/useBoardData';
import { useAccent } from '../hooks/useAccent';
import { useBoardBrain } from '../hooks/useBoardBrain';
import { useCompanion } from '../hooks/useCompanion';
import { useCompanionMemory } from '../hooks/useCompanionMemory';
import { useCommandHistory } from '../hooks/useCommandHistory';
import { useCompanionNotes } from '../hooks/useCompanionNotes';
import { useTools } from '../hooks/useTools';
import { useExperimentalMode } from '../hooks/useExperimentalMode';
import { useMomentum } from '../hooks/useMomentum';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { useTheme } from '../hooks/useTheme';
import { groupTasks, reorderForDrop } from '../lib/boardLogic';
import { PRIORITIES, STATUSES } from '../lib/constants';
import type { Mood } from '../lib/companion';
import { buildAmbientMessages, buildChatMessages, recommendUpgrade, type ChatTurn } from '../lib/companionBrain';
import { parseIntent } from '../lib/companionActions';
import { detectBlocked, pickBiggestRisk, pickDropCandidates, pickNextActionable, pickQuickWin, pickQuickWins } from '../lib/companionAdvice';
import { acceptExplanation, repliesDiverge, runBrainEval } from '../lib/brainEval';
import { isToolListRequest, parseToolDefinition, parseToolInvocation, type Tool } from '../lib/tools';
import { generateProposals, type Proposal } from '../lib/proposals';
import { detectRepeatedSequence, suggestSkillContinuation, suggestSkillName } from '../lib/skills';
import { COMPANION_NAME } from '../lib/companion';
import { classifyIntent } from '../lib/intentFallback';
import {
  AUTOPILOT_PREFIX,
  LOOP_NAME,
  diagnoseFromSelfTest,
  ouroborosTasks,
  proposeImprovements,
  stripOuroborosPrefix,
} from '../lib/autopilot';
import { eventLine, type CompanionEvent } from '../lib/companionEvents';
import { summarizeMemory } from '../lib/companionMemory';
import { formatNotes } from '../lib/companionNotes';
import { DEFAULT_GOAL, GOAL_OPTIONS, goalProgress, nextGoal, type Goal } from '../lib/goal';
import { dueTone } from '../lib/dates';
import { focusReason, nextStatusFor, rankFocusTasks } from '../lib/experimental';
import { matchNamed, matchTask } from '../lib/taskMatch';
import { nextRoast, personaInstruction, warmthFromMemory, type RoastLevel } from '../lib/persona';
import { activeFilterChips, defaultFilters, hasActiveFilters } from '../lib/filterLogic';
import { computeInsights } from '../lib/insights';
import { buildStandup } from '../lib/standup';
import { BoardCompanion } from '../components/experimental/BoardCompanion';
import { BoardInsights } from '../components/experimental/BoardInsights';
import { BoardyDesk } from '../components/experimental/BoardyDesk';
import { CommandPalette, type Command as PaletteCommand } from '../components/experimental/CommandPalette';
import { Confetti } from '../components/experimental/Confetti';
import { FocusSpotlight } from '../components/experimental/FocusSpotlight';
import { ShortcutsHelp } from '../components/experimental/ShortcutsHelp';
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
  const experimental = useExperimentalMode();
  const accent = useAccent(experimental.enabled);
  const { theme, toggle: toggleTheme } = useTheme();
  const momentum = useMomentum();
  const [confettiBurst, setConfettiBurst] = useState<number | null>(null);
  const [companionFlash, setCompanionFlash] = useState<{ text: string; nonce: number }>({ text: '', nonce: 0 });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [boardyDeskOpen, setBoardyDeskOpen] = useState(false);
  const [dismissedProposals, setDismissedProposals] = useState<Set<string>>(() => new Set());
  const experience = useCommandHistory();
  const [goal, setGoal] = useState<number>(() => {
    try {
      const value = Number(window.localStorage.getItem('next-task:goal'));
      return (GOAL_OPTIONS as readonly number[]).includes(value) ? value : DEFAULT_GOAL;
    } catch {
      return DEFAULT_GOAL;
    }
  });
  const [roast, setRoast] = useState<RoastLevel>(() => {
    try {
      const stored = window.localStorage.getItem('next-task:roast');
      return stored === 'gentle' || stored === 'savage' || stored === 'balanced' ? stored : 'balanced';
    } catch {
      return 'balanced';
    }
  });
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
  const insights = useMemo(() => computeInsights(tasks), [tasks]);
  const companion = useCompanion(
    {
      active: insights.active,
      overdue: insights.overdue,
      inProgress: insights.byStatus.in_progress,
      shippedToday: momentum.shippedToday,
    },
    experimental.enabled,
    roast,
  );
  const brain = useBoardBrain(experimental.enabled);
  const memory = useCompanionMemory(experimental.enabled);
  const companionNotes = useCompanionNotes();
  const toolbox = useTools();
  const companionContext = useMemo(
    () => ({
      active: insights.active,
      overdue: insights.overdue,
      inProgress: insights.byStatus.in_progress,
      shippedToday: momentum.shippedToday,
      titles: tasks
        .filter((task) => task.status !== 'done')
        .slice(0, 5)
        .map((task) => task.title),
      blocked: detectBlocked(tasks)
        .slice(0, 3)
        .map((task) => task.title),
    }),
    [insights, momentum.shippedToday, tasks],
  );
  const { run: brainRun } = brain;
  const memorySummary = useMemo(() => summarizeMemory(memory.memory), [memory.memory]);
  const personaText = useMemo(() => personaInstruction(roast, warmthFromMemory(memory.memory)), [roast, memory.memory]);
  const notesText = useMemo(() => formatNotes(companionNotes.notes), [companionNotes.notes]);
  const generateAmbient = useCallback(
    (mood: Mood) =>
      brainRun(
        buildAmbientMessages({ mood, context: companionContext, memory: memorySummary, persona: personaText, notes: notesText }),
      ),
    [brainRun, companionContext, memorySummary, personaText, notesText],
  );

  // Let the model phrase a grounded one-liner about a task, but only if it passes
  // the quality gate (grounded · concise · in character); else the deterministic line.
  async function gatedWhy(task: Task, question: string, fallback: string): Promise<string> {
    if (brain.status !== 'ready') return fallback;
    const reply = await brainRun(
      buildChatMessages({
        mood: companion.mood,
        context: companionContext,
        memory: memorySummary,
        persona: personaText,
        notes: notesText,
        history: [{ role: 'user', content: question }],
      }),
    );
    return reply && acceptExplanation(reply, task) ? reply : fallback;
  }

  // Run a composed tool: execute each step through the same chat pipeline.
  async function runSteps(steps: string[]): Promise<string> {
    const results: string[] = [];
    for (const step of steps) {
      const result = await chatWithBoard([{ role: 'user', content: step }], () => {});
      results.push(`• ${result ?? '…'}`);
    }
    return results.join('\n');
  }

  async function runTool(tool: Tool): Promise<string> {
    return `Ran "${tool.name}" (${tool.steps.length} step${tool.steps.length === 1 ? '' : 's'}):\n${await runSteps(tool.steps)}`;
  }

  // Chat handler: tools, then deterministic actions/answers (reliable, no model
  // needed), then fall through to the LLM for open conversation.
  async function chatWithBoard(history: ChatTurn[], onToken: (chunk: string) => void): Promise<string | null> {
    const text = history[history.length - 1]?.content ?? '';

    // Tool composition + multi-step execution (checked first so "create a tool…"
    // isn't mistaken for "create a task").
    const newTool = parseToolDefinition(text);
    if (newTool) {
      toolbox.add(newTool);
      companion.registerActivity();
      return `New tool "${newTool.name}" — ${newTool.steps.length} step${newTool.steps.length === 1 ? '' : 's'}: ${newTool.steps.join(' → ')}. Say "run ${newTool.name}" anytime.`;
    }
    const toRun = parseToolInvocation(text, toolbox.names);
    if (toRun) {
      const tool = toolbox.get(toRun);
      if (tool) return runTool(tool);
    }
    if (isToolListRequest(text)) {
      return toolbox.tools.length
        ? `My tools:\n${toolbox.tools.map((t) => `• ${t.name}: ${t.steps.join(' → ')}`).join('\n')}`
        : 'No tools yet. Make one: "create a tool called morning that clear overdue then plan my day".';
    }

    let intent = parseIntent(text);

    // Rules missed but the brain is on → let the model classify, restricted to
    // safe parameter-less queries (never destructive actions).
    if (!intent && brain.status === 'ready') {
      const kind = await classifyIntent((messages) => brainRun(messages), text);
      if (kind) intent = { kind };
    }

    // Remember recognized commands so Boardy can learn repeated patterns into skills.
    if (intent) experience.record(text);

    if (intent?.kind === 'create_task') {
      try {
        const created = await mutations.createTask.mutateAsync({
          title: intent.title,
          description: '',
          status: 'todo',
          priority: intent.priority,
          due_date: intent.due_date,
          assignee_ids: [],
          label_ids: [],
        });
        companion.registerActivity();
        fireCompanionEvent('created');
        setUndo(`add "${intent.title}"`, () => mutations.deleteTask.mutateAsync(created.id).then(() => undefined));
        const extras = [
          intent.priority === 'high' ? 'high priority' : intent.priority === 'low' ? 'low priority' : null,
          intent.due_date ? `due ${intent.due_date}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        return `Done — added "${intent.title}"${extras ? ` (${extras})` : ''}. Now go do it before it becomes another overdue regret.`;
      } catch {
        return 'I reached for that one and dropped it. Try again?';
      }
    }

    if (intent?.kind === 'complete_task') {
      const task = matchTask(tasks, intent.query);
      if (!task) return `I can't find a task like "${intent.query}". Be more specific?`;
      if (task.status === 'done') return `"${task.title}" is already done. We did that. Together.`;
      const prevStatus = task.status;
      companion.registerActivity();
      void moveTask(task.id, 'done'); // celebrates + tallies via registerShipIfDone
      setUndo(`complete "${task.title}"`, () =>
        mutations.updateTask.mutateAsync({ id: task.id, input: { status: prevStatus } }).then(() => undefined),
      );
      return `Marking "${task.title}" done. Chef's kiss.`;
    }

    if (intent?.kind === 'delete_task') {
      const task = matchTask(tasks, intent.query);
      if (!task) return `Can't find "${intent.query}" to delete.`;
      try {
        await mutations.deleteTask.mutateAsync(task.id);
        companion.registerActivity();
        setUndo(`delete "${task.title}"`, () =>
          mutations.createTask
            .mutateAsync({
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
              assignee_ids: task.assignees.map((member) => member.id),
              label_ids: task.labels.map((label) => label.id),
            })
            .then(() => undefined),
        );
        return `Deleted "${task.title}". Gone. Poof. (Say "undo" if that was a mistake.)`;
      } catch {
        return 'I tried to delete it and the universe said no.';
      }
    }

    if (intent?.kind === 'set_priority') {
      const task = matchTask(tasks, intent.query);
      if (!task) return `Can't find "${intent.query}".`;
      const prevPriority = task.priority;
      try {
        await mutations.updateTask.mutateAsync({ id: task.id, input: { priority: intent.priority } });
        companion.registerActivity();
        setUndo(`reprioritize "${task.title}"`, () =>
          mutations.updateTask.mutateAsync({ id: task.id, input: { priority: prevPriority } }).then(() => undefined),
        );
        return `"${task.title}" is now ${intent.priority} priority.`;
      } catch {
        return 'Could not change that. Try again?';
      }
    }

    if (intent?.kind === 'reschedule') {
      const task = matchTask(tasks, intent.query);
      if (!task) return `Can't find "${intent.query}".`;
      const prevDue = task.due_date;
      try {
        await mutations.updateTask.mutateAsync({ id: task.id, input: { due_date: intent.due_date } });
        companion.registerActivity();
        setUndo(`reschedule "${task.title}"`, () =>
          mutations.updateTask.mutateAsync({ id: task.id, input: { due_date: prevDue } }).then(() => undefined),
        );
        return `Moved "${task.title}" to ${intent.due_date}. Don't blow it this time.`;
      } catch {
        return 'Reschedule failed. Rude, I know.';
      }
    }

    if (intent?.kind === 'assign_task') {
      const task = matchTask(tasks, intent.query);
      if (!task) return `Can't find "${intent.query}".`;
      const member = matchNamed(board?.teamMembers ?? [], intent.assignee);
      if (!member) return `No teammate named "${intent.assignee}" — add them in Manage first.`;
      const prev = task.assignees.map((person) => person.id);
      if (prev.includes(member.id)) return `"${task.title}" is already on ${member.name}.`;
      try {
        await mutations.updateTask.mutateAsync({ id: task.id, input: { assignee_ids: [...prev, member.id] } });
        companion.registerActivity();
        setUndo(`assign "${task.title}"`, () =>
          mutations.updateTask.mutateAsync({ id: task.id, input: { assignee_ids: prev } }).then(() => undefined),
        );
        return `Assigned "${task.title}" to ${member.name}. It's their problem now too.`;
      } catch {
        return 'Assignment failed. Try again?';
      }
    }

    if (intent?.kind === 'label_task') {
      const task = matchTask(tasks, intent.query);
      if (!task) return `Can't find "${intent.query}".`;
      const label = matchNamed(board?.labels ?? [], intent.label);
      if (!label) return `No label called "${intent.label}" — make it in Manage first.`;
      const prev = task.labels.map((entry) => entry.id);
      if (prev.includes(label.id)) return `"${task.title}" already has the ${label.name} label.`;
      try {
        await mutations.updateTask.mutateAsync({ id: task.id, input: { label_ids: [...prev, label.id] } });
        companion.registerActivity();
        setUndo(`label "${task.title}"`, () =>
          mutations.updateTask.mutateAsync({ id: task.id, input: { label_ids: prev } }).then(() => undefined),
        );
        return `Tagged "${task.title}" with ${label.name}.`;
      } catch {
        return 'Labeling failed. Try again?';
      }
    }

    if (intent?.kind === 'complete_overdue') {
      const overdueTasks = tasks.filter((task) => dueTone(task) === 'overdue');
      if (!overdueTasks.length) return 'No overdue tasks. Nothing to clear. Smug, but earned.';
      const snapshot = overdueTasks.map((task) => ({ id: task.id, status: task.status }));
      try {
        await Promise.all(
          overdueTasks.map((task) => mutations.updateTask.mutateAsync({ id: task.id, input: { status: 'done' } })),
        );
        companion.registerActivity();
        overdueTasks.forEach(() => {
          momentum.recordShip();
          memory.recordShip();
        });
        setConfettiBurst(Date.now());
        fireCompanionEvent('milestone');
        setUndo(`clear ${overdueTasks.length} overdue`, () =>
          Promise.all(
            snapshot.map((entry) => mutations.updateTask.mutateAsync({ id: entry.id, input: { status: entry.status } })),
          ).then(() => undefined),
        );
        return `Cleared ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}. Bulldozer mode.`;
      } catch {
        return 'I choked on the overdue pile. Try again?';
      }
    }

    if (intent?.kind === 'remember') {
      companionNotes.addNote(intent.note);
      companion.registerActivity();
      return `Got it — I'll remember: ${intent.note}.`;
    }

    if (intent?.kind === 'recall') {
      if (!companionNotes.notes.length) return "You haven't told me anything to remember yet. I'm an open notebook.";
      const lines = companionNotes.notes.map((note) => `- ${note.text}`).join('\n');
      return `Here's what I'm holding onto:\n${lines}`;
    }

    if (intent?.kind === 'undo') {
      const undo = undoRef.current;
      if (!undo) return 'Nothing to undo. Clean conscience.';
      undoRef.current = null;
      try {
        await undo.run();
        companion.registerActivity();
        return `Undone: ${undo.label}.`;
      } catch {
        return "Undo failed — some things can't be taken back.";
      }
    }

    if (intent?.kind === 'plan') {
      const blockedIds = new Set(detectBlocked(tasks).map((task) => task.id));
      const ranked = rankFocusTasks(tasks)
        .filter((task) => !blockedIds.has(task.id))
        .slice(0, 5);
      if (!ranked.length) return "Nothing actionable to plan — your board's empty (or all blocked). Living the dream.";
      const lines = ranked.map((task, index) => `${index + 1}. ${task.title} (${focusReason(task).toLowerCase()})`);
      const blockedNote = blockedIds.size ? `\n(Skipped ${blockedIds.size} blocked — unstick those separately.)` : '';
      return `Here's the play, in order:\n${lines.join('\n')}${blockedNote}\nStart at #1 — I'll be watching.`;
    }

    if (intent?.kind === 'quick_plan') {
      const wins = pickQuickWins(tasks, 2);
      if (!wins.length) return 'Nothing quick to grab right now. Maybe just breathe for a sec.';
      const lines = wins.map((task, index) => `${index + 1}. ${task.title}`).join('\n');
      return `Short on time? Hit these, in order:\n${lines}\nIgnore everything else for now.`;
    }

    if (intent?.kind === 'triage') {
      const drops = pickDropCandidates(tasks);
      if (!drops.length) return "Nothing to drop — your board's already lean. Respect.";
      const list = drops.map((task) => `"${task.title}"`).join(', ');
      return `If something has to give, drop or defer: ${list}. They're the least load-bearing.`;
    }

    if (intent?.kind === 'quick_win') {
      const win = pickQuickWin(tasks);
      if (!win) return 'Nothing to knock out. Add something first.';
      return gatedWhy(
        win,
        `In one short sentence, why is "${win.title}" a quick win? Only mention that task.`,
        `Quick win: "${win.title}" — it's closest to done. Knock it out and feel powerful.`,
      );
    }

    if (intent?.kind === 'risk') {
      const risk = pickBiggestRisk(tasks);
      if (!risk) return 'No risks on the board. Suspiciously calm.';
      return gatedWhy(
        risk,
        `In one short sentence, why is "${risk.title}" my biggest risk right now? Only mention that task.`,
        `Biggest risk: "${risk.title}" — ${focusReason(risk).toLowerCase()}. Handle it before it handles you.`,
      );
    }

    if (intent?.kind === 'blocked') {
      const blocked = detectBlocked(tasks);
      if (!blocked.length) return "Nothing's blocked. So whatever's not moving — that's on you.";
      return `Blocked or waiting: ${blocked.map((task) => `"${task.title}"`).join(', ')}. Go unstick those.`;
    }

    if (intent?.kind === 'ouroboros_backlog') {
      const mine = ouroborosTasks(tasks).filter((task) => task.status !== 'done');
      if (!mine.length) return `Nothing queued for myself yet. Run "${LOOP_NAME}: file its own upgrade tickets" and I'll draft some.`;
      const list = mine
        .slice(0, 6)
        .map((task) => `- ${stripOuroborosPrefix(task.title)}`)
        .join('\n');
      return `My own upgrade queue (${mine.length}):\n${list}`;
    }

    if (intent?.kind === 'whats_next') {
      const top = pickNextActionable(tasks);
      if (top) {
        return gatedWhy(
          top,
          `In one short sentence, why should I do "${top.title}" next? Only mention that task.`,
          `Next: "${top.title}" — ${focusReason(top).toLowerCase()}. Stop reading, start doing.`,
        );
      }
      // Nothing actionable — don't send you at a wall; name the blocker instead.
      const blocked = detectBlocked(tasks);
      if (blocked.length) return `Everything pressing is blocked — e.g. "${blocked[0].title}". Unstick that before anything else.`;
      return "Your board's empty. I'm bored. Give me something.";
    }

    if (intent?.kind === 'overdue') {
      const late = tasks.filter((task) => dueTone(task) === 'overdue');
      if (!late.length) return 'Nothing overdue. Look at you, being responsible.';
      const list = late
        .slice(0, 4)
        .map((task) => `"${task.title}"`)
        .join(', ');
      return `${late.length} overdue: ${list}${late.length > 4 ? '…' : ''}. They're not aging like wine.`;
    }

    if (intent?.kind === 'status') {
      const mem = memory.memory;
      return `Today: ${momentum.shippedToday} shipped. All-time: ${mem.totalShipped}. Streak: ${mem.currentStreak} day(s) (best ${mem.bestStreak}). ${momentum.shippedToday > 0 ? 'Keep it rolling.' : 'The day is young.'}`;
    }

    return brainRun(
      buildChatMessages({
        mood: companion.mood,
        context: companionContext,
        memory: memorySummary,
        persona: personaText,
        notes: notesText,
        history,
      }),
      onToken,
    );
  }

  function flashCompanion(text: string) {
    setCompanionFlash((prev) => ({ text, nonce: prev.nonce + 1 }));
  }

  // One-level undo for chat actions: each action records how to reverse itself.
  function setUndo(label: string, run: () => Promise<void>) {
    undoRef.current = { label, run };
  }

  function fireCompanionEvent(kind: CompanionEvent) {
    flashCompanion(eventLine(kind, Date.now()));
  }

  function cycleGoal() {
    const next: Goal = nextGoal(goal);
    setGoal(next);
    try {
      window.localStorage.setItem('next-task:goal', String(next));
    } catch {
      // ignore storage failures
    }
    notify('success', `Daily ship goal: ${next}.`);
  }

  async function runBrainSelfTest() {
    notify('success', 'Running brain self-test…');
    const generate = async (text: string) =>
      (await brainRun(
        buildChatMessages({
          mood: companion.mood,
          context: companionContext,
          memory: memorySummary,
          persona: personaText,
          notes: notesText,
          history: [{ role: 'user', content: text }],
        }),
      )) ?? '';
    const { score, max, weakest } = await runBrainEval(generate, tasks);

    // Prove the persona dial moves the model: same prompt, gentle vs savage.
    const warmth = warmthFromMemory(memory.memory);
    const askWith = (level: RoastLevel) => (text: string) =>
      brainRun(
        buildChatMessages({
          mood: companion.mood,
          context: companionContext,
          memory: memorySummary,
          persona: personaInstruction(level, warmth),
          notes: notesText,
          history: [{ role: 'user', content: text }],
        }),
      );
    const [gentle, savage] = await Promise.all([askWith('gentle')('what should I focus on?'), askWith('savage')('what should I focus on?')]);
    const personaWorks = repliesDiverge(gentle ?? '', savage ?? '');

    notify(
      score >= max * 0.75 ? 'success' : 'error',
      `Brain self-test: ${score}/${max} on grounding · concision · character · persona shift: ${personaWorks ? 'yes' : 'no'}.`,
    );
    // Ouroboros closes on itself: a weak score (or a flat persona) files its own fix ticket.
    const diagnosis = diagnoseFromSelfTest(score, max, weakest, personaWorks);
    if (diagnosis) {
      try {
        const task = await mutations.createTask.mutateAsync({
          title: `${AUTOPILOT_PREFIX}${diagnosis.title}`,
          description: diagnosis.description,
          status: 'todo',
          priority: diagnosis.priority,
          due_date: null,
          assignee_ids: [],
          label_ids: [],
        });
        setUndo(`file ${LOOP_NAME} self-fix ticket`, () => mutations.deleteTask.mutateAsync(task.id).then(() => undefined));
        flashCompanion(`${LOOP_NAME}: self-test ${score}/${max} — I filed a ticket to fix my weakest spot. Re-run it after.`);
      } catch {
        // ignore — the score toast already landed
      }
    }
    // Recommend a sharper model when this one underperforms.
    const upgrade = recommendUpgrade(brain.model, score, max);
    if (upgrade) {
      notify('success', `Want sharper replies? Try the ${upgrade.label} model — ⌘K → "Brain model".`);
    }
  }

  // Boardy's Desk: what Boardy wants right now, for the human to accept/dismiss.
  const boardyProposals = useMemo<Proposal[]>(() => {
    const overdue = tasks.filter((task) => dueTone(task) === 'overdue').length;
    const ideas = proposeImprovements(0, 2, tasks.map((task) => task.title));
    // A learned pattern Boardy could save as a skill — unless he already has it.
    const repeated = detectRepeatedSequence(experience.history);
    const learned =
      repeated && !toolbox.tools.some((tool) => tool.steps.join('|').toLowerCase() === repeated.join('|').toLowerCase())
        ? repeated
        : null;
    const continuation = suggestSkillContinuation(experience.history.at(-1) ?? '', toolbox.tools);
    return generateProposals({ overdue, ideas, learned, continuation }).filter((proposal) => !dismissedProposals.has(proposal.id));
  }, [tasks, dismissedProposals, experience.history, toolbox.tools]);

  async function acceptProposal(proposal: Proposal) {
    if (proposal.kind === 'clear_overdue') {
      await chatWithBoard([{ role: 'user', content: 'clear overdue' }], () => {});
    } else if (proposal.kind === 'run_skill') {
      await runSteps(proposal.steps);
      companion.registerActivity();
      notify('success', `${COMPANION_NAME} finished the "${proposal.name}" routine. We're efficient.`);
      return;
    } else if (proposal.kind === 'save_skill') {
      const name = suggestSkillName(proposal.steps);
      toolbox.add({ name, steps: proposal.steps });
      companion.registerActivity();
      notify('success', `${COMPANION_NAME} learned a skill: "${name}". Say "run ${name}".`);
      return;
    } else {
      await mutations.createTask.mutateAsync({
        title: `${AUTOPILOT_PREFIX}${proposal.idea.title}`,
        description: proposal.idea.description,
        status: 'todo',
        priority: proposal.idea.priority,
        due_date: null,
        assignee_ids: [],
        label_ids: [],
      });
      companion.registerActivity();
    }
    notify('success', `${COMPANION_NAME}: done. We make a good team.`);
  }

  function dismissProposal(id: string) {
    setDismissedProposals((current) => new Set(current).add(id));
  }

  function cyclePersona() {
    const next = nextRoast(roast);
    setRoast(next);
    try {
      window.localStorage.setItem('next-task:roast', next);
    } catch {
      // ignore storage failures
    }
    notify('success', `Board personality: ${next}.`);
  }

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

  useEffect(() => {
    if (!experimental.enabled) return;
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const node = event.target as HTMLElement | null;
        if (node && (node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName))) return;
        event.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [experimental.enabled]);

  useEffect(() => {
    if (!experimental.lastToggle) return;
    notify(
      'success',
      experimental.lastToggle === 'on'
        ? '🧪 Experimental mode unlocked — Focus Spotlight live. Press ⌘K for the command palette.'
        : 'Experimental mode off. Back to the stable board.',
    );
    experimental.acknowledgeToggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimental.lastToggle]);

  useEffect(() => {
    if (brain.status === 'error') {
      notify('error', 'Couldn’t load the board’s brain (needs a modern browser) — keeping its sharp tongue.');
    }
  }, [brain.status]);

  const undoRef = useRef<{ label: string; run: () => Promise<void> } | null>(null);

  // Welcome the user back when they return to the lab after time away.
  const welcomedRef = useRef(false);
  useEffect(() => {
    if (!experimental.enabled || welcomedRef.current) return;
    welcomedRef.current = true;
    const days = memory.awayDaysAtLoad;
    if (days >= 1) {
      queueMicrotask(() =>
        flashCompanion(`You're back — it's been ${days} day${days === 1 ? '' : 's'}. I kept your tasks warm.`),
      );
    } else if (memory.memory.currentStreak >= 2 && momentum.shippedToday === 0) {
      // Proactive: a live streak hasn't been fed yet today.
      queueMicrotask(() => flashCompanion(eventLine('streak_risk', Date.now())));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimental.enabled]);

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

    registerShipIfDone(active, targetStatus);
    await applyReorder(updates);
  }

  async function moveTask(taskId: string, targetStatus: TaskStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === targetStatus) return;
    if (experimental.enabled) companion.registerActivity();
    registerShipIfDone(task, targetStatus);

    const updates = reorderForDrop(tasks, task, targetStatus);
    if (!updates.length) return;

    await applyReorder(updates);
  }

  // Celebrate + tally any transition into Done, however it happened (drag, mobile
  // move, or the spotlight). Experimental-only, so normal mode is unchanged.
  function registerShipIfDone(task: Task, targetStatus: TaskStatus) {
    if (!experimental.enabled || targetStatus !== 'done' || task.status === 'done') return;
    const newCount = momentum.shippedToday + 1;
    momentum.recordShip();
    memory.recordShip();
    setConfettiBurst(Date.now());
    const kind: CompanionEvent =
      newCount === goal
        ? 'goal'
        : goal >= 2 && newCount === goal - 1
          ? 'almost'
          : newCount === 3
            ? 'milestone'
            : 'shipped';
    fireCompanionEvent(kind);
  }

  function advanceFromSpotlight(taskId: string, targetStatus: TaskStatus) {
    void moveTask(taskId, targetStatus);
  }

  async function copyStandup() {
    const text = buildStandup(tasks);
    try {
      await navigator.clipboard.writeText(text);
      notify('success', 'Standup copied to clipboard.');
    } catch {
      notify('error', 'Could not access the clipboard.');
    }
  }

  async function quickCreateTask(status: TaskStatus, title: string) {
    companion.registerActivity();
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
      if (experimental.enabled) fireCompanionEvent('created');
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

  const paletteCommands: PaletteCommand[] = [
    { id: 'new-task', label: 'New task', hint: 'To Do', keywords: 'create add', icon: Plus, run: () => openCreate('todo') },
    {
      id: 'open-next',
      label: 'Open next task',
      keywords: 'focus spotlight',
      icon: Sparkles,
      run: () => {
        const top = rankFocusTasks(tasks)[0];
        if (top) openEdit(top.id);
        else notify('success', 'Nothing left to focus on.');
      },
    },
    {
      id: 'advance-next',
      label: 'Move next task forward',
      keywords: 'advance progress',
      icon: ArrowRight,
      run: () => {
        const top = rankFocusTasks(tasks)[0];
        const target = top ? nextStatusFor(top.status) : null;
        if (top && target) advanceFromSpotlight(top.id, target);
      },
    },
    { id: 'copy-standup', label: 'Copy standup', keywords: 'clipboard summary', icon: ClipboardList, run: () => void copyStandup() },
    { id: 'insights', label: 'Board insights', keywords: 'stats analytics metrics', icon: BarChart3, run: () => setInsightsOpen(true) },
    { id: 'refresh', label: 'Refresh board', keywords: 'reload sync', icon: RefreshCw, run: () => void refreshBoard() },
    { id: 'accent', label: 'Cycle accent theme', keywords: 'color palette skin', icon: Palette, run: () => { companion.registerFidget(); notify('success', `Accent → ${accent.cycle()}`); } },
    { id: 'theme', label: 'Toggle light / dark', keywords: 'theme dark mode', icon: theme === 'dark' ? Sun : Moon, run: () => { companion.registerFidget(); toggleTheme(); } },
    { id: 'shortcuts', label: 'Keyboard shortcuts', keywords: 'help keys cheat sheet', icon: Keyboard, run: () => setShortcutsOpen(true) },
    { id: 'persona', label: `Board personality: ${roast}`, keywords: 'roast tone gentle savage personality', icon: Drama, run: cyclePersona },
    { id: 'goal', label: `Daily ship goal: ${goal}`, keywords: 'goal target daily ships quota', icon: Target, run: cycleGoal },
    { id: 'boardy-desk', label: `🤖 Open ${COMPANION_NAME}'s Desk`, keywords: 'boardy desk proposals wants collaborate accept ai peer upgrades', icon: Bot, run: () => setBoardyDeskOpen(true) },
    ...(brain.status !== 'off'
      ? [
          {
            id: 'brain-model',
            label: `Brain model: ${brain.modelName}`,
            keywords: 'llm model size qwen smarter switch',
            icon: BrainCircuit,
            run: () => notify('success', `Brain model → ${brain.cycleModel()} (reloading if active)`),
          } satisfies PaletteCommand,
        ]
      : []),
    ...(brain.status === 'ready'
      ? [
          {
            id: 'brain-selftest',
            label: 'Run brain self-test',
            keywords: 'evaluate score quality grounding test',
            icon: BrainCircuit,
            run: () => void runBrainSelfTest(),
          } satisfies PaletteCommand,
        ]
      : []),
    brain.status === 'ready' || brain.status === 'loading'
      ? {
          id: 'brain-off',
          label: 'Quiet the board’s mind',
          keywords: 'llm ai brain disable off',
          icon: BrainCircuit,
          run: () => {
            brain.disable();
            notify('success', 'The board’s brain is off — back to its sharp tongue.');
          },
        }
      : {
          id: 'brain-on',
          label: 'Give the board a brain (beta)',
          keywords: 'llm ai brain on local model download',
          icon: BrainCircuit,
          run: () => {
            notify('success', 'Downloading a tiny LLM (runs on your device, no API). First load takes a bit…');
            void brain.enable();
          },
        },
    { id: 'manage', label: 'Manage team & labels', keywords: 'members tags', icon: Users, run: () => setManagerOpen(true) },
    { id: 'changelog', label: "What's new", keywords: 'changelog updates', icon: Command, run: () => setChangelogOpen(true) },
    { id: 'exit-lab', label: 'Exit experimental mode', keywords: 'disable lab off', icon: FlaskConical, run: experimental.disable },
  ];

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
        experimental={experimental.enabled}
        onLogoTap={experimental.registerLogoTap}
        theme={theme}
        onToggleTheme={toggleTheme}
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
        {experimental.enabled ? (
          <FocusSpotlight
            key="focus-spotlight"
            tasks={tasks}
            loading={boardQuery.isLoading}
            shippedToday={momentum.shippedToday}
            week={momentum.week}
            weekTotal={momentum.weekTotal}
            onOpen={openEdit}
            onAdvance={advanceFromSpotlight}
            onFocusComplete={(taskId) => {
              setConfettiBurst(Date.now());
              const task = tasks.find((item) => item.id === taskId);
              notify('success', task ? `Focus session done: “${task.title}”. Nice deep work.` : 'Focus session complete!');
            }}
            onCopyStandup={() => void copyStandup()}
          />
        ) : null}
      </AnimatePresence>

      {confettiBurst ? <Confetti key={confettiBurst} onDone={() => setConfettiBurst(null)} /> : null}

      {experimental.enabled ? (
        <>
          <CommandPalette
            open={paletteOpen}
            commands={paletteCommands}
            onQuickCapture={(title) => void quickCreateTask('todo', title)}
            onClose={() => setPaletteOpen(false)}
          />
          <BoardInsights open={insightsOpen} insights={insights} onClose={() => setInsightsOpen(false)} />
          <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          <BoardCompanion
            mood={companion.mood}
            quip={companion.quip}
            onPoke={companion.poke}
            pokeNonce={companion.nonce}
            brainStatus={brain.status}
            brainProgress={brain.progress}
            generate={generateAmbient}
            chat={brain.status === 'ready' ? chatWithBoard : undefined}
            flash={companionFlash}
            goalProgress={goalProgress(momentum.shippedToday, goal)}
            goalMet={momentum.shippedToday >= goal}
          />
          <AnimatePresence>
            {boardyDeskOpen ? (
              <BoardyDesk
                proposals={boardyProposals}
                onAccept={(proposal) => void acceptProposal(proposal)}
                onDismiss={dismissProposal}
                onClose={() => setBoardyDeskOpen(false)}
              />
            ) : null}
          </AnimatePresence>
        </>
      ) : null}

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
  experimental,
  onLogoTap,
  theme,
  onToggleTheme,
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
  experimental: boolean;
  onLogoTap: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
        <button
          type="button"
          className={cx('brand-mark', experimental && 'is-experimental')}
          onClick={onLogoTap}
          aria-label="Next Task"
          title="Next Task"
        >
          <KanbanSquare size={20} />
        </button>
        <div>
          <div className="brand-title">
            Next Task
            {experimental ? (
              <span className="brand-lab-badge">
                <FlaskConical size={11} />
                Lab
              </span>
            ) : null}
          </div>
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
          onClick={onToggleTheme}
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

function AppFooter({
  version,
  onOpenChangelog,
  canClear,
  clearing,
  onClear,
  showSampleAction,
  loadingSample,
  onLoadSample,
  showClearFilters,
  onClearFilters,
}: {
  version: string;
  onOpenChangelog: () => void;
  canClear: boolean;
  clearing: boolean;
  onClear: () => void;
  showSampleAction: boolean;
  loadingSample: boolean;
  onLoadSample: () => void;
  showClearFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <footer className="app-footer">
      {canClear ? (
        <button className="footer-clear" onClick={onClear} type="button" disabled={clearing}>
          {clearing ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
          Clear board
        </button>
      ) : null}
      {showSampleAction ? (
        <button className="footer-text-button" onClick={onLoadSample} type="button" disabled={loadingSample}>
          {loadingSample ? 'Loading sample...' : 'Load sample board'}
        </button>
      ) : null}
      {showClearFilters ? (
        <button className="footer-text-button" onClick={onClearFilters} type="button">
          Clear filters
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
