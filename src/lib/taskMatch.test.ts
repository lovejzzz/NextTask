import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { matchNamed, matchScore, matchTask } from './taskMatch';

const tasks = [
  makeTask({ id: 'a', title: 'Fix the login bug' }),
  makeTask({ id: 'b', title: 'Email Sam about the launch' }),
  makeTask({ id: 'c', title: 'Write release notes', status: 'done' }),
];

describe('matchScore', () => {
  it('scores exact and substring matches highest', () => {
    expect(matchScore('Fix the login bug', 'fix the login bug')).toBe(100);
    expect(matchScore('Fix the login bug', 'login bug')).toBeGreaterThan(70);
  });

  it('scores token overlap, ignoring filler words', () => {
    expect(matchScore('Email Sam about the launch', 'the sam email')).toBeGreaterThan(0);
    expect(matchScore('Email Sam about the launch', 'login')).toBe(0);
  });
});

describe('matchTask', () => {
  it('finds the intended task from a loose phrase', () => {
    expect(matchTask(tasks, 'login bug')?.id).toBe('a');
    expect(matchTask(tasks, 'email sam')?.id).toBe('b');
  });

  it('returns null when nothing clears the threshold', () => {
    expect(matchTask(tasks, 'deploy kubernetes')).toBeNull();
  });

  it('prefers active work when scores are close', () => {
    const pair = [makeTask({ id: 'x', title: 'Review notes', status: 'done' }), makeTask({ id: 'y', title: 'Review notes' })];
    expect(matchTask(pair, 'review notes')?.id).toBe('y');
  });
});

describe('matchNamed', () => {
  const people = [{ id: '1', name: 'Sam Rivera' }, { id: '2', name: 'Alex Chen' }];
  it('matches a teammate or label by loose name', () => {
    expect(matchNamed(people, 'sam')?.id).toBe('1');
    expect(matchNamed(people, 'alex')?.id).toBe('2');
  });
  it('returns null when no name is close enough', () => {
    expect(matchNamed(people, 'jordan')).toBeNull();
  });
});
