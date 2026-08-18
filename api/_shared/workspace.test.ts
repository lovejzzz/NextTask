import { describe, expect, it } from 'vitest';

import { boardIdFromRequest } from './workspace.js';

const BOARD_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('boardIdFromRequest', () => {
  it('returns a valid selected board id', () => {
    expect(
      boardIdFromRequest({
        method: 'GET',
        url: '/api/tasks',
        headers: { 'x-nexttask-board-id': BOARD_ID },
        query: {},
        socket: {},
      }),
    ).toBe(BOARD_ID);
  });

  it('keeps old clients compatible when no board header is present', () => {
    expect(boardIdFromRequest({ method: 'GET', headers: {}, query: {}, socket: {} })).toBeNull();
  });

  it('rejects malformed board ids before querying data', () => {
    expect(() =>
      boardIdFromRequest({
        method: 'GET',
        headers: { 'x-nexttask-board-id': 'not-a-board' },
        query: {},
        socket: {},
      }),
    ).toThrowError(expect.objectContaining({ code: 'bad_request', status: 400 }));
  });
});
