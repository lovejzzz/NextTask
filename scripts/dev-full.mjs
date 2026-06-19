import { createServer as createHttpServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { createServer as createViteServer } from 'vite';

const port = Number(process.env.PORT ?? 5174);
const host = process.env.HOST ?? '127.0.0.1';

loadDotEnv();

const vite = await createViteServer({
  server: {
    middlewareMode: true,
    hmr: true,
  },
  appType: 'spa',
});

const server = createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }

    vite.middlewares(req, res);
  } catch (error) {
    if (error instanceof Error) vite.ssrFixStacktrace(error);
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'server_error', message: 'Local dev server failed' } }));
    }
  }
});

server.listen(port, host, () => {
  console.log(`Next Task full dev server ready at http://${host}:${port}`);
});

async function handleApi(req, res, url) {
  const match = routeFor(url.pathname);
  if (!match) {
    send(res, 404, { error: { code: 'not_found', message: 'API route not found' } });
    return;
  }

  if (!match.methods.includes(req.method ?? '')) {
    res.setHeader('allow', match.methods.join(', '));
    send(res, 405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });
    return;
  }

  const body = await readBody(req);
  const query = Object.fromEntries(url.searchParams.entries());
  const module = await vite.ssrLoadModule(`/${match.file}`);
  const handler = module.default;
  if (typeof handler !== 'function') {
    send(res, 500, { error: { code: 'server_error', message: 'API handler missing default export' } });
    return;
  }

  const vercelReq = Object.assign(req, {
    query: { ...query, ...match.params },
    body,
  });

  const vercelRes = createVercelResponse(res);
  await handler(vercelReq, vercelRes);
}

function routeFor(pathname) {
  const routes = [
    [['GET', 'POST'], /^\/api\/tasks$/, 'api/tasks/index.ts', []],
    [['PATCH'], /^\/api\/tasks\/reorder$/, 'api/tasks/reorder.ts', []],
    [['PATCH', 'DELETE'], /^\/api\/tasks\/([^/]+)$/, 'api/tasks/[id].ts', ['id']],
    [['GET', 'POST'], /^\/api\/tasks\/([^/]+)\/comments$/, 'api/tasks/[id]/comments.ts', ['id']],
    [['DELETE'], /^\/api\/tasks\/([^/]+)\/comments\/([^/]+)$/, 'api/tasks/[id]/comments/[commentId].ts', [
      'id',
      'commentId',
    ]],
    [['GET'], /^\/api\/tasks\/([^/]+)\/activity$/, 'api/tasks/[id]/activity.ts', ['id']],
    [['GET', 'POST'], /^\/api\/team-members$/, 'api/team-members/index.ts', []],
    [['PATCH', 'DELETE'], /^\/api\/team-members\/([^/]+)$/, 'api/team-members/[id].ts', ['id']],
    [['GET', 'POST'], /^\/api\/labels$/, 'api/labels/index.ts', []],
    [['PATCH', 'DELETE'], /^\/api\/labels\/([^/]+)$/, 'api/labels/[id].ts', ['id']],
    [['GET'], /^\/api\/stats$/, 'api/stats.ts', []],
    [['POST'], /^\/api\/bootstrap\/demo$/, 'api/bootstrap/demo.ts', []],
    [['POST'], /^\/api\/bootstrap\/reset$/, 'api/bootstrap/reset.ts', []],
  ];

  for (const [methods, pattern, file, names] of routes) {
    const match = pathname.match(pattern);
    if (!match) continue;
    const params = {};
    names.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1]);
    });
    return { methods, file, params };
  }
  return null;
}

function createVercelResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    json(value) {
      if (!res.headersSent) res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(value));
      return this;
    },
    end(value) {
      res.end(value);
      return this;
    },
  };
}

function send(res, status, value) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  if (!['POST', 'PATCH', 'PUT'].includes(req.method ?? '')) return undefined;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;

  const type = req.headers['content-type'] ?? '';
  if (String(type).includes('application/json')) return JSON.parse(raw);
  return raw;
}

function loadDotEnv() {
  if (!existsSync('.env')) return;

  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
