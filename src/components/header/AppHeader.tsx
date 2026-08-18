import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Filter,
  Github,
  KanbanSquare,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';

import {
  pendingOAuthFlowKey,
  pendingOAuthProviderKey,
  type OAuthProvider,
  type SessionRecovery,
} from '../../hooks/useAnonymousSession';
import { useTheme } from '../../hooks/useTheme';
import { PRIORITIES, STATUSES } from '../../lib/constants';
import { defaultFilters } from '../../lib/filterLogic';
import type { BoardFilters, Label, TeamMember } from '../../lib/types';
import { cx, readableError } from '../../lib/utils';
import { Select } from '../shared/Select';

const socialProviders = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
] satisfies Array<{ id: OAuthProvider; label: string }>;
type AuthBusy = 'save' | 'link' | 'signout' | `signin-${OAuthProvider}`;

export function AppHeader({
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
  canEdit = true,
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
  canEdit?: boolean;
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
          disabled={!canEdit}
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
          disabled={!canEdit}
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
