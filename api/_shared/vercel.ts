/**
 * Minimal structural types used by the API handlers.
 *
 * Vercel invokes these handlers based on their default exports; the application
 * only needs a small subset of the request/response surface at compile time.
 * Keeping the types local avoids shipping the large `@vercel/node` build-tool
 * dependency tree solely for type-only imports.
 */
export type VercelRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket: { remoteAddress?: string };
};

export type VercelResponse = {
  status(statusCode: number): VercelResponse;
  setHeader(name: string, value: string | string[]): VercelResponse;
  json(body: unknown): VercelResponse;
  end(body?: unknown): VercelResponse;
};
