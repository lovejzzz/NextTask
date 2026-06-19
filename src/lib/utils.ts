export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

const PALETTE = ['#7A5AF8', '#2E90FA', '#12B76A', '#F79009', '#E9354A'];

/** Deterministic palette color for a given index (wraps around the palette). */
export function randomColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
