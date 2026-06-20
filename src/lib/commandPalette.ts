/**
 * Pure filtering for the experimental Command Palette. Matches the typed query
 * against each command's label and optional keywords (case-insensitive,
 * substring). An empty query returns everything.
 */
export type CommandItem = {
  id: string;
  label: string;
  keywords?: string;
};

export function filterCommands<T extends CommandItem>(commands: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => `${command.label} ${command.keywords ?? ''}`.toLowerCase().includes(needle));
}
