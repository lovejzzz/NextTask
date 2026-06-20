import { describe, expect, it } from 'vitest';

import { filterCommands } from './commandPalette';

const COMMANDS = [
  { id: 'new', label: 'New task', keywords: 'create add' },
  { id: 'standup', label: 'Copy standup', keywords: 'clipboard summary' },
  { id: 'theme', label: 'Toggle theme' },
];

describe('filterCommands', () => {
  it('returns everything for an empty query', () => {
    expect(filterCommands(COMMANDS, '')).toHaveLength(3);
    expect(filterCommands(COMMANDS, '   ')).toHaveLength(3);
  });

  it('matches on the label, case-insensitively', () => {
    expect(filterCommands(COMMANDS, 'TASK').map((command) => command.id)).toEqual(['new']);
  });

  it('matches on keywords too', () => {
    expect(filterCommands(COMMANDS, 'clipboard').map((command) => command.id)).toEqual(['standup']);
  });

  it('returns nothing when there is no match', () => {
    expect(filterCommands(COMMANDS, 'zzz')).toEqual([]);
  });
});
