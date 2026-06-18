import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  | 'too_many_requests'
  | 'server_error';

export function sendData<T>(res: VercelResponse, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function sendNoContent(res: VercelResponse) {
  return res.status(204).end();
}

export function sendError(res: VercelResponse, code: ApiErrorCode, message: string, status = 400) {
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
    return sendError(res, error.code, error.message, error.status);
  }

  console.error(error);
  return sendError(res, 'server_error', 'Something went wrong. Please try again.', 500);
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

export function parseJsonBody<T>(req: VercelRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') return JSON.parse(req.body) as T;
  return req.body as T;
}
