import { useEffect, useState } from 'react';

import { LOCAL_DEMO_ENABLED } from '../lib/constants';
import { supabase } from '../lib/supabaseClient';

type SessionState = {
  status: 'loading' | 'ready' | 'error';
  userId: string | null;
  error: string | null;
};

export function useAnonymousSession() {
  const [state, setState] = useState<SessionState>({ status: 'loading', userId: null, error: null });

  useEffect(() => {
    let mounted = true;

    async function ensureSession() {
      if (LOCAL_DEMO_ENABLED) {
        setState({ status: 'ready', userId: 'local-demo-user', error: null });
        return;
      }

      try {
        const { data: existing, error: existingError } = await supabase.auth.getSession();
        if (existingError) throw existingError;

        if (existing.session?.user) {
          if (mounted) setState({ status: 'ready', userId: existing.session.user.id, error: null });
          return;
        }

        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;

        if (mounted) {
          setState({ status: 'ready', userId: data.user?.id ?? null, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({
            status: 'error',
            userId: null,
            error: error instanceof Error ? error.message : 'Could not create guest session.',
          });
        }
      }
    }

    void ensureSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!LOCAL_DEMO_ENABLED && session?.user) {
        setState({ status: 'ready', userId: session.user.id, error: null });
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
