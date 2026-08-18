import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { ApiHttpError } from './http.js';
import { enforceIpWriteRateLimit, enforceUserWriteRateLimit } from './rateLimit.js';
import type { VercelRequest } from './vercel.js';

export type AuthedContext = {
  supabase: SupabaseClient;
  user: User;
};

export async function requireUser(req: VercelRequest): Promise<AuthedContext> {
  // Apply the network bucket before contacting Supabase Auth so invalid or
  // missing tokens cannot bypass write throttling and exhaust the auth service.
  enforceIpWriteRateLimit(req);

  const rawAuthHeader = req.headers.authorization;
  const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  if (!token) {
    throw new ApiHttpError('unauthorized', 'Missing authorization token', 401);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ApiHttpError('server_error', 'Supabase environment variables are not configured', 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      fetch: fetchWithClockSkewRetry,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiHttpError('unauthorized', 'Invalid or expired authorization token', 401);
  }

  enforceUserWriteRateLimit(req, data.user.id);

  return { supabase, user: data.user };
}

export async function fetchWithClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
  pause: (milliseconds: number) => Promise<void> = delay,
) {
  const retryInput = input instanceof Request ? input.clone() : input;
  const response = await fetcher(input, init);
  if (response.ok || !(await isFutureJwtResponse(response))) return response;

  // Supabase Auth and PostgREST can briefly disagree on wall clock immediately
  // after issuing an anonymous JWT. Authentication fails before a query runs,
  // so retrying this exact condition cannot duplicate a database mutation.
  await pause(1_000);
  return fetcher(retryInput, init);
}

async function isFutureJwtResponse(response: Response) {
  try {
    return (await response.clone().text()).toLowerCase().includes('jwt issued at future');
  } catch {
    return false;
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
