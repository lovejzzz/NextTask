import type { VercelRequest } from './vercel.js';

export const BOUNTY_CHECK_PATH = '/api/x402/bounty-check';
export const PUBLIC_APP_ORIGIN = 'https://nexttask.team';
export const BOUNTY_CHECK_URL = `${PUBLIC_APP_ORIGIN}${BOUNTY_CHECK_PATH}`;

export function isBountyCheckRequest(req: Pick<VercelRequest, 'query' | 'url'>) {
  const pathname = req.url?.split(/[?#]/, 1)[0];
  return req.query.mode === 'bounty-check' || pathname === BOUNTY_CHECK_PATH;
}
