import { describe, expect, it, vi } from 'vitest';

import { ApiHttpError, getUuidParam, handleApiError, parseJsonBody } from './http.js';
import type { VercelRequest, VercelResponse } from './vercel.js';

function request(body: unknown): VercelRequest {
  return { method: 'POST', headers: {}, query: {}, body, socket: {} };
}

function response() {
  const result = { statusCode: 0, body: undefined as unknown };
  const res: VercelResponse = {
    status(code) {
      result.statusCode = code;
      return res;
    },
    json(body) {
      result.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
    end() {
      return res;
    },
  };
  return { res, result };
}

describe('parseJsonBody', () => {
  it('parses JSON strings and reports malformed JSON as a client error', () => {
    expect(parseJsonBody(request('{"title":"Ship"}'))).toEqual({ title: 'Ship' });
    expect(() => parseJsonBody(request('{broken'))).toThrowError(
      expect.objectContaining({ code: 'bad_request', status: 400 }),
    );
  });
});

describe('handleApiError', () => {
  it('keeps safe client messages but does not expose database details for 5xx errors', () => {
    const badRequest = response();
    handleApiError(badRequest.res, new ApiHttpError('bad_request', 'Title is required', 400));
    expect(badRequest.result).toEqual({
      statusCode: 400,
      body: { error: { code: 'bad_request', message: 'Title is required' } },
    });

    const serverError = response();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    handleApiError(serverError.res, new ApiHttpError('server_error', 'relation secret_table does not exist', 500));
    expect(serverError.result).toEqual({
      statusCode: 500,
      body: { error: { code: 'server_error', message: 'Something went wrong. Please try again.' } },
    });
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });

  it('maps safe database conditions without exposing database details', () => {
    const duplicate = response();
    handleApiError(duplicate.res, { code: '23505', message: 'duplicate key violates private_constraint_name' });
    expect(duplicate.result).toEqual({
      statusCode: 409,
      body: { error: { code: 'conflict', message: 'A record with that value already exists.' } },
    });

    const missing = response();
    handleApiError(missing.res, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
    expect(missing.result).toEqual({
      statusCode: 404,
      body: { error: { code: 'not_found', message: 'The requested record was not found.' } },
    });

    const invalid = response();
    handleApiError(invalid.res, { code: '23514', message: 'violates hidden check constraint' });
    expect(invalid.result).toEqual({
      statusCode: 400,
      body: { error: { code: 'bad_request', message: 'The request contains an invalid value.' } },
    });
  });
});

describe('getUuidParam', () => {
  it('accepts UUID path parameters and rejects missing or malformed values as client errors', () => {
    const valid = '123e4567-e89b-42d3-a456-426614174000';
    expect(getUuidParam({ ...request(undefined), query: { id: valid } }, 'id', 'Task id')).toBe(valid);
    expect(() => getUuidParam(request(undefined), 'id', 'Task id')).toThrowError(
      expect.objectContaining({ code: 'bad_request', status: 400, message: 'Task id is required' }),
    );
    expect(() =>
      getUuidParam({ ...request(undefined), query: { id: 'not-a-uuid' } }, 'id', 'Task id'),
    ).toThrowError(expect.objectContaining({ code: 'bad_request', status: 400 }));
  });
});
