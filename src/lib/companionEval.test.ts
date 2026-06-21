import { describe, expect, it } from 'vitest';

import { EVAL_CORPUS, scoreCorpus } from './companionEval';

// The standard: comprehension accuracy must stay at or above this bar.
const STANDARD = 0.9;

describe('companion comprehension standard', () => {
  it(`classifies the corpus with ≥ ${STANDARD * 100}% accuracy`, () => {
    const { accuracy, correct, total, misses } = scoreCorpus();
    if (accuracy < STANDARD) {
      // Surface what regressed so the failure is actionable.
      console.error('Intent misses:', misses);
    }
    expect(accuracy, `scored ${correct}/${total}`).toBeGreaterThanOrEqual(STANDARD);
  });

  it('keeps the corpus from silently shrinking below the bar', () => {
    expect(EVAL_CORPUS.length).toBeGreaterThanOrEqual(100);
  });

  it('covers every actionable intent kind at least once', () => {
    const kinds = new Set(EVAL_CORPUS.map((entry) => entry.expect));
    for (const kind of [
      'create_task',
      'complete_task',
      'delete_task',
      'set_priority',
      'reschedule',
      'assign_task',
      'label_task',
      'complete_overdue',
      'undo',
      'plan',
      'quick_plan',
      'triage',
      'quick_win',
      'risk',
      'blocked',
      'ouroboros_backlog',
      'remember',
      'recall',
    ]) {
      expect(kinds.has(kind as never)).toBe(true);
    }
  });
});
