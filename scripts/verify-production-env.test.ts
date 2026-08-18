import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const baseEnvironment = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'browser-publishable-key',
  SUPABASE_URL: 'https://example.supabase.co/',
  SUPABASE_ANON_KEY: 'server-anon-key',
  VITE_ENABLE_LOCAL_DEMO: 'false',
  API_WRITE_LIMIT_PER_MINUTE: '45',
  API_IP_WRITE_LIMIT_PER_MINUTE: '120',
};

function verify(overrides: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, ['scripts/verify-production-env.mjs'], {
    cwd: root,
    env: { ...baseEnvironment, ...overrides },
    encoding: 'utf8',
  });
}

describe('verify-production-env', () => {
  it('accepts a consistent production configuration', () => {
    const result = verify();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).consistency).toEqual({ urlsMatch: true, publicKeysOnly: true });
  });

  it('rejects mismatched browser and server Supabase projects', () => {
    const result = verify({ SUPABASE_URL: 'https://other.supabase.co' });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).consistency.urlsMatch).toBe(false);
  });

  it('rejects non-integer production rate limits', () => {
    const result = verify({ API_WRITE_LIMIT_PER_MINUTE: '1.5' });
    expect(result.status).toBe(1);
  });

  it('rejects a privileged Supabase key', () => {
    const legacyServiceRole = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;

    for (const key of ['sb_secret_do-not-use-here', legacyServiceRole]) {
      const result = verify({ SUPABASE_ANON_KEY: key });
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout).consistency.publicKeysOnly).toBe(false);
    }
  });
});
