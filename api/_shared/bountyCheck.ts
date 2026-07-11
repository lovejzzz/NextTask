import { z } from 'zod';

const requestSchema = z.object({
  issueUrl: z.string().url(),
});

const githubIssueSchema = z.object({
  number: z.number().int().positive(),
  html_url: z.string().url(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  locked: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  assignee: z.object({ login: z.string() }).nullable(),
  assignees: z.array(z.object({ login: z.string() })),
  labels: z.array(
    z.union([
      z.string(),
      z.object({ name: z.string().nullable() }),
    ]),
  ),
  body: z.string().nullable(),
  comments: z.number().int().nonnegative(),
  pull_request: z.unknown().optional(),
});

const githubRepoSchema = z.object({
  full_name: z.string(),
  html_url: z.string().url(),
  archived: z.boolean(),
  disabled: z.boolean(),
  fork: z.boolean(),
  pushed_at: z.string().nullable(),
  updated_at: z.string(),
  stargazers_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  default_branch: z.string(),
  license: z.object({ spdx_id: z.string().nullable() }).nullable(),
});

const githubTimelineSchema = z.array(
  z.object({
    event: z.string(),
    source: z
      .object({
        issue: z
          .object({
            html_url: z.string().url(),
            state: z.string(),
            pull_request: z.unknown().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
);

export type BountyCheckRequest = z.infer<typeof requestSchema>;

export interface BountyCheckReport {
  checkedAt: string;
  source: 'github-public-api';
  issue: {
    url: string;
    repository: string;
    number: number;
    title: string;
    state: 'open' | 'closed';
    locked: boolean;
    assignees: string[];
    labels: string[];
    comments: number;
    ageDays: number;
    daysSinceUpdate: number;
  };
  repository: {
    url: string;
    archived: boolean;
    disabled: boolean;
    fork: boolean;
    daysSincePush: number | null;
    stars: number;
    openIssues: number;
    defaultBranch: string;
    license: string | null;
  };
  competition: {
    referencedPullRequests: Array<{ url: string; state: string }>;
    count: number;
  };
  funding: {
    status: 'unverified' | 'signal-found';
    signals: string[];
    warning: string;
  };
  assessment: {
    decision: 'candidate' | 'manual-review' | 'avoid';
    riskScore: number;
    reasons: string[];
  };
  disclaimer: string;
}

export function parseBountyCheckRequest(value: unknown): BountyCheckRequest {
  const parsed = requestSchema.parse(value);
  parseGitHubIssueUrl(parsed.issueUrl);
  return parsed;
}

export async function inspectGitHubBounty(
  request: BountyCheckRequest,
  options: { fetch?: typeof fetch; now?: Date; githubToken?: string } = {},
): Promise<BountyCheckReport> {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? new Date();
  const { owner, repo, issueNumber } = parseGitHubIssueUrl(request.issueUrl);
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'NextTask-FIVE-Bounty-Check',
    'x-github-api-version': '2022-11-28',
  };
  if (options.githubToken) headers.authorization = `Bearer ${options.githubToken}`;

  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const [issuePayload, repoPayload, timelinePayload] = await Promise.all([
    getGitHubJson(fetcher, `${baseUrl}/issues/${issueNumber}`, headers),
    getGitHubJson(fetcher, baseUrl, headers),
    getGitHubJson(fetcher, `${baseUrl}/issues/${issueNumber}/timeline?per_page=100`, headers),
  ]);

  const issue = githubIssueSchema.parse(issuePayload);
  if (issue.pull_request !== undefined) {
    throw new BountyCheckError('The supplied URL points to a pull request, not an issue.', 400);
  }
  const repository = githubRepoSchema.parse(repoPayload);
  const timeline = githubTimelineSchema.parse(timelinePayload);
  const labels = issue.labels
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter((label): label is string => Boolean(label));
  const body = issue.body ?? '';
  const fundingSignals = detectFundingSignals(body, labels);
  const referencedPullRequests = uniquePullRequests(timeline);
  const ageDays = daysBetween(issue.created_at, now);
  const daysSinceUpdate = daysBetween(issue.updated_at, now);
  const daysSincePush = repository.pushed_at ? daysBetween(repository.pushed_at, now) : null;
  const reasons: string[] = [];
  let riskScore = 0;

  addRisk(issue.state === 'closed', 70, 'Issue is closed.', reasons, (points) => (riskScore += points));
  addRisk(repository.archived, 70, 'Repository is archived.', reasons, (points) => (riskScore += points));
  addRisk(repository.disabled, 70, 'Repository is disabled.', reasons, (points) => (riskScore += points));
  addRisk(issue.assignees.length > 0, 25, 'Issue already has an assignee.', reasons, (points) => (riskScore += points));
  addRisk(referencedPullRequests.length > 0, 30, 'A pull request already references this issue.', reasons, (points) => (riskScore += points));
  addRisk(issue.locked, 20, 'Issue conversation is locked.', reasons, (points) => (riskScore += points));
  addRisk(daysSinceUpdate > 90, 15, `Issue has not been updated for ${daysSinceUpdate} days.`, reasons, (points) => (riskScore += points));
  addRisk(daysSincePush !== null && daysSincePush > 120, 20, `Repository has not been pushed to for ${daysSincePush} days.`, reasons, (points) => (riskScore += points));
  addRisk(fundingSignals.length === 0, 20, 'No funding signal was found in the public issue text or labels.', reasons, (points) => (riskScore += points));

  riskScore = Math.min(100, riskScore);
  if (reasons.length === 0) reasons.push('No obvious public risk signals were detected.');

  return {
    checkedAt: now.toISOString(),
    source: 'github-public-api',
    issue: {
      url: issue.html_url,
      repository: repository.full_name,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      locked: issue.locked,
      assignees: issue.assignees.map((assignee) => assignee.login),
      labels,
      comments: issue.comments,
      ageDays,
      daysSinceUpdate,
    },
    repository: {
      url: repository.html_url,
      archived: repository.archived,
      disabled: repository.disabled,
      fork: repository.fork,
      daysSincePush,
      stars: repository.stargazers_count,
      openIssues: repository.open_issues_count,
      defaultBranch: repository.default_branch,
      license: repository.license?.spdx_id ?? null,
    },
    competition: {
      referencedPullRequests,
      count: referencedPullRequests.length,
    },
    funding: {
      status: fundingSignals.length > 0 ? 'signal-found' : 'unverified',
      signals: fundingSignals,
      warning: 'Signals are not proof of escrow. Confirm funding and payout terms with the named platform before starting work.',
    },
    assessment: {
      decision: riskScore >= 60 ? 'avoid' : riskScore >= 25 ? 'manual-review' : 'candidate',
      riskScore,
      reasons,
    },
    disclaimer: 'This report uses public metadata and is decision support, not a guarantee of eligibility, acceptance, or payment.',
  };
}

export class BountyCheckError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function parseGitHubIssueUrl(value: string) {
  const url = new URL(value);
  if (url.hostname.toLowerCase() !== 'github.com') {
    throw new BountyCheckError('issueUrl must be a public github.com issue URL.', 400);
  }
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/);
  if (!match) {
    throw new BountyCheckError('issueUrl must match https://github.com/owner/repo/issues/123.', 400);
  }
  return { owner: match[1], repo: match[2], issueNumber: Number(match[3]) };
}

async function getGitHubJson(fetcher: typeof fetch, url: string, headers: Record<string, string>) {
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(8_000) });
  if (response.ok) return response.json();
  if (response.status === 404) throw new BountyCheckError('GitHub issue or repository was not found.', 404);
  if (response.status === 403 || response.status === 429) {
    throw new BountyCheckError('GitHub rate limit reached. Please retry later.', 503);
  }
  throw new BountyCheckError(`GitHub returned ${response.status}.`, 502);
}

function detectFundingSignals(body: string, labels: string[]) {
  const haystack = `${body}\n${labels.join('\n')}`.toLowerCase();
  const patterns: Array<[string, RegExp]> = [
    ['bounty label or text', /\bbount(?:y|ies)\b/],
    ['reward label or text', /\breward\b/],
    ['Gitcoin reference', /gitcoin(?:\.co|\.com|\b)/],
    ['Algora reference', /algora\.io|\balgora\b/],
    ['Bountysource reference', /bountysource\.com|\bbountysource\b/],
    ['USD amount', /(?:\$|usd\s*)\d+(?:\.\d{1,2})?\b/],
    ['USDC amount', /\b\d+(?:\.\d{1,6})?\s*usdc\b/],
  ];
  return patterns.filter(([, pattern]) => pattern.test(haystack)).map(([label]) => label);
}

function uniquePullRequests(timeline: z.infer<typeof githubTimelineSchema>) {
  const seen = new Map<string, { url: string; state: string }>();
  for (const event of timeline) {
    const sourceIssue = event.source?.issue;
    if (event.event !== 'cross-referenced' || !sourceIssue?.pull_request) continue;
    seen.set(sourceIssue.html_url, { url: sourceIssue.html_url, state: sourceIssue.state });
  }
  return [...seen.values()];
}

function daysBetween(value: string, now: Date) {
  const timestamp = new Date(value).getTime();
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

function addRisk(
  condition: boolean,
  points: number,
  reason: string,
  reasons: string[],
  add: (points: number) => void,
) {
  if (!condition) return;
  add(points);
  reasons.push(reason);
}
