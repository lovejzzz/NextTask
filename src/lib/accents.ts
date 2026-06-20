/**
 * Experimental accent themes. Cycling re-skins the lab's signature color
 * (buttons, gradients, highlights). "Indigo" is the product default and simply
 * defers to the stock CSS variables; the others apply fixed overrides.
 */
export type Accent = {
  id: string;
  label: string;
  accent: string;
  accent2: string;
};

export const ACCENTS: Accent[] = [
  { id: 'indigo', label: 'Indigo', accent: '#6366f1', accent2: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald', accent: '#10b981', accent2: '#14b8a6' },
  { id: 'rose', label: 'Rose', accent: '#f43f5e', accent2: '#fb7185' },
  { id: 'amber', label: 'Amber', accent: '#f59e0b', accent2: '#f97316' },
  { id: 'sky', label: 'Sky', accent: '#0ea5e9', accent2: '#38bdf8' },
];

export const DEFAULT_ACCENT_ID = ACCENTS[0].id;

export function accentById(id: string): Accent {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}

export function nextAccentId(currentId: string): string {
  const index = ACCENTS.findIndex((accent) => accent.id === currentId);
  return ACCENTS[(index + 1) % ACCENTS.length].id;
}
