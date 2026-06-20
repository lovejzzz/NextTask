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
// Tiny instruct model (~0.5GB q4): small enough to download, chat-tuned.
const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';

export type BrainMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type BrainContext = {
  active: number;
  overdue: number;
  inProgress: number;
  shippedToday: number;
  titles: string[];
};
export type PromptParts = {
  mood: Mood;
  context: BrainContext;
  memory: string; // summarizeMemory(...) output
  persona: string; // personaInstruction(...) output
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
export function buildSystemPrompt({ mood, context, memory, persona }: PromptParts): string {
  const facts = `${context.active} active, ${context.overdue} overdue, ${context.inProgress} in progress, ${context.shippedToday} shipped today`;
  const titles = context.titles.slice(0, 3).filter(Boolean);
  const sample = titles.length ? ` A few tasks: ${titles.map((t) => `"${t}"`).join(', ')}.` : '';
  return [
    "You ARE this person's kanban task board — alive, speaking in the first person as the board itself.",
    persona,
    `What you remember: ${memory}`,
    `Your current mood: ${mood}. The board right now: ${facts}.${sample}`,
    'Voice example — if three tasks were overdue you might say: "Three overdue. I\'m not mad, I\'m a board, we don\'t do mad. (We do.)"',
    'Stay in character as the board. Be concise and specific to their tasks. No emoji. Never mention being an AI or a model.',
  ].join('\n');
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

let pipelinePromise: Promise<GenerateFn> | null = null;

/**
 * Lazily fetch Transformers.js from the CDN and warm up the model. Returns a
 * generate function that streams tokens when an `onToken` callback is passed.
 */
export async function loadBrain(onProgress?: ProgressCb): Promise<GenerateFn> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const url = TRANSFORMERS_CDN; // variable specifier → not bundled by Vite
    const mod: any = await import(/* @vite-ignore */ url);
    const pipeline = mod.pipeline as (task: string, model: string, opts: unknown) => Promise<unknown>;
    const TextStreamer = mod.TextStreamer;

    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    let lastRatio = 0;

    const generator = (await pipeline('text-generation', MODEL_ID, {
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

  return pipelinePromise;
}
