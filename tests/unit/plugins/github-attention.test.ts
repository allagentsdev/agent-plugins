import { afterEach, describe, expect, it } from 'bun:test';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import {
  ApiError,
  GitHub,
  Report,
  ciEvidence,
  endpoint,
  latestReviews,
  parseArgs,
  repositories,
  reviewReasons,
  text,
} from '../../../plugins/engineering/skills/github-attention/scripts/github-attention.ts';

const NOW = new Date('2026-10-27T00:00:00.000Z');
const REPO = 'Example/Widget';
const SINCE = '2026-09-27T00:00:00Z';
const SCRIPT = new URL(
  '../../../plugins/engineering/skills/github-attention/scripts/github-attention.ts',
  import.meta.url,
).href;
type FixtureData = Record<string, unknown[] | Error>;
const temporaryPaths: string[] = [];

// Only the process boundary is replaced: pagination, parsing and classification
// remain the production implementations inherited from GitHub.
class Pages extends GitHub {
  readonly calls: string[] = [];

  constructor(readonly data: FixtureData) {
    super();
  }

  override async get(path: string): Promise<Awaited<ReturnType<GitHub['get']>>> {
    this.calls.push(path);
    if (!Object.hasOwn(this.data, path)) {
      throw new Error(`Unexpected API access: ${path}`);
    }
    const result = this.data[path];
    if (result instanceof Error) throw result;
    return result as Awaited<ReturnType<GitHub['get']>>;
  }
}

function pr(number: number, author = 'someone', sha = 'current') {
  return {
    id: number,
    number,
    state: 'open',
    title: `Work ${number}`,
    user: { login: author },
    head: { sha },
    body: '',
  };
}

function review(
  id: number,
  state: string,
  sha = 'current',
  login = 'alice',
  submitted: string | null = `2026-10-${String(id).padStart(2, '0')}T00:00:00Z`,
) {
  return {
    id,
    state,
    commit_id: sha,
    user: { login },
    submitted_at: submitted,
  };
}

function notification(
  number: number,
  reason = 'mention',
  kind = 'pulls',
  repo = REPO,
) {
  return {
    repository: { full_name: repo },
    reason,
    unread: false,
    updated_at: '2026-10-26T00:00:00Z',
    subject: {
      type: kind === 'pulls' ? 'PullRequest' : 'Issue',
      url: `https://api.github.com/repos/${repo}/${kind}/${number}`,
    },
  };
}

function baseData(repos = [REPO]): FixtureData {
  const data: FixtureData = {
    user: [{ login: 'alice' }],
    'user/teams?per_page=100': [[{
      id: 7,
      slug: 'reviewers',
      organization: { login: 'Example' },
    }]],
  };
  for (const repo of repos) {
    data[endpoint(repo, 'pulls', { state: 'open' })] = [[]];
    data[endpoint(repo, 'issues', { state: 'open', assignee: 'alice' })] = [[]];
    data[endpoint(repo, 'notifications', { all: 'true', since: SINCE })] = [[]];
  }
  return data;
}

function addPr(
  data: FixtureData,
  item: ReturnType<typeof pr>,
  options: {
    reviews?: ReturnType<typeof review>[];
    users?: { login: string }[];
    teams?: { id: number; slug: string }[];
    repo?: string;
  } = {},
) {
  const { reviews = [], users = [], teams = [], repo = REPO } = options;
  const pages = data[endpoint(repo, 'pulls', { state: 'open' })];
  if (!Array.isArray(pages) || !Array.isArray(pages[pages.length - 1])) {
    throw new Error('Fixture must contain a paginated pull request list');
  }
  (pages[pages.length - 1] as unknown[]).push(item);
  data[endpoint(repo, `pulls/${item.number}/reviews`)] = [reviews];
  data[endpoint(repo, `pulls/${item.number}/requested_reviewers`)] = [{ users, teams }];
}

function authoredData(
  item: ReturnType<typeof pr>,
  options: {
    reviews?: ReturnType<typeof review>[];
    detail?: Record<string, unknown>;
    checks?: Record<string, unknown>[];
    statuses?: Record<string, unknown>[];
    runs?: Record<string, unknown>[];
  } = {},
) {
  const data = baseData();
  addPr(data, item, { reviews: options.reviews });
  data[`repos/${REPO}/pulls/${item.number}`] = [{ ...item, ...options.detail }];
  data[endpoint(REPO, `commits/${item.head.sha}/check-runs`, { filter: 'latest' })] = [
    { check_runs: options.checks ?? [] },
  ];
  data[endpoint(REPO, `commits/${item.head.sha}/statuses`)] = [options.statuses ?? []];
  data[endpoint(REPO, 'actions/runs', { head_sha: item.head.sha })] = [{
    total_count: options.runs?.length ?? 0,
    workflow_runs: options.runs ?? [],
  }];
  return data;
}

async function collect(data: FixtureData, repos = [REPO]) {
  const api = new Pages(data);
  const report = new Report(api, repos, 30, NOW);
  await report.collect();
  return { api, report };
}

async function child(code: string, env: Record<string, string | undefined> = {}) {
  const process = Bun.spawn([Bun.which('bun') ?? 'bun', '--eval', code], {
    env: { ...globalThis.process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  expect(exitCode).toBe(0);
  return { stdout, stderr };
}

async function runMain(data: FixtureData, args: string[] = [REPO]) {
  // Child-local fixtures isolate console output without spies or module mocks
  // that could affect unrelated files in the full Bun suite.
  const serialized = Object.fromEntries(Object.entries(data).map(([path, value]) => [
    path,
    value instanceof ApiError ? { fixtureError: value.message } : value,
  ]));
  return child(`
    import { ApiError, GitHub, main } from ${JSON.stringify(SCRIPT)};
    const data = ${JSON.stringify(serialized)};
    class Pages extends GitHub {
      async get(path) {
        if (!Object.hasOwn(data, path)) throw new Error('Unexpected API access: ' + path);
        if (data[path].fixtureError) throw new ApiError(data[path].fixtureError);
        return data[path];
      }
    }
    const code = await main(${JSON.stringify(args)}, new Pages(), new Date(${JSON.stringify(NOW.toISOString())}));
    console.log('RETURN_CODE=' + code);
  `);
}

async function ghFixture(source: string, interpreter = '#!/usr/bin/env bun') {
  const directory = await mkdtemp(join(tmpdir(), 'allagents-attention-'));
  temporaryPaths.push(directory);
  const executable = join(directory, 'gh');
  await writeFile(executable, `${interpreter}\n${source}\n`);
  await chmod(executable, 0o755);
  return { PATH: `${directory}${delimiter}${process.env.PATH ?? ''}` };
}

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

describe('github-attention repository selection and CLI arguments', () => {
  it('preserves the first spelling while deduplicating explicit repositories', () => {
    expect(repositories(['Example/Widget', 'example/widget', 'Example/Other']))
      .toEqual(['Example/Widget', 'Example/Other']);
  });

  it('rejects URLs, options, paths, query strings and shell content', () => {
    for (const value of [
      '', 'owner', 'owner/repo/extra', 'owner/..', 'owner/.', '../repo',
      'https://github.com/a/b', '--hostname=elsewhere', 'a/b?state=all',
      'a/b;whoami', 'a/b\n', ' a/b',
    ]) {
      expect(() => repositories([value])).toThrow();
    }
  });

  it('validates required selection and positive integer lookback before collection', () => {
    for (const args of [
      [], [REPO, '--days'], [REPO, '--days', '0'], [REPO, '--days', '-1'],
      [REPO, '--days', '1.5'], [REPO, '--days', 'no'], [REPO, '--unknown'],
      [REPO, '--days', '7\n'], ['https://github.com/a/b'],
    ]) {
      expect(() => parseArgs(args)).toThrow();
    }
    expect(parseArgs([REPO])).toEqual({ repos: [REPO], days: 30, help: false });
    expect(parseArgs(['--days', '7', REPO, 'example/widget']))
      .toEqual({ repos: [REPO], days: 7, help: false });
    expect(parseArgs([REPO, '--days=7']))
      .toEqual({ repos: [REPO], days: 7, help: false });
    expect(parseArgs(['--help'])).toEqual({ repos: [], days: 30, help: true });
  });

  it('encodes query parameters without changing the selected repository path', () => {
    const path = endpoint(REPO, 'notifications', { all: 'true', since: SINCE });
    expect(path.split('?')[0]).toBe(`repos/${REPO}/notifications`);
    expect(Object.fromEntries(new URLSearchParams(path.split('?')[1])))
      .toEqual({ per_page: '100', all: 'true', since: SINCE });
  });
});

describe('github-attention pagination and transport', () => {
  it('flattens every unkeyed, keyed and requested-reviewer page', async () => {
    const api = new Pages({
      list: [[{ id: 1 }], [], [{ id: 2 }]],
      checks: [{ check_runs: [{ id: 3 }] }, { check_runs: [{ id: 4 }] }],
      requests: [
        { users: [{ login: 'alice' }], teams: [] },
        { users: [], teams: [{ id: 7 }] },
      ],
      user: [{ login: 'alice' }],
    });
    expect(await api.rows('list')).toEqual([{ id: 1 }, { id: 2 }]);
    expect(await api.rows('checks', 'check_runs')).toEqual([{ id: 3 }, { id: 4 }]);
    expect(await api.reviewers('requests')).toEqual([[{ login: 'alice' }], [{ id: 7 }]]);
    expect(await api.one('user')).toEqual({ login: 'alice' });
  });

  it('does not turn malformed objects, collections or capped workflows into empty success', async () => {
    const api = new Pages({
      broken: [{ message: 'denied' }],
      badKey: [{ check_runs: {} }],
      badUsers: [{ users: null, teams: [] }],
      badTeams: [{ users: [], teams: {} }],
      cap: [{ total_count: 1000, workflow_runs: [] }],
      multi: [{ login: 'alice' }, { login: 'bob' }],
      list: [[{ id: 1 }]],
    });
    for (const call of [
      () => api.rows('broken'), () => api.rows('badKey', 'check_runs'),
      () => api.reviewers('broken'), () => api.reviewers('badUsers'),
      () => api.reviewers('badTeams'), () => api.rows('cap', 'workflow_runs'),
      () => api.one('multi'), () => api.one('list'),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(ApiError);
    }
  });

  it('invokes gh as a strict paginated github.com GET', async () => {
    const env = await ghFixture(`
      const expected = ['api', '--hostname', 'github.com', '--method', 'GET', '--paginate', '--slurp', 'user'];
      if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(1);
      console.log(JSON.stringify([{ login: 'alice' }]));
    `);
    const { stdout } = await child(`
      import { GitHub } from ${JSON.stringify(SCRIPT)};
      console.log(JSON.stringify(await new GitHub().get('user')));
    `, env);
    expect(JSON.parse(stdout)).toEqual([{ login: 'alice' }]);
  });

  it('reports HTTP status without echoing credential-bearing subprocess stderr', async () => {
    const env = await ghFixture(`
      console.error('gh: forbidden (HTTP 403) synthetic-token-must-not-escape');
      process.exit(1);
    `);
    const { stdout, stderr } = await child(`
      import { ApiError, GitHub } from ${JSON.stringify(SCRIPT)};
      try { await new GitHub().get('user'); throw new Error('Expected failure'); }
      catch (error) {
        if (!(error instanceof ApiError)) throw error;
        console.log(error.message);
      }
    `, env);
    expect(stdout).toContain('HTTP 403');
    expect(stdout + stderr).not.toContain('synthetic-token');
  });

  it('rejects invalid JSON and malformed slurped top-level responses', async () => {
    for (const response of ['not-json', '{}', '[]', 'null']) {
      const env = await ghFixture(`console.log(${JSON.stringify(response)});`);
      const { stdout } = await child(`
        import { ApiError, GitHub } from ${JSON.stringify(SCRIPT)};
        try { await new GitHub().get('user'); throw new Error('Expected failure'); }
        catch (error) {
          if (!(error instanceof ApiError)) throw error;
          console.log('REPORTABLE_API_ERROR');
        }
      `, env);
      expect(stdout.trim()).toBe('REPORTABLE_API_ERROR');
    }
  });

  it('kills a timed-out gh process and reports incomplete coverage', async () => {
    const env = await ghFixture('exec /bin/sleep 5', '#!/bin/sh');
    const { stdout } = await child(`
      const originalSetTimeout = globalThis.setTimeout;
      let accelerated = false;
      globalThis.setTimeout = (callback, delay, ...args) => {
        if (delay === 120000) { delay = 10; accelerated = true; }
        return originalSetTimeout(callback, delay, ...args);
      };
      try {
        const { ApiError, GitHub } = await import(${JSON.stringify(SCRIPT)});
        const started = performance.now();
        try { await new GitHub().get('user'); throw new Error('Expected timeout'); }
        catch (error) {
          if (!(error instanceof ApiError)) throw error;
          console.log(JSON.stringify({ message: error.message, elapsed: performance.now() - started, accelerated }));
        }
      } finally {
        globalThis.setTimeout = originalSetTimeout;
      }
    `, env);
    const result = JSON.parse(stdout);
    expect(result.accelerated).toBe(true);
    expect(result.message).toContain('timed out');
    expect(result.message).toContain('coverage incomplete');
    expect(result.elapsed).toBeLessThan(4000);
  });
});

describe('github-attention review decisions', () => {
  function reasons(
    reviews: ReturnType<typeof review>[] = [],
    users: { login: string }[] = [],
    teams: { id: number; slug: string }[] = [],
    memberships: Set<number> | null = null,
  ) {
    return reviewReasons(pr(1), reviews, users, teams, memberships, 'alice');
  }

  it('keeps approval quiet despite comments until an explicit same-head re-request', () => {
    const reviews = [review(1, 'APPROVED'), review(2, 'COMMENTED')];
    expect(reasons(reviews)).toEqual([]);
    expect(reasons(reviews, [{ login: 'ALICE' }])).toEqual([
      [0, expect.stringContaining('Direct review')],
    ]);
  });

  it('reconsiders approvals and requested changes when the head changes', () => {
    for (const state of ['APPROVED', 'CHANGES_REQUESTED']) {
      expect(reasons([review(1, state, 'old')])).toEqual([
        [1, expect.stringContaining('Head changed')],
      ]);
    }
  });

  it('treats dismissal as a candidate until superseded by a new approval', () => {
    const dismissed = review(1, 'DISMISSED', 'old');
    expect(reasons([dismissed])).toEqual([[1, expect.stringContaining('dismissed')]]);
    expect(reasons([dismissed, review(2, 'APPROVED')])).toEqual([]);
  });

  it('uses submission time, case-insensitive reviewer identity and id tie-breaking', () => {
    const approved = review(1, 'APPROVED', 'current', 'ALICE', '2026-10-26T12:00:00Z');
    const changes = review(2, 'CHANGES_REQUESTED', 'current', 'alice', '2026-10-25T12:00:00Z');
    const pending = review(3, 'PENDING', 'current', 'alice', null);
    expect(latestReviews([approved, changes, pending]).get('alice')).toEqual(approved);
    const dismissal = review(4, 'DISMISSED', 'current', 'alice', approved.submitted_at);
    expect(latestReviews([dismissal, approved, changes]).get('alice')).toEqual(dismissal);
  });

  it('matches only visible team memberships and never invents a personal re-request after approval', () => {
    const teams = [{ id: 7, slug: 'reviewers' }, { id: 8, slug: 'unrelated' }];
    expect(reasons([], [], teams, null)).toEqual([]);
    expect(reasons([], [], teams, new Set())).toEqual([]);
    expect(reasons([], [], teams, new Set([7]))).toEqual([
      [1, expect.stringContaining('Team review requested: reviewers')],
    ]);
    expect(reasons([review(1, 'APPROVED')], [], teams, new Set([7]))).toEqual([]);
    expect(reasons([review(1, 'APPROVED')], [{ login: 'alice' }], teams, new Set([7])))
      .toEqual([[0, expect.stringContaining('Direct review')]]);
  });
});

describe('github-attention exact-head CI evidence', () => {
  it('recognizes manual workflows on the current head even with an empty rollup', () => {
    const run = {
      id: 2, workflow_id: 9, head_sha: 'current', event: 'workflow_dispatch',
      name: 'CI', status: 'completed', conclusion: 'success',
    };
    expect(ciEvidence([], [], [
      run,
      { ...run, id: 3, head_sha: 'other', conclusion: 'failure' },
    ], 'current')).toEqual([[], [], 1]);
  });

  it('uses the newest record per check producer, status context and exact-head workflow', () => {
    const checks = [
      { id: 2, app: { id: 2 }, name: 'build', status: 'completed', conclusion: 'success' },
      { id: 1, app: { id: 2 }, name: 'build', status: 'completed', conclusion: 'failure' },
      { id: 3, app: { id: 2 }, name: 'test', status: 'in_progress', conclusion: null },
    ];
    const statuses = [
      { id: 2, context: 'external', state: 'success' },
      { id: 1, context: 'external', state: 'error' },
    ];
    const run = {
      id: 2, workflow_id: 9, head_sha: 'current', name: 'manual',
      event: 'workflow_dispatch', status: 'completed', conclusion: 'success',
    };
    expect(ciEvidence(checks, statuses, [
      { ...run, id: 1, conclusion: 'failure' }, run,
    ], 'current')).toEqual([[], ['test'], 3]);
    expect(ciEvidence([
      checks[0],
      { ...checks[1], app: { id: 8 } },
    ], [], [], 'current')).toEqual([['build'], [], 1]);
  });

  it('handles null check producers and distinguishes failures from pending statuses', () => {
    expect(ciEvidence([
      { id: 1, app: null, name: 'external', status: 'completed', conclusion: 'failure' },
    ], [
      { id: 1, context: 'queued', state: 'pending' },
    ], [], 'current')).toEqual([['external'], ['queued'], 0]);
  });
});

describe('github-attention report collection', () => {
  it('uses current work over stale notifications, deduplicates items and only queries selected repositories', async () => {
    const data = baseData();
    addPr(data, pr(1), { reviews: [review(1, 'APPROVED')], users: [{ login: 'alice' }] });
    addPr(data, pr(2), { reviews: [review(1, 'APPROVED')] });
    addPr(data, pr(3), { reviews: [review(1, 'DISMISSED', 'old')] });
    addPr(data, pr(4), { teams: [{ id: 7, slug: 'reviewers' }] });
    const issue = {
      id: 9, number: 9, state: 'open', title: 'Assigned issue', assignees: [{ login: 'ALICE' }],
    };
    data[endpoint(REPO, 'issues', { state: 'open', assignee: 'alice' })] = [
      [{ ...pr(1), pull_request: {} }], [issue],
    ];
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [
      [notification(1), notification(2, 'review_requested')],
      [notification(9, 'mention', 'issues'), notification(10, 'mention', 'issues'),
        notification(99, 'mention', 'pulls', 'Unselected/Other')],
    ];
    data[`repos/${REPO}/issues/9`] = [issue];
    data[`repos/${REPO}/issues/10`] = [{ number: 10, state: 'closed' }];
    data[endpoint(REPO, 'issues/1/comments')] = [[{
      id: 31, user: { login: 'someone' }, body: '@ALICE please check',
    }]];
    data[endpoint(REPO, 'pulls/1/comments')] = [[]];
    data[endpoint(REPO, 'issues/2/comments')] = [[]];
    data[endpoint(REPO, 'pulls/2/comments')] = [[]];
    data[endpoint(REPO, 'issues/9/comments')] = [[]];
    const { api, report } = await collect(data, repositories([REPO, 'example/widget']));
    expect([...report.items.keys()].sort()).toEqual([1, 3, 4, 9].map((n) => `example/widget#${n}`));
    expect(report.suppressed).toBe(1);
    const item = report.items.get('example/widget#1');
    expect(item?.section).toBe(0);
    expect(item?.reasons).toContain('Direct review requested now (including any re-request)');
    expect(item?.reasons.some((reason) => reason.includes('Direct mention'))).toBe(true);
    expect(report.items.get('example/widget#9')?.kind).toBe('issues');
    expect(item?.reasons.some((reason) => reason.includes('assigned'))).toBe(false);
    const rendered = report.render();
    expect(rendered.split(`](https://github.com/${REPO}/pull/1)`).length - 1).toBe(1);
    expect(rendered).not.toContain('Unselected/Other');
    expect(rendered).toContain('2026-10-27T00:00:00Z');
    expect(rendered).toContain(SINCE);
    expect(api.calls.every((path) =>
      path === 'user' || path === 'user/teams?per_page=100' || path.startsWith(`repos/${REPO}/`),
    )).toBe(true);
    expect(api.calls).not.toContain(`repos/Unselected/Other/pulls/99`);
  });

  it('retains the same issue number independently in different selected repositories', async () => {
    const other = 'Example/Other';
    const data = baseData([REPO, other]);
    for (const repo of [REPO, other]) {
      addPr(data, pr(1), { repo, users: [{ login: 'alice' }] });
    }
    const { report } = await collect(data, [REPO, other]);
    expect([...report.items.keys()].sort()).toEqual(['example/other#1', 'example/widget#1']);
    expect(report.render()).toContain(`https://github.com/${REPO}/pull/1`);
    expect(report.render()).toContain(`https://github.com/${other}/pull/1`);
  });

  it('excludes closed and merged PRs and issues before fetching their conversation or review data', async () => {
    const data = baseData();
    data[endpoint(REPO, 'pulls', { state: 'open' })] = [[
      { ...pr(1), state: 'closed' },
      { ...pr(2), merged_at: '2026-10-26T00:00:00Z' },
    ]];
    data[endpoint(REPO, 'issues', { state: 'open', assignee: 'alice' })] = [[
      { id: 3, number: 3, state: 'closed', title: 'Closed', assignees: [{ login: 'alice' }] },
      { ...pr(4), pull_request: {}, assignees: [{ login: 'alice' }] },
    ]];
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [[
      notification(1), notification(2), notification(5, 'mention', 'issues'),
    ]];
    data[`repos/${REPO}/issues/5`] = [{ number: 5, state: 'closed' }];
    const { api, report } = await collect(data);
    expect(report.items.size).toBe(0);
    expect(report.stats.join('\n')).toContain('3 closed/merged conversations excluded');
    expect(api.calls.some((path) => path.includes('/comments') || path.includes('/reviews'))).toBe(false);
  });

  it('does not follow forged or cross-repository notification subject URLs', async () => {
    const data = baseData();
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [[
      { ...notification(1), subject: { type: 'PullRequest', url: 'https://elsewhere.invalid/repos/Example/Widget/pulls/1' } },
      { ...notification(2), subject: { type: 'PullRequest', url: 'https://api.github.com/repos/Unselected/Other/pulls/2' } },
      notification(3, 'mention', 'pulls', 'Unselected/Other'),
    ]];
    const { api, report } = await collect(data);
    expect(report.items.size).toBe(0);
    expect(api.calls).toHaveLength(5);
    expect(report.warnings).toHaveLength(1);
  });

  it('separates team mentions, login prefixes, email text and direct replies', async () => {
    const data = baseData();
    addPr(data, pr(1));
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [[notification(1, 'comment')]];
    data[endpoint(REPO, 'issues/1/comments')] = [[{
      id: 2, body: '@alice-other @EXAMPLE/reviewers user@alice.example', user: { login: 'someone' },
    }]];
    data[endpoint(REPO, 'pulls/1/comments')] = [[
      { id: 4, body: 'question', user: { login: 'ALICE' } },
      { id: 5, body: 'answer', user: { login: 'someone' }, in_reply_to_id: 4 },
    ]];
    const { report } = await collect(data);
    const item = report.items.get('example/widget#1');
    expect(item?.section).toBe(2);
    expect(item?.reasons[0]).toContain('Team mention in conversation');
    expect(item?.reasons[0]).toContain('Reply to your review comment');
    expect(item?.reasons[0]).not.toContain('Direct mention');
  });

  it('finds replies after approval even when the thread reason remains review_requested', async () => {
    const data = baseData();
    addPr(data, pr(1), { reviews: [review(1, 'APPROVED')] });
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [[notification(1, 'review_requested')]];
    data[endpoint(REPO, 'issues/1/comments')] = [[]];
    data[endpoint(REPO, 'pulls/1/comments')] = [[
      { id: 4, body: 'question', user: { login: 'alice' } },
      { id: 5, body: 'answer', user: { login: 'someone' }, in_reply_to_id: 4 },
    ]];
    const { report } = await collect(data);
    const item = report.items.get('example/widget#1');
    expect(item?.section).toBe(2);
    expect(item?.reasons.some((reason) => reason.includes('Reply to your review comment'))).toBe(true);
    expect(item?.reasons.some((reason) => reason.includes('Direct review requested'))).toBe(false);
    expect(report.suppressed).toBe(1);
  });

  it('does not turn subscribed-thread chatter into personal participation', async () => {
    const data = baseData();
    addPr(data, pr(1));
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [[notification(1, 'subscribed')]];
    data[endpoint(REPO, 'issues/1/comments')] = [[
      { id: 2, body: 'general update', user: { login: 'someone' } },
    ]];
    data[endpoint(REPO, 'pulls/1/comments')] = [[]];
    const { report } = await collect(data);
    expect(report.items.size).toBe(0);
  });

  it('does not infer a direct mention from prefixes, emails, own text or unrelated replies', async () => {
    const data = baseData();
    addPr(data, pr(1));
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [[notification(1, 'comment')]];
    data[endpoint(REPO, 'issues/1/comments')] = [[
      { id: 2, body: '@alice-other user@alice.example @alice/reviewers', user: { login: 'someone' } },
      { id: 3, body: '@alice', user: { login: 'ALICE' } },
    ]];
    data[endpoint(REPO, 'pulls/1/comments')] = [[
      { id: 4, body: 'question', user: { login: 'someone' } },
      { id: 5, body: 'answer', user: { login: 'another' }, in_reply_to_id: 4 },
    ]];
    const { report } = await collect(data);
    const reason = report.items.get('example/widget#1')?.reasons[0];
    expect(reason).toContain('Conversation update after participation');
    expect(reason).not.toContain('Direct mention');
    expect(reason).not.toContain('Reply to your review comment');
  });

  it('retains notification mention signals without pretending the response is unresolved', async () => {
    const data = baseData();
    addPr(data, pr(1));
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = [[notification(1)]];
    data[endpoint(REPO, 'issues/1/comments')] = [[]];
    data[endpoint(REPO, 'pulls/1/comments')] = [[]];
    const { report } = await collect(data);
    const item = report.items.get('example/widget#1');
    expect(item?.section).toBe(2);
    expect(item?.reasons[0]).toContain('Direct mention signal from notification');
    expect(item?.reasons[0]).toContain('response/resolution unknown');
  });

  it('retains direct work with partial access without fabricating team coverage', async () => {
    const data = baseData();
    data['user/teams?per_page=100'] = new ApiError('HTTP 403');
    data[endpoint(REPO, 'notifications', { all: 'true', since: SINCE })] = new ApiError('HTTP 429');
    addPr(data, pr(1), { users: [{ login: 'alice' }], teams: [{ id: 7, slug: 'reviewers' }] });
    const { report } = await collect(data);
    expect(report.warnings).toHaveLength(2);
    expect(report.items.get('example/widget#1')?.reasons).toEqual([
      expect.stringContaining('Direct review'),
    ]);
    expect(report.render()).toContain('Partial coverage');
    expect(report.stats.join('\n')).toContain('unavailable notification threads');
  });

  it('reports review access failure as partial even without identified personal work', async () => {
    const data = baseData();
    addPr(data, pr(1));
    data[endpoint(REPO, 'pulls/1/reviews')] = new ApiError('HTTP 403');
    const { report } = await collect(data);
    expect(report.items.size).toBe(0);
    expect(report.warnings).toHaveLength(1);
    expect(report.render()).toContain('coverage is partial');
  });

  it('places unchanged requested changes in waiting and shared approved requests in information', async () => {
    const data = baseData();
    addPr(data, pr(1), { reviews: [review(1, 'CHANGES_REQUESTED')] });
    addPr(data, pr(2), { reviews: [review(1, 'APPROVED')], teams: [{ id: 7, slug: 'reviewers' }] });
    const { report } = await collect(data);
    expect(report.items.get('example/widget#1')?.section).toBe(1);
    expect(report.items.get('example/widget#2')?.section).toBe(2);
    expect(report.items.get('example/widget#2')?.reasons[0]).toContain('team re-request timing unavailable');
    expect(report.suppressed).toBe(1);
  });

  it('returns a nonzero main result while printing retained partial work', async () => {
    const data = baseData();
    addPr(data, pr(1), { users: [{ login: 'alice' }] });
    data['user/teams?per_page=100'] = new ApiError('HTTP 403');
    const { stdout } = await runMain(data);
    expect(stdout).toContain('RETURN_CODE=2');
    expect(stdout).toContain(`https://github.com/${REPO}/pull/1`);
    expect(stdout).toContain('Partial coverage');
  });

  it('returns success for complete coverage and rejects missing or invalid arguments without API access', async () => {
    const complete = await runMain(baseData());
    expect(complete.stdout).toContain('RETURN_CODE=0');
    for (const args of [[], [REPO, '--days', '0']]) {
      const result = await runMain({}, args);
      expect(result.stdout).toContain('RETURN_CODE=2');
      expect(result.stdout + result.stderr).not.toContain('Unexpected API access');
    }
  });

  it('escapes untrusted titles instead of injecting terminal controls or Markdown links', () => {
    const value = text('\u001b[31m[x](https://elsewhere.invalid)\n`run this`\u0000');
    expect(value).not.toContain('\u001b');
    expect(value).not.toContain('\u0000');
    expect(value).not.toContain('\n');
    expect(value).toContain('\\[x\\]');
    expect(value).toContain('\\`run this\\`');
  });
});

describe('github-attention authored pull requests', () => {
  it('classifies requested changes, conflicts and current-head manual workflow failure as action', async () => {
    const data = authoredData(pr(1, 'ALICE'), {
      reviews: [review(1, 'CHANGES_REQUESTED', 'current', 'reviewer')],
      detail: { mergeable_state: 'dirty' },
      runs: [{
        id: 4, workflow_id: 8, head_sha: 'current', event: 'workflow_dispatch',
        name: 'CI', status: 'completed', conclusion: 'failure',
      }],
    });
    const { api, report } = await collect(data);
    const item = report.items.get('example/widget#1');
    expect(item?.section).toBe(0);
    expect(item?.reasons.some((reason) => reason.includes('Changes requested by reviewer'))).toBe(true);
    expect(item?.reasons.some((reason) => reason.includes('merge conflicts'))).toBe(true);
    expect(item?.reasons.some((reason) => reason.includes('Failing checks/workflows'))).toBe(true);
    expect(item?.reasons.some((reason) => reason.includes('waiting for review'))).toBe(false);
    expect(api.calls).not.toContain(endpoint(REPO, 'pulls/1/requested_reviewers'));
  });

  it('keeps successful exact-head workflows in waiting without claiming merge readiness', async () => {
    const data = authoredData(pr(1, 'alice'), {
      runs: [{
        id: 4, workflow_id: 8, head_sha: 'current', event: 'workflow_dispatch',
        name: 'CI', status: 'completed', conclusion: 'success',
      }],
    });
    const { report } = await collect(data);
    const item = report.items.get('example/widget#1');
    expect(item?.section).toBe(1);
    expect(item?.reasons.some((reason) => reason.includes('1 successful/neutral/skipped'))).toBe(true);
    expect(item?.reasons.some((reason) => reason.includes('not proof all required checks passed'))).toBe(true);
    expect(item?.reasons.some((reason) => reason.includes('waiting for review/merge decision'))).toBe(true);
  });

  it('distinguishes pending CI, empty evidence and inaccessible evidence without fabricating failure', async () => {
    const pending = await collect(authoredData(pr(1, 'alice'), {
      checks: [{ id: 1, app: null, name: 'CI', status: 'queued', conclusion: null }],
    }));
    expect(pending.report.items.get('example/widget#1')?.section).toBe(1);
    expect(pending.report.items.get('example/widget#1')?.reasons.some((reason) => reason.includes('Checks/workflows pending'))).toBe(true);
    const empty = await collect(authoredData(pr(1, 'alice')));
    expect(empty.report.items.get('example/widget#1')?.reasons.some((reason) => reason.includes('No check/status/workflow records returned'))).toBe(true);
    const data = authoredData(pr(1, 'alice'));
    data[endpoint(REPO, 'actions/runs', { head_sha: 'current' })] = new ApiError('HTTP 403');
    const inaccessible = await collect(data);
    expect(inaccessible.report.warnings).toHaveLength(1);
    const reasons = inaccessible.report.items.get('example/widget#1')?.reasons ?? [];
    expect(reasons.some((reason) => reason.includes('CI evidence incomplete'))).toBe(true);
    expect(reasons.some((reason) => reason.includes('Failing checks/workflows'))).toBe(false);
  });

  it('excludes authored PRs closed or merged after the initial list and warns on a changed head', async () => {
    for (const detail of [{ state: 'closed' }, { merged_at: '2026-10-26T00:00:00Z' }]) {
      const { api, report } = await collect(authoredData(pr(1, 'alice'), { detail }));
      expect(report.items.size).toBe(0);
      expect(api.calls.some((path) => path.includes('/commits/') || path.includes('/actions/'))).toBe(false);
    }
    const { report } = await collect(authoredData(pr(1, 'alice'), {
      detail: { head: { sha: 'changed-during-collection' } },
    }));
    expect(report.warnings).toEqual([expect.stringContaining('head changed during collection')]);
  });
});
