/**
 * "Give the board a brain" — an optional, in-browser LLM that makes the
 * companion's voice generative instead of canned.
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
export type BrainContext = {
  active: number;
  overdue: number;
  inProgress: number;
  shippedToday: number;
  titles: string[];
};
export type GenerateFn = (messages: BrainMessage[]) => Promise<string>;
type ProgressCb = (ratio: number) => void;

/**
 * Build the chat prompt. Pure + tested: the persona lives here, and short
 * output is enforced so the line fits the speech bubble.
 */
export function buildBrainMessages(mood: Mood, context: BrainContext): BrainMessage[] {
  const titles = context.titles.slice(0, 3).filter(Boolean);
  const system =
    'You ARE the user\'s kanban board, speaking in first person. You have a personality: ' +
    'witty, a little sassy, secretly caring about whether they finish their work. ' +
    'Reply with exactly ONE short sentence (max 16 words). No quotes, no preamble, no emoji. ' +
    `Your current mood is "${mood}" — let it color the line.`;
  const facts = [
    `${context.active} active task(s)`,
    `${context.overdue} overdue`,
    `${context.inProgress} in progress`,
    `${context.shippedToday} shipped today`,
  ].join(', ');
  const sample = titles.length ? ` A few tasks: ${titles.map((t) => `"${t}"`).join(', ')}.` : '';
  const user = `Here's my state right now: ${facts}.${sample} Say one in-character line about it.`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/** Trim model output down to a single clean sentence/line for the bubble. */
export function cleanLine(raw: string): string {
  let line = raw.trim().replace(/^["'`]+|["'`]+$/g, '');
  const firstBreak = line.indexOf('\n');
  if (firstBreak !== -1) line = line.slice(0, firstBreak).trim();
  if (line.length > 160) line = `${line.slice(0, 157).trimEnd()}…`;
  return line;
}

let pipelinePromise: Promise<GenerateFn> | null = null;

/**
 * Lazily fetch Transformers.js from the CDN and warm up the model. Returns a
 * generate function. Cached so repeated calls share one pipeline.
 */
export async function loadBrain(onProgress?: ProgressCb): Promise<GenerateFn> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const url = TRANSFORMERS_CDN; // variable specifier → not bundled by Vite
    const mod: any = await import(/* @vite-ignore */ url);
    const pipeline = mod.pipeline as (task: string, model: string, opts: unknown) => Promise<unknown>;

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

    return async (messages: BrainMessage[]) => {
      const output = await generator(messages, {
        max_new_tokens: 44,
        temperature: 0.9,
        top_p: 0.95,
        do_sample: true,
        repetition_penalty: 1.2,
        return_full_text: false,
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
