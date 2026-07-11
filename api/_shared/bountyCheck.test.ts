import { describe, expect, it, vi } from 'vitest';
import {
  BountyCheckError,
  inspectGitHubBounty,
  parseBountyCheckRequest,
} from './bountyCheck.js';

const now = new Date('2026-07-10T12:00:00.000Z');
const issue = {
  number: 42,
  html_url: 'https://github.com/example/project/issues/42',
  title: 'Improve the parser',
  state: 'open',
  locked: false,
  created_at: '2026-07-01T12:00:00.000Z',
  updated_at: '2026-07-09T12:00:00.000Z',
  closed_at: null,
  assignee: null,
  assignees: [],
  labels: [{ name: 'bounty: $25' }],
  body: 'A $25 bounty is available through Algora.',
  comments: 2,
};
const repository = {
  full_name: 'example/project',
  html_url: 'https://github.com/example/project',
  archived: false,
  disabled: false,
  fork: false,
  pushed_at: '2026-07-09T12:00:00.000Z',
  updated_at: '2026-07-09T12:00:00.000Z',
  stargazers_count: 250,
  open_issues_count: 12,
  default_branch: 'main',
  license: { spdx_id: 'MIT' },
};

describe('parseBountyCheckRequest', () => {
  it('accepts canonical public GitHub issue URLs', () => {
    expect(parseBountyCheckRequest({ issueUrl: issue.html_url })).toEqual({ issueUrl: issue.html_url });
  });

  it('rejects non-GitHub and pull request URLs', () => {
    expect(() => parseBountyCheckRequest({ issueUrl: 'https://example.com/issues/42' })).toThrow(BountyCheckError);
    expect(() => parseBountyCheckRequest({ issueUrl: 'https://github.com/example/project/pull/42' })).toThrow(BountyCheckError);
  });
});

describe('inspectGitHubBounty', () => {
  it('returns a candidate when the issue is active, unclaimed, and has funding signals', async () => {
    const fetcher = githubFetch([issue, repository, []]);

    const report = await inspectGitHubBounty(
      { issueUrl: issue.html_url },
      { fetch: fetcher, now },
    );

    expect(report.assessment).toMatchObject({ decision: 'candidate', riskScore: 0 });
    expect(report.funding.status).toBe('signal-found');
    expect(report.funding.signals).toEqual(expect.arrayContaining(['bounty label or text', 'Algora reference', 'USD amount']));
    expect(report.competition.count).toBe(0);
  });

  it('marks closed, assigned, stale issues with competing pull requests as avoid', async () => {
    const riskyIssue = {
      ...issue,
      state: 'closed',
      assignee: { login: 'worker' },
      assignees: [{ login: 'worker' }],
      updated_at: '2025-01-01T00:00:00.000Z',
      labels: [],
      body: null,
    };
    const staleRepository = {
      ...repository,
      archived: true,
      pushed_at: '2025-01-01T00:00:00.000Z',
    };
    const timeline = [
      {
        event: 'cross-referenced',
        source: {
          issue: {
            html_url: 'https://github.com/example/project/pull/99',
            state: 'open',
            pull_request: {},
          },
        },
      },
    ];
    const fetcher = githubFetch([riskyIssue, staleRepository, timeline]);

    const report = await inspectGitHubBounty(
      { issueUrl: issue.html_url },
      { fetch: fetcher, now },
    );

    expect(report.assessment.decision).toBe('avoid');
    expect(report.assessment.riskScore).toBe(100);
    expect(report.competition.referencedPullRequests).toEqual([
      { url: 'https://github.com/example/project/pull/99', state: 'open' },
    ]);
    expect(report.funding.status).toBe('unverified');
  });

  it('surfaces GitHub not-found responses without charging semantics', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 404 }));

    await expect(
      inspectGitHubBounty({ issueUrl: issue.html_url }, { fetch: fetcher, now }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

function githubFetch(payloads: unknown[]) {
  return vi.fn<typeof fetch>().mockImplementation(async () => {
    const payload = payloads.shift();
    return Response.json(payload);
  });
}
