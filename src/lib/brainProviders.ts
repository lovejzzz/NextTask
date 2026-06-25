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
  opts: { maxTokens?: number; temperature?: number; stream?: boolean; tools?: unknown[]; toolChoice?: unknown } = {},
): Record<string, unknown> {
  return {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: opts.maxTokens ?? 256,
    temperature: opts.temperature ?? 0.7,
    stream: opts.stream ?? false,
    // Tool-calling (Tier 1+, experimental): only included when the caller offers tools,
    // so the plain voice path sends byte-identical bodies to before.
    ...(opts.tools ? { tools: opts.tools, tool_choice: opts.toolChoice ?? 'auto' } : {}),
  };
}

/** A parsed function/tool call the model chose to make. */
export type ToolCall = { name: string; args: Record<string, unknown> };

/**
 * Extract the first tool call from an OpenAI-compatible response — pure and defensive.
 * Returns null when the model answered with prose instead of calling a tool, so the
 * caller can fall back to treating the reply as a normal message.
 */
export function parseToolCall(json: unknown): ToolCall | null {
  const call = (
    json as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: unknown; arguments?: unknown } }> } }> }
  )?.choices?.[0]?.message?.tool_calls?.[0]?.function;
  if (!call || typeof call.name !== 'string') return null;
  let args: Record<string, unknown> = {};
  if (typeof call.arguments === 'string') {
    try {
      args = JSON.parse(call.arguments || '{}');
    } catch {
      return null; // malformed arguments → no call, never a half-parsed action
    }
  } else if (call.arguments && typeof call.arguments === 'object') {
    args = call.arguments as Record<string, unknown>;
  }
  return { name: call.name, args };
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

/** A remote reasoner that may answer with EITHER prose or a tool call. */
export type ToolGenerateFn = (
  messages: BrainMessage[],
  tools: unknown[],
) => Promise<{ text: string; toolCall: ToolCall | null }>;

/**
 * Like {@link createRemoteGenerate}, but offers the model a set of tools and returns
 * whichever it chose — a parsed {@link ToolCall} or prose. This is how Boardy gains a
 * *hand*: the model can propose a board action instead of only describing one. It does
 * NOT execute anything — the call is just a structured intention that still has to pass
 * the action gate and earn the human's yes. Throws on a failed request, same as the
 * voice path, so the caller falls back to the deterministic brain.
 */
export function createRemoteToolCall(config: RemoteBrainConfig, fetchImpl: typeof fetch = fetch): ToolGenerateFn {
  const url = chatCompletionsUrl(config.endpoint);
  return async (messages, tools) => {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: authHeaders(config.apiKey),
      body: JSON.stringify(buildChatCompletionBody(messages, config.model, { stream: false, tools })),
    });
    if (!res.ok) throw new Error(`remote brain ${res.status}`);
    const json = await res.json();
    return { text: parseChatCompletion(json).trim(), toolCall: parseToolCall(json) };
  };
}

// ── In-browser tool calling (the local agentic path) ─────────────────────────────
//
// The remote OpenAI-compatible path gets native `tool_calls` for free. The in-browser
// Transformers.js path (Gemma 4, Qwen3) does NOT expose a tool-calling API — it's
// text-in/text-out — so we reach the SAME destination a different way: ask the model to
// emit a strict JSON tool call as its text, then parse that JSON into the identical
// {@link ToolCall} shape `parseToolCall` produces. From there the existing action gates
// (readAction/gateAction, readPlan/gatePlan in liveAction.ts) take over unchanged — so a
// small, local, quantized model gains a *hand* without gaining any *authority*: a
// malformed or ungrounded call is just text that the gate rejects, never an executed one.
//
// This is exactly the route the research recommended (Gemma 4 emits structured JSON; the
// app parses it) and it is all pure + unit-tested, no GPU required.

/** Strip a Markdown code fence (```json … ```), which small models love to add. */
function stripFences(text: string): string {
  return text.replace(/```(?:json|tool_call)?\s*([\s\S]*?)\s*```/i, '$1').trim();
}

/**
 * Pull the first balanced top-level `{…}` object out of free text, respecting quoted
 * strings and escapes so a brace inside a string value never throws off the depth count.
 * Returns the JSON substring, or null if there's no complete object. Pure.
 */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // unbalanced — generation was probably cut off
}

const CALL_NAME_KEYS = ['name', 'tool', 'function'];
const CALL_ARG_KEYS = ['arguments', 'args', 'parameters', 'input'];

/**
 * Parse a tool call out of a model's free-text reply — the in-browser counterpart to
 * {@link parseToolCall}. Lenient on shape because small models are: it accepts
 *   • `{ "name": "propose_board_action", "arguments": { … } }` (the asked-for shape),
 *   • the same with `tool`/`function` and `args`/`parameters`/`input` aliases,
 *   • a name with the args spread flat alongside it, and
 *   • bare args with no name, inferring the tool from their shape (`steps` → a plan,
 *     `kind` → a single action) — safe, because the gate validates regardless.
 * Returns null on prose or malformed JSON, so the caller treats the reply as plain text.
 */
export function parseJsonToolCall(text: string): ToolCall | null {
  const json = extractFirstJsonObject(stripFences(text));
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;

  const name = CALL_NAME_KEYS.map((k) => obj[k]).find((v): v is string => typeof v === 'string');
  const argsHolder = CALL_ARG_KEYS.map((k) => obj[k]).find(
    (v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
  );
  if (name) {
    if (argsHolder) return { name, args: argsHolder };
    // Args spread flat next to the name — take everything but the call-shape keys.
    const args: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!CALL_NAME_KEYS.includes(k) && !CALL_ARG_KEYS.includes(k)) args[k] = v;
    }
    return { name, args };
  }
  // No name: infer from the args' own shape. The gate is the real check, so this is safe.
  if (Array.isArray(obj.steps)) return { name: 'propose_plan', args: obj };
  if (typeof obj.kind === 'string') return { name: 'propose_board_action', args: obj };
  return null;
}

/**
 * Does an in-progress streamed reply look like it's becoming a JSON tool call rather than
 * prose? Used for streaming hygiene: the UI shows a "drafting…" placeholder instead of
 * leaking raw JSON into the chat. Conservative — fires only when the text *opens* like a
 * tool call (a brace, a ```json fence, or a leading name/tool key), never on prose that
 * merely contains a brace mid-sentence. Pure + unit-tested.
 */
export function looksLikeToolCall(partial: string): boolean {
  const head = partial.replace(/^[\s>*-]+/, '');
  return head.startsWith('{') || /^```(?:json|tool_call)?/i.test(head) || /^"?(?:name|tool|function)"?\s*:/i.test(head);
}

/** Minimal shape we read off the OpenAI-style tool consts to describe them in a prompt. */
type ToolLike = { function?: { name?: unknown; description?: unknown; parameters?: { required?: unknown } } };

/**
 * Render the offered tools as a compact instruction the small model can follow, since
 * it has no native tool schema. Lists each tool's name, description, and required args.
 * Pure, so the prompt wording is unit-tested.
 */
export function describeToolsForPrompt(tools: unknown[]): string {
  const lines = tools.map((t) => {
    const fn = (t as ToolLike).function ?? {};
    const name = typeof fn.name === 'string' ? fn.name : 'tool';
    const desc = typeof fn.description === 'string' ? fn.description : '';
    const required = Array.isArray(fn.parameters?.required) ? (fn.parameters!.required as unknown[]).join(', ') : '';
    return `- ${name}${required ? ` (required: ${required})` : ''}: ${desc}`;
  });
  return lines.join('\n');
}

/**
 * Augment a chat for the local tool-call path: append one system instruction telling the
 * model it MAY answer with a single JSON tool call, and how. Returns a new array — the
 * caller's messages are never mutated.
 */
export function buildToolCallMessages(messages: BrainMessage[], tools: unknown[]): BrainMessage[] {
  const instruction =
    'You may take ONE action by replying with a single JSON object and NOTHING else, ' +
    'shaped exactly as {"name": <tool name>, "arguments": { … }}. ' +
    `Available tools:\n${describeToolsForPrompt(tools)}\n` +
    'Copy any task title verbatim from the board above — never invent one. ' +
    'Only emit JSON when the conversation clearly calls for an action; otherwise just reply normally in prose.';
  return [...messages, { role: 'system', content: instruction }];
}

/**
 * A {@link ToolGenerateFn} backed by the in-browser model: it asks for a JSON tool call,
 * then parses whichever the model gave — a {@link ToolCall} or prose — into the same
 * shape the remote path returns, so callers and the action gates don't care which brain
 * answered. Never executes anything; it only produces a structured *intention*.
 */
export function createLocalToolCall(generate: GenerateFn): ToolGenerateFn {
  return async (messages, tools) => {
    const text = (await generate(buildToolCallMessages(messages, tools))).trim();
    return { text, toolCall: parseJsonToolCall(text) };
  };
}
