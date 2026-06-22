/**
 * Tools the board can compose for itself. A "tool" (a.k.a. macro / routine) is a
 * named, ordered sequence of existing commands — so the companion can solve
 * multi-step problems and the user (or the AI) can mint NEW tools by combining
 * vetted primitives, without any code generation. Each step must parse to a real
 * intent, so a tool can only ever do things the board already knows how to do.
 */
import { parseIntent } from './companionActions';

export type Tool = { name: string; steps: string[] };

const STEP_SPLIT = /\s*(?:,|;|\bthen\b|\band then\b|\band\b)\s*/i;

/** Steps the board actually understands (drops anything that doesn't parse). */
export function validateSteps(rawSteps: string[]): string[] {
  return rawSteps.map((s) => s.trim()).filter((s) => s.length > 0 && parseIntent(s) !== null);
}

/** A parsed tool plus the steps he couldn't understand (so he can say so, not drop silently). */
export type ToolDraft = { name: string; steps: string[]; skipped: string[] };

const TOOL_DEF_RE =
  /^(?:create|make|define|save|new)\s+(?:a\s+)?(?:tool|macro|routine|workflow|command)\s+(?:called\s+|named\s+)?["']?([\w][\w -]*?)["']?\s*(?:that|:|->|=|which)\s+(.+)$/i;

/** Parse a tool definition, keeping the valid steps *and* reporting the dropped ones. */
export function parseToolDefinitionDetailed(text: string): ToolDraft | null {
  const match = text.trim().match(TOOL_DEF_RE);
  if (!match) return null;
  const name = match[1].trim();
  const raw = match[2]
    .split(STEP_SPLIT)
    .map((step) => step.trim())
    .filter((step) => step.length > 0);
  const steps: string[] = [];
  const skipped: string[] = [];
  for (const step of raw) (parseIntent(step) ? steps : skipped).push(step);
  if (!name || !steps.length) return null;
  return { name, steps, skipped };
}

/** Parse "create a tool called X that A then B" → a Tool, or null. */
export function parseToolDefinition(text: string): Tool | null {
  const draft = parseToolDefinitionDetailed(text);
  return draft ? { name: draft.name, steps: draft.steps } : null;
}

/** Parse "run X" / "do my X" → the matching tool name from `names`, or null. */
export function parseToolInvocation(text: string, names: string[]): string | null {
  const match = text
    .trim()
    .match(/^(?:run|do|execute|start|trigger|use)\s+(?:my\s+|the\s+)?["']?(.+?)["']?(?:\s+(?:routine|macro|tool|workflow))?$/i);
  if (!match) return null;
  const candidate = match[1].trim().toLowerCase();
  if (!candidate) return null;
  return (
    names.find((n) => n.toLowerCase() === candidate) ??
    names.find((n) => candidate.includes(n.toLowerCase())) ??
    null
  );
}

/** Is the user asking to see their tools? */
export function isToolListRequest(text: string): boolean {
  return /\b(my (?:tools|macros|routines|workflows)|list (?:tools|macros|routines)|what tools|show (?:me )?(?:my )?(?:tools|macros|routines))\b/i.test(
    text,
  );
}
