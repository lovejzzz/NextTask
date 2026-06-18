import { useEffect, useState } from 'react';
import type { Provider, User } from '@supabase/supabase-js';

import { LOCAL_DEMO_ENABLED } from '../lib/constants';
import { supabase } from '../lib/supabaseClient';

type SessionState = {
  status: 'loading' | 'ready' | 'error';
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  error: string | null;
};

export type SessionRecovery = {
  saveBoardToEmail: (email: string) => Promise<string>;
  sendSignInLink: (email: string) => Promise<string>;
  continueWithProvider: (provider: OAuthProvider) => Promise<string>;
  signOut: () => Promise<void>;
};

export type OAuthProvider = Extract<Provider, 'google' | 'github'>;

const localDemoMessage = 'Email recovery is disabled while local demo mode is enabled.';
const providerLabels: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
};

export function useAnonymousSession() {
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    userId: null,
    email: null,
    isAnonymous: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    function setReady(user: User) {
      setState({
        status: 'ready',
        userId: user.id,
        email: user.email ?? null,
        isAnonymous: user.is_anonymous ?? !user.email,
        error: null,
      });
    }

    async function ensureSession() {
      if (LOCAL_DEMO_ENABLED) {
        setState({
          status: 'ready',
          userId: 'local-demo-user',
          email: null,
          isAnonymous: true,
          error: null,
        });
        return;
      }

      try {
        const { data: existing, error: existingError } = await supabase.auth.getSession();
        if (existingError) throw existingError;

        if (existing.session?.user) {
          if (mounted) setReady(existing.session.user);
          return;
        }

        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;

        if (mounted && data.user) setReady(data.user);
      } catch (error) {
        if (mounted) {
          setState({
            status: 'error',
            userId: null,
            email: null,
            isAnonymous: true,
            error: error instanceof Error ? error.message : 'Could not create guest session.',
          });
        }
      }
    }

    void ensureSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!LOCAL_DEMO_ENABLED && session?.user) {
        setReady(session.user);
      } else if (!LOCAL_DEMO_ENABLED && mounted) {
        setState((current) => ({ ...current, status: 'loading' }));
        void ensureSession();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function saveBoardToEmail(email: string) {
    if (LOCAL_DEMO_ENABLED) throw new Error(localDemoMessage);

    const normalizedEmail = normalizeEmail(email);
    if (!state.isAnonymous && state.email?.toLowerCase() === normalizedEmail) {
      return 'This board is already recoverable with this email.';
    }

    const { data, error } = await supabase.auth.updateUser(
      { email: normalizedEmail },
      { emailRedirectTo: window.location.origin },
    );

    if (error) throw error;
    if (data.user) {
      setState({
        status: 'ready',
        userId: data.user.id,
        email: data.user.email ?? normalizedEmail,
        isAnonymous: data.user.is_anonymous ?? false,
        error: null,
      });
    }

    return 'Check your email to confirm recovery for this board.';
  }

  async function sendSignInLink(email: string) {
    if (LOCAL_DEMO_ENABLED) throw new Error(localDemoMessage);

    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });

    if (error) throw error;
    return 'Check your email for the sign-in link.';
  }

  async function continueWithProvider(provider: OAuthProvider) {
    if (LOCAL_DEMO_ENABLED) throw new Error(localDemoMessage);

    const redirectTo = window.location.origin;
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo,
      },
    });

    if (!linkError) return `Redirecting to ${providerLabels[provider]} to connect this board.`;
    if (!isManualLinkingDisabled(linkError)) throw linkError;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) throw error;
    return `Redirecting to ${providerLabels[provider]}.`;
  }

  async function signOut() {
    if (LOCAL_DEMO_ENABLED) return;
    setState((current) => ({ ...current, status: 'loading' }));
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  return {
    ...state,
    saveBoardToEmail,
    sendSignInLink,
    continueWithProvider,
    signOut,
  };
}

function isManualLinkingDisabled(error: { message?: string }) {
  return error.message?.toLowerCase().includes('manual linking is disabled') ?? false;
}

function normalizeEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!value || !value.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  return value;
}
