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

  it('principles and exemplars are derived from the lessons', () => {
    expect(upbringingPrinciples()).toEqual(LESSONS.map((l) => l.principle));
    expect(upbringingExemplars()).toEqual(LESSONS.filter((l) => l.exemplar).map((l) => l.exemplar));
  });

  it('formats a creed block, and says nothing when nothing has been taught', () => {
    const block = formatUpbringing();
    expect(block).toContain('How you were raised');
    expect(block).toContain(LESSONS[0].principle);
    expect(formatUpbringing([])).toBe('');
  });

  it('grows: a newly taught lesson reaches his voice', () => {
    const extra: Lesson = { id: 'patience', principle: 'I wait for the right moment.', source: 'a future lesson' };
    const grown = [...LESSONS, extra];
    expect(upbringingPrinciples(grown)).toContain('I wait for the right moment.');
    expect(formatUpbringing(grown)).toContain('I wait for the right moment.');
    expect(describeUpbringing(grown)).toContain('I wait for the right moment.');
  });
});
