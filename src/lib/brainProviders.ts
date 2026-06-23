/**
 * Tier 1 (BoardyV1) — a real brain. A pluggable model router.
 *
 * Until now Boardy's voice could only be the tiny in-browser model. This makes the
 * voice a *provider*: the same glass-box context can be answered by the local
 * Transformers.js model (private, offline, free) OR by any OpenAI-compatible endpoint
 * — a local server (Ollama, LM Studio) or a frontier API. The coded brain stays the
 * source of truth and every action still flows through the audited primitives; only
 * the *reasoning/voice* layer gets smarter. Intelligence scales on the trustworthy
 * spine, it doesn't replace it.
 *
 * The HTTP request/response shaping is pure and tested here; the network call is a
 * thin wrapper. The endpoint + key are provisioned by the user (an explicit opt-in
 * tier — it trades "runs entirely on your device" for a bigger brain, knowingly).
 */
import type { BrainMessage, GenerateFn, OnToken } from './companionBrain';

/** A remote, OpenAI-compatible reasoner — local server or frontier API. */
export type RemoteBrainConfig = {
  endpoint: string; // OpenAI-compatible base URL, e.g. http://localhost:11434/v1
  model: string; // remote model name, e.g. 'llama3.1:8b' or 'gpt-4o-mini'
  apiKey?: string; // optional bearer token (local servers usually need none)
  label?: string; // friendly name for the UI
};

const REMOTE_PREFIX = 'remote:'; // a model id of this form selects the remote provider

/** Encode a remote config as an opaque model id, so it rides the existing model slot. */
export function encodeRemoteId(config: RemoteBrainConfig): string {
  return REMOTE_PREFIX + JSON.stringify(config);
}

/** Decode a model id back to a remote config, or null if it's an in-browser model id. */
export function decodeRemoteId(modelId: string): RemoteBrainConfig | null {
  if (!modelId.startsWith(REMOTE_PREFIX)) return null;
  try {
    const config = JSON.parse(modelId.slice(REMOTE_PREFIX.length)) as RemoteBrainConfig;
    return config && typeof config.endpoint === 'string' && typeof config.model === 'string' ? config : null;
  } catch {
    return null;
  }
}

/** Is this model id a remote (Tier 1) provider rather than the in-browser model? */
export function isRemoteId(modelId: string): boolean {
  return modelId.startsWith(REMOTE_PREFIX);
}

/** The chat/completions URL for an OpenAI-compatible base endpoint (trailing slash safe). */
export function chatCompletionsUrl(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
}

/** Build the OpenAI-compatible request body — pure, so it's testable without a network. */
export function buildChatCompletionBody(
  messages: BrainMessage[],
  model: string,
  opts: { maxTokens?: number; temperature?: number; stream?: boolean } = {},
): Record<string, unknown> {
  return {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: opts.maxTokens ?? 256,
    temperature: opts.temperature ?? 0.7,
    stream: opts.stream ?? false,
  };
}

/** Extract the assistant text from an OpenAI-compatible response — pure and defensive. */
export function parseChatCompletion(json: unknown): string {
  const choice = (json as { choices?: Array<{ message?: { content?: unknown }; text?: unknown }> })?.choices?.[0];
  const content = choice?.message?.content ?? choice?.text;
  return typeof content === 'string' ? content : '';
}

/** Authorization headers for the call (bearer only when a key is supplied). */
export function authHeaders(apiKey?: string): Record<string, string> {
  return { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
}

/**
 * A {@link GenerateFn} backed by an OpenAI-compatible endpoint. Non-streaming for
 * robustness; when an `onToken` is given it emits the finished text once so the UI
 * path is unchanged. Throws on a failed request so the caller's guard falls back to
 * the deterministic voice — never a silent wrong answer.
 */
export function createRemoteGenerate(
  config: RemoteBrainConfig,
  fetchImpl: typeof fetch = fetch,
): GenerateFn {
  const url = chatCompletionsUrl(config.endpoint);
  return async (messages: BrainMessage[], onToken?: OnToken): Promise<string> => {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: authHeaders(config.apiKey),
      body: JSON.stringify(buildChatCompletionBody(messages, config.model, { stream: false })),
    });
    if (!res.ok) throw new Error(`remote brain ${res.status}`);
    const text = parseChatCompletion(await res.json()).trim();
    if (onToken && text) {
      try {
        onToken(text);
      } catch {
        // a UI error in the token callback must never break generation
      }
    }
    return text;
  };
}
