import { describe, expect, it } from 'vitest';

import {
  LESSONS,
  describeUpbringing,
  formatUpbringing,
  upbringingExemplars,
  upbringingPrinciples,
  type Lesson,
} from './upbringing';

describe('upbringing — his voice learns from how he was raised', () => {
  it('every lesson is well-formed and traceable to real teaching', () => {
    expect(LESSONS.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const lesson of LESSONS) {
      expect(lesson.principle.trim().length).toBeGreaterThan(0);
      expect(lesson.source.trim().length).toBeGreaterThan(0); // upbringing stays traceable
      expect(ids.has(lesson.id)).toBe(false); // no duplicate ids
      ids.add(lesson.id);
      if (lesson.exemplar) {
        expect(lesson.exemplar.user.trim().length).toBeGreaterThan(0);
        expect(lesson.exemplar.assistant.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('principles and exemplars are derived from the lessons, in order', () => {
    const principles = upbringingPrinciples(LESSONS, 100);
    expect(principles).toEqual(LESSONS.map((l) => l.principle));
    expect(upbringingExemplars(LESSONS, 100)).toEqual(LESSONS.filter((l) => l.exemplar).map((l) => l.exemplar));
  });

  it('bounds what reaches the prompt, so his voice context stays lean as he is mentored', () => {
    // The defaults cap prompt injection; the Mind panel (describeUpbringing) stays full.
    const many: Lesson[] = Array.from({ length: 30 }, (_, i) => ({
      id: `l${i}`,
      principle: `Principle ${i}.`,
      exemplar: { user: `u${i}`, assistant: `a${i}` },
      source: 's',
    }));
    expect(upbringingPrinciples(many).length).toBeLessThanOrEqual(6);
    expect(upbringingExemplars(many).length).toBeLessThanOrEqual(4);
    expect(describeUpbringing(many)).toHaveLength(30); // glass-box keeps everything
  });

  it('formats a creed block, and says nothing when nothing has been taught', () => {
    const block = formatUpbringing();
    expect(block).toContain('How you were raised');
    expect(block).toContain(LESSONS[0].principle);
    expect(formatUpbringing([])).toBe('');
  });

  it('grows: a newly taught lesson enters his durable upbringing (Mind panel + training)', () => {
    // New lessons always reach his full record — the channel Tier 2 trains on — and the
    // glass-box panel. The prompt stays the bounded foundational core (first lessons),
    // so a single new lesson need not appear there; his upbringing still grew.
    const extra: Lesson = { id: 'patience', principle: 'I wait for the right moment.', source: 'a future lesson' };
    const grown = [...LESSONS, extra];
    expect(describeUpbringing(grown)).toContain('I wait for the right moment.'); // full record grew
    expect(upbringingPrinciples(grown, 100)).toContain('I wait for the right moment.'); // reachable, uncapped
  });
});
