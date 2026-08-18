import { z, ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from './vercel.js';

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  | 'too_many_requests'
  | 'server_error';

export function sendData<T>(res: VercelResponse, data: T, status = 200) {
  ensureRequestId(res);
  return res.status(status).json({ data });
}

export function sendNoContent(res: VercelResponse) {
  ensureRequestId(res);
  return res.status(204).end();
}

export function sendError(res: VercelResponse, code: ApiErrorCode, message: string, status = 400) {
  ensureRequestId(res);
  return res.status(status).json({ error: { code, message } });
}

export function methodNotAllowed(res: VercelResponse, method?: string) {
  return sendError(res, 'method_not_allowed', `${method ?? 'This method'} is not allowed`, 405);
}

export function handleApiError(res: VercelResponse, error: unknown) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'Invalid request body';
    return sendError(res, 'bad_request', message, 400);
  }

  if (error instanceof ApiHttpError) {
    if (error.status >= 500) {
      logServerError(res, error);
      return sendError(res, error.code, 'Something went wrong. Please try again.', error.status);
    }
    return sendError(res, error.code, error.message, error.status);
  }

  const databaseError = mapDatabaseError(error);
  if (databaseError) {
    return sendError(res, databaseError.code, databaseError.message, databaseError.status);
  }

  logServerError(res, error);
  return sendError(res, 'server_error', 'Something went wrong. Please try again.', 500);
}

const requestIds = new WeakMap<object, string>();

function ensureRequestId(res: VercelResponse) {
  let requestId = requestIds.get(res);
  if (!requestId) {
    requestId = randomUUID();
    requestIds.set(res, requestId);
    res.setHeader('X-Request-Id', requestId);
  }
  return requestId;
}

function logServerError(res: VercelResponse, error: unknown) {
  const safeError = error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: 'UnknownError', message: String(error) };
  console.error(JSON.stringify({
    event: 'api_server_error',
    request_id: ensureRequestId(res),
    ...safeError,
  }));
}

export class ApiHttpError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function getParam(req: VercelRequest, key: string) {
  const value = req.query[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getUuidParam(req: VercelRequest, key: string, label = 'Id') {
  const value = getParam(req, key);
  if (!value) throw new ApiHttpError('bad_request', `${label} is required`, 400);
  if (!z.string().uuid().safeParse(value).success) {
    throw new ApiHttpError('bad_request', `${label} must be a valid UUID`, 400);
  }
  return value;
}

export function parseJsonBody<T>(req: VercelRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      throw new ApiHttpError('bad_request', 'Request body must be valid JSON', 400);
    }
  }
  return req.body as T;
}

function mapDatabaseError(error: unknown): Pick<ApiHttpError, 'code' | 'message' | 'status'> | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  const code = String(error.code);

  if (code === 'PGRST116') return { code: 'not_found', message: 'The requested record was not found.', status: 404 };
  if (code === '23505') return { code: 'conflict', message: 'A record with that value already exists.', status: 409 };
  if (['22007', '22008', '22P02', '23503', '23514'].includes(code)) {
    return { code: 'bad_request', message: 'The request contains an invalid value.', status: 400 };
  }
  return null;
}
