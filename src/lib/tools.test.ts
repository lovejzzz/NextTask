import { describe, expect, it } from 'vitest';

import { isToolListRequest, parseToolDefinition, parseToolDefinitionDetailed, parseToolInvocation, validateSteps } from './tools';

describe('parseToolDefinition', () => {
  it('builds a tool from a "create … that A then B" command', () => {
    const tool = parseToolDefinition('create a tool called morning that clear overdue then plan my day');
    expect(tool?.name).toBe('morning');
    expect(tool?.steps).toEqual(['clear overdue', 'plan my day']);
  });

  it('keeps only steps that parse to a real intent', () => {
    const tool = parseToolDefinition('make a routine called reset that clear overdue and sing a song and what is overdue');
    expect(tool?.steps).toEqual(['clear overdue', 'what is overdue']); // "sing a song" dropped
  });

  it('returns null without a name or any valid step', () => {
    expect(parseToolDefinition('create a tool called x that flibber the wuzzle')).toBeNull();
    expect(parseToolDefinition('what is overdue')).toBeNull();
  });
});

describe('parseToolDefinitionDetailed (reports skipped steps, never silently drops)', () => {
  it('separates the steps it understood from the ones it could not', () => {
    const draft = parseToolDefinitionDetailed('make a tool called nonsense that frobnicate the widgets then plan my day');
    expect(draft?.steps).toEqual(['plan my day']);
    expect(draft?.skipped).toEqual(['frobnicate the widgets']);
  });

  it('reports no skips when every step is understood', () => {
    expect(parseToolDefinitionDetailed('create a tool called morning that clear overdue then plan my day')?.skipped).toEqual([]);
  });
});

describe('parseToolInvocation', () => {
  const names = ['morning', 'deep work'];
  it('matches a saved tool by name', () => {
    expect(parseToolInvocation('run morning', names)).toBe('morning');
    expect(parseToolInvocation('do my deep work routine', names)).toBe('deep work');
  });
  it('returns null for non-invocations or unknown tools', () => {
    expect(parseToolInvocation("what's next", names)).toBeNull();
    expect(parseToolInvocation('run nonsense', names)).toBeNull();
  });
});

describe('isToolListRequest', () => {
  it('recognizes requests to see saved tools', () => {
    expect(isToolListRequest('what tools do you have')).toBe(true);
    expect(isToolListRequest('list my routines')).toBe(true);
    expect(isToolListRequest("what's next")).toBe(false);
  });
});

describe('validateSteps', () => {
  it('drops blanks and unparseable steps', () => {
    expect(validateSteps(['clear overdue', '  ', 'xyzzy'])).toEqual(['clear overdue']);
  });
});
