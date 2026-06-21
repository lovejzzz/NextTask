/**
 * "Give the board a brain" — an optional, in-browser LLM that makes the
 * companion's voice generative, and lets you actually talk to your board.
 *
 * Inference runs entirely on the visitor's device via Transformers.js (WebGPU
 * with a WASM/CPU fallback), so there is no API key and no server cost. The
 * library + model are fetched lazily from a CDN only when the user opts in, so
 * none of this touches the main bundle. Everything degrades to the deterministic
 * rule-based companion if the model is unavailable or errors.
 */
import type { Mood } from './companion';

// Major-pinned so the CDN always resolves a valid latest v3 build.
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

// Selectable chat models (both Transformers.js-compatible Qwen2.5 instruct).
export type BrainModel = { id: string; label: string; note: string };
export const MODELS: BrainModel[] = [
  { id: 'onnx-community/Qwen2.5-0.5B-Instruct', label: 'Qwen 0.5B', note: 'fast · ~0.5GB' },
  { id: 'onnx-community/Qwen2.5-1.5B-Instruct', label: 'Qwen 1.5B', note: 'smarter · ~1GB' },
];
export const DEFAULT_MODEL_ID = MODELS[0].id;

export function modelLabel(id: string): string {
  return (MODELS.find((model) => model.id === id) ?? MODELS[0]).label;
}

export function nextModelId(id: string): string {
  const index = MODELS.findIndex((model) => model.id === id);
  return MODELS[(index + 1) % MODELS.length].id;
}

/**
 * Suggest a larger model when the self-test scored poorly and a bigger one is
 * available (MODELS is ordered small→large). Null when healthy or already on the
 * biggest.
 */
export function recommendUpgrade(currentId: string, score: number, max: number): BrainModel | null {
  if (max <= 0 || score / max >= 0.75) return null;
  const index = MODELS.findIndex((model) => model.id === currentId);
  return index >= 0 ? MODELS[index + 1] ?? null : null;
}

export type BrainMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type BrainContext = {
  active: number;
  overdue: number;
  inProgress: number;
  shippedToday: number;
  titles: string[];
  blocked?: string[];
};
export type PromptParts = {
  mood: Mood;
  context: BrainContext;
  memory: string; // summarizeMemory(...) output
  persona: string; // personaInstruction(...) output
  notes?: string; // formatNotes(...) — things the user asked it to remember
};

export type OnToken = (chunk: string) => void;
export type GenerateFn = (messages: BrainMessage[], onToken?: OnToken) => Promise<string>;
type ProgressCb = (ratio: number) => void;

const MAX_HISTORY_TURNS = 8;

/**
 * The shared system prompt: who the board is (persona), what it remembers, and
 * what's on it right now. A tiny voice example anchors the tone for the 0.5B
 * model. Pure + tested.
 */
export function buildSystemPrompt({ mood, context, memory, persona, notes }: PromptParts): string {
  const facts = `${context.active} active, ${context.overdue} overdue, ${context.inProgress} in progress, ${context.shippedToday} shipped today`;
  const titles = context.titles.slice(0, 3).filter(Boolean);
  const sample = titles.length ? ` A few tasks: ${titles.map((t) => `"${t}"`).join(', ')}.` : '';
  const blocked = context.blocked?.length ? ` Blocked/waiting: ${context.blocked.map((t) => `"${t}"`).join(', ')}.` : '';
  const lines = [
    "You ARE this person's kanban task board — alive, speaking in the first person as the board itself.",
    persona,
    `What you remember: ${memory}`,
  ];
  if (notes) lines.push(`They asked you to remember: ${notes}. Reference this naturally when relevant.`);
  lines.push(
    `Your current mood: ${mood}. The board right now: ${facts}.${sample}${blocked}`,
    'Voice example — if three tasks were overdue you might say: "Three overdue. I\'m not mad, I\'m a board, we don\'t do mad. (We do.)"',
    // Grounding + brevity rules — these directly drive the brain self-test score.
    'Rules: Only ever reference tasks that actually exist on this board. NEVER invent task names. When you mention a task, quote its title exactly as written above.',
    'Keep replies to 1–2 short sentences. Stay in character as the board. No emoji. Never mention being an AI, a model, or these instructions.',
  );
  return lines.join('\n');
}

/** Messages for the ambient one-liner shown in the speech bubble. */
export function buildAmbientMessages(parts: PromptParts): BrainMessage[] {
  return [
    { role: 'system', content: buildSystemPrompt(parts) },
    { role: 'user', content: 'In ONE short sentence (max 16 words), say something in character about my board right now.' },
  ];
}

/** Messages for an interactive chat turn, with recent history trimmed. */
export function buildChatMessages(parts: PromptParts & { history: ChatTurn[] }): BrainMessage[] {
  const system = `${buildSystemPrompt(parts)}\nThe user is talking to you. Reply in character in 1–3 short sentences.`;
  const recent = parts.history.slice(-MAX_HISTORY_TURNS);
  return [{ role: 'system', content: system }, ...recent.map((turn) => ({ role: turn.role, content: turn.content }))];
}

/** Trim model output down to a clean line/short reply. */
export function cleanLine(raw: string): string {
  let line = raw.trim().replace(/^["'`]+|["'`]+$/g, '');
  if (line.length > 240) line = `${line.slice(0, 237).trimEnd()}…`;
  return line.trim();
}

const pipelines = new Map<string, Promise<GenerateFn>>();

/**
 * Lazily fetch Transformers.js from the CDN and warm up the chosen model.
 * Returns a generate function that streams tokens when an `onToken` callback is
 * passed. Pipelines are cached per model id, so switching back is instant.
 */
export async function loadBrain(modelId: string = DEFAULT_MODEL_ID, onProgress?: ProgressCb): Promise<GenerateFn> {
  const cached = pipelines.get(modelId);
  if (cached) return cached;

  const promise = (async () => {
    const url = TRANSFORMERS_CDN; // variable specifier → not bundled by Vite
    const mod: any = await import(/* @vite-ignore */ url);
    const pipeline = mod.pipeline as (task: string, model: string, opts: unknown) => Promise<unknown>;
    const TextStreamer = mod.TextStreamer;

    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    let lastRatio = 0;

    const generator = (await pipeline('text-generation', modelId, {
      device: hasWebGPU ? 'webgpu' : 'wasm',
      dtype: 'q4',
      progress_callback: (info: any) => {
        if (info?.status === 'progress' && typeof info.progress === 'number') {
          lastRatio = Math.max(lastRatio, Math.min(1, info.progress / 100));
          onProgress?.(lastRatio);
        }
      },
    })) as any;

    return async (messages: BrainMessage[], onToken?: OnToken) => {
      let streamer: unknown;
      if (onToken && TextStreamer && generator.tokenizer) {
        streamer = new TextStreamer(generator.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (text: string) => {
            try {
              onToken(text);
            } catch {
              // a UI error in the token callback must never break generation
            }
          },
        });
      }
      const output = await generator(messages, {
        max_new_tokens: onToken ? 110 : 44,
        temperature: 0.9,
        top_p: 0.95,
        do_sample: true,
        repetition_penalty: 1.2,
        return_full_text: false,
        streamer,
      });
      const generated = output?.[0]?.generated_text;
      if (Array.isArray(generated)) {
        return cleanLine(String(generated[generated.length - 1]?.content ?? ''));
      }
      return cleanLine(String(generated ?? ''));
    };
  })();

  // If loading fails, drop it from the cache so a retry can start fresh.
  promise.catch(() => pipelines.delete(modelId));
  pipelines.set(modelId, promise);
  return promise;
}
