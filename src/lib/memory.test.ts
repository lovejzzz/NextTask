import { describe, expect, it } from 'vitest';

import { consolidate, decay, inspect, remember, retrieve, strength, type MemoryStore } from './memory';

const DAY = 86_400_000;
const NOW = 1_000 * DAY; // a round epoch to anchor the clock

describe('remember', () => {
  it('encodes a new memory with sane defaults', () => {
    const store = remember([], { kind: 'semantic', text: 'Deadline is Friday', source: 'user-told' }, NOW);
    expect(store).toHaveLength(1);
    expect(store[0]).toMatchObject({ kind: 'semantic', text: 'Deadline is Friday', uses: 1 });
    expect(store[0].confidence).toBeGreaterThan(0.9); // user-told → high confidence
  });

  it('reinforces instead of duplicating when the same thing is remembered again', () => {
    let store: MemoryStore = remember([], { kind: 'semantic', text: 'Deadline is Friday' }, NOW);
    store = remember(store, { kind: 'semantic', text: 'deadline is friday.' }, NOW + DAY); // same, paraphrased casing/punct
    expect(store).toHaveLength(1);
    expect(store[0].uses).toBe(2);
    expect(store[0].lastSeenAt).toBe(NOW + DAY);
  });

  it('keeps the strongest importance/confidence on reinforcement', () => {
    let store = remember([], { kind: 'semantic', text: 'X', importance: 0.3, source: 'inferred' }, NOW);
    store = remember(store, { kind: 'semantic', text: 'X', importance: 0.9, source: 'user-told' }, NOW);
    expect(store[0].importance).toBe(0.9);
    expect(store[0].confidence).toBeGreaterThan(0.9);
  });
});

describe('strength (reinforcement + decay)', () => {
  it('fades with neglect', () => {
    const [item] = remember([], { kind: 'episodic', text: 'did a thing' }, NOW);
    const fresh = strength(item, NOW);
    const old = strength(item, NOW + 28 * DAY); // two half-lives later
    expect(old).toBeLessThan(fresh);
    expect(old).toBeLessThan(0.3);
  });

  it('resists decay the more it has been used', () => {
    let store = remember([], { kind: 'episodic', text: 'clear overdue' }, NOW);
    for (let i = 0; i < 8; i += 1) store = remember(store, { kind: 'episodic', text: 'clear overdue' }, NOW);
    const wellUsed = strength(store[0], NOW + 28 * DAY);
    const [onceOnly] = remember([], { kind: 'episodic', text: 'one-off' }, NOW);
    expect(wellUsed).toBeGreaterThan(strength(onceOnly, NOW + 28 * DAY));
  });

  it('treats pinned memories as permanently strong', () => {
    const [item] = remember([], { kind: 'semantic', text: 'anniversary June 1', pinned: true }, NOW);
    expect(strength(item, NOW + 365 * DAY)).toBe(1);
  });
});

describe('retrieve', () => {
  const base = (): MemoryStore => {
    let s: MemoryStore = [];
    s = remember(s, { kind: 'semantic', text: 'Deadline is Friday', source: 'user-told', importance: 0.8 }, NOW);
    s = remember(s, { kind: 'semantic', text: 'Prefers working in the morning', source: 'observed' }, NOW);
    s = remember(s, { kind: 'episodic', text: 'Shipped the login fix', source: 'observed' }, NOW);
    return s;
  };

  it('finds the relevant memory for a query across kinds', () => {
    const hits = retrieve(base(), 'when is my deadline', NOW);
    expect(hits[0].item.text).toBe('Deadline is Friday');
  });

  it('returns the most salient memories when there is no query', () => {
    const hits = retrieve(base(), '', NOW, 2);
    expect(hits).toHaveLength(2);
    expect(hits[0].item.importance).toBeGreaterThanOrEqual(hits[1].item.importance);
  });

  it('does not surface unrelated memories on a real query', () => {
    const hits = retrieve(base(), 'deadline', NOW);
    expect(hits.some((h) => h.item.text === 'Shipped the login fix')).toBe(false);
  });

  it('can scope retrieval to certain kinds', () => {
    const hits = retrieve(base(), '', NOW, 5, ['episodic']);
    expect(hits.every((h) => h.item.kind === 'episodic')).toBe(true);
  });
});

describe('decay (graceful forgetting)', () => {
  it('forgets trivial, neglected memories but keeps important ones', () => {
    let store: MemoryStore = [];
    store = remember(store, { kind: 'episodic', text: 'idle fidget', importance: 0.15 }, NOW);
    store = remember(store, { kind: 'semantic', text: 'Deadline is Friday', importance: 0.85 }, NOW);
    const later = decay(store, NOW + 60 * DAY);
    const texts = later.map((m) => m.text);
    expect(texts).toContain('Deadline is Friday');
    expect(texts).not.toContain('idle fidget');
  });

  it('never forgets a pinned memory, however old', () => {
    const store = remember([], { kind: 'semantic', text: 'birthday', importance: 0.1, pinned: true }, NOW);
    expect(decay(store, NOW + 1000 * DAY)).toHaveLength(1);
  });
});

describe('consolidate', () => {
  it('merges near-duplicate memories into one', () => {
    let store: MemoryStore = [];
    store = remember(store, { kind: 'semantic', text: 'Prefers working in the morning' }, NOW);
    // a paraphrase close enough to be the same fact
    store.push({ ...store[0], id: 'semantic:prefers-mornings-variant', text: 'Prefers working in the mornings' });
    const after = consolidate(store, NOW);
    expect(after.length).toBeLessThan(store.length);
  });

  it('promotes a repeated episode into a durable semantic pattern', () => {
    let store: MemoryStore = remember([], { kind: 'episodic', text: 'clear overdue' }, NOW);
    for (let i = 0; i < 3; i += 1) store = remember(store, { kind: 'episodic', text: 'clear overdue' }, NOW);
    const after = consolidate(store, NOW);
    expect(after.some((m) => m.kind === 'semantic' && /Often: clear overdue/i.test(m.text))).toBe(true);
  });
});

describe('inspect (glass-box)', () => {
  it('lists memories in plain text, flagging unsure and pinned ones', () => {
    let store: MemoryStore = [];
    store = remember(store, { kind: 'semantic', text: 'Maybe likes dark mode', source: 'inferred' }, NOW);
    store = remember(store, { kind: 'semantic', text: 'Deadline is Friday', source: 'user-told', pinned: true }, NOW);
    const lines = inspect(store, NOW);
    expect(lines.join('\n')).toMatch(/unsure/);
    expect(lines.join('\n')).toMatch(/📌/);
  });
});
