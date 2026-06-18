import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { ApiHttpError } from './http.js';
import { enforceWriteRateLimit } from './rateLimit.js';

export type AuthedContext = {
  supabase: SupabaseClient;
  user: User;
};

export async function requireUser(req: VercelRequest): Promise<AuthedContext> {
  const authHeader = req.headers.authorization;
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
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiHttpError('unauthorized', 'Invalid or expired authorization token', 401);
  }

  enforceWriteRateLimit(req, data.user.id);

  return { supabase, user: data.user };
}
