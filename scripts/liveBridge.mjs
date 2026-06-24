#!/usr/bin/env node
/**
 * liveBridge — an "agent-in-the-loop" brain for Boardy (experimental).
 *
 * Tier 1 (BoardyV1) talks to any OpenAI-compatible `/v1/chat/completions`
 * endpoint. This bridge IS that endpoint — but it has no model behind it.
 * Instead, every request is parked on a file queue for a *live agent* (a
 * Claude Code session) to answer by hand: read the real prompt, voice Boardy,
 * write the reply back. To the app it's an ordinary model server; in reality
 * Boardy is being voiced by a frontier model in the loop.
 *
 * Protocol (file queue, dir = BRIDGE_DIR):
 *   - request in:  req-<id>.json   { id, model, messages: [...] }
 *   - reply out:   reply-<id>.txt  (raw assistant text — the agent writes this)
 * The server long-polls for reply-<id>.txt, then returns it as a normal
 * chat-completion and deletes both files.
 *
 * Run:  BRIDGE_DIR=/path/to/queue PORT=8787 node scripts/liveBridge.mjs
 * Point Boardy's Tier-1 endpoint at  http://localhost:8787/v1
 */
import http from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DIR = process.env.BRIDGE_DIR || join(tmpdir(), 'boardy-bridge');
const PORT = Number(process.env.PORT || 8787);
const REPLY_TIMEOUT_MS = Number(process.env.BRIDGE_TIMEOUT_MS || 600_000);
mkdirSync(DIR, { recursive: true });

let seq = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForReply(id) {
  const path = join(DIR, `reply-${id}.txt`);
  const deadline = Date.now() + REPLY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (existsSync(path)) return readFileSync(path, 'utf8');
    await sleep(150);
  }
  throw new Error('bridge: timed out waiting for the agent to answer');
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url?.startsWith('/v1/models')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'boardy-live-agent', object: 'model' }] }));
    return;
  }
  if (req.method !== 'POST' || !req.url?.includes('/chat/completions')) {
    res.writeHead(404).end();
    return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    const id = `${Date.now()}-${++seq}`;
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400).end('bad json');
      return;
    }
    const reqPath = join(DIR, `req-${id}.json`);
    const replyPath = join(DIR, `reply-${id}.txt`);
    writeFileSync(reqPath, JSON.stringify({ id, model: payload.model, messages: payload.messages }, null, 2));
    console.error(`[bridge] parked request ${id} (${payload.messages?.length ?? 0} messages) — waiting for the agent…`);
    try {
      const raw = (await waitForReply(id)).trim();
      console.error(`[bridge] agent answered ${id} (${raw.length} chars)`);
      // The agent may answer with prose OR a tool call. A reply of the form
      // {"tool_call":{"name":...,"arguments":{...}}} is relayed as an OpenAI
      // tool_calls message; anything else is plain assistant content.
      let message = { role: 'assistant', content: raw };
      let finish = 'stop';
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.tool_call && typeof parsed.tool_call.name === 'string') {
          message = {
            role: 'assistant',
            content: parsed.content ?? null,
            tool_calls: [{
              id: `call-${id}`,
              type: 'function',
              function: { name: parsed.tool_call.name, arguments: JSON.stringify(parsed.tool_call.arguments ?? {}) },
            }],
          };
          finish = 'tool_calls';
        }
      } catch {
        // not JSON — plain prose, leave as content
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: `chatcmpl-${id}`,
        object: 'chat.completion',
        model: payload.model || 'boardy-live-agent',
        choices: [{ index: 0, message, finish_reason: finish }],
      }));
    } catch (err) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: String(err?.message || err) } }));
    } finally {
      for (const p of [reqPath, replyPath]) if (existsSync(p)) rmSync(p);
    }
  });
});

server.listen(PORT, () => {
  console.error(`[bridge] live agent-in-the-loop brain on http://localhost:${PORT}/v1`);
  console.error(`[bridge] queue dir: ${DIR}`);
});
