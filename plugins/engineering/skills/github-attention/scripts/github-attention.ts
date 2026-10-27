#!/usr/bin/env bun
/** Read-only GitHub attention report. Requires Bun and authenticated gh. */

export type Row = Record<string, any>;
export type Entry = {
  repo: string;
  number: number;
  title: string;
  kind: 'pull' | 'issues';
  section: number;
  priority: number;
  reasons: string[];
};

export class ApiError extends Error {}

export function repositories(values: string[]): string[] {
  const result = new Map<string, string>();
  for (const value of values) {
    if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+(?![\s\S])/.test(value)) {
      throw new Error(`Expected owner/repo, not ${JSON.stringify(value)}`);
    }
    if (['.', '..'].includes(value.split('/')[1]!)) {
      throw new Error('Repository name cannot be a path segment');
    }
    if (!result.has(value.toLowerCase())) result.set(value.toLowerCase(), value);
  }
  return [...result.values()];
}

export class GitHub {
  async get(path: string): Promise<any[]> {
    // Only constructed API paths: no shell, remote URLs, or mutating methods.
    if (!/^(?:user(?:\/teams)?|repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+)(?:\?[^\s]*)?(?![\s\S])/.test(path)
      || path.split('?')[0]!.split('/').some(part => part === '.' || part === '..')) {
      throw new ApiError('invalid GitHub API path');
    }
    let child;
    try {
      child = Bun.spawn(['gh', 'api', '--hostname', 'github.com', '--method', 'GET', '--paginate', '--slurp', path], {
        stdout: 'pipe', stderr: 'pipe',
      });
    } catch {
      throw new ApiError('gh is not installed or could not be started');
    }
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 120_000);
    let stdout: string;
    let stderr: string;
    let code: number;
    try {
      [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
    } catch {
      throw new ApiError(timedOut ? 'request timed out; coverage incomplete' : 'could not read gh response; coverage incomplete');
    } finally {
      clearTimeout(timer);
    }
    if (timedOut) throw new ApiError('request timed out; coverage incomplete');
    if (code !== 0) {
      // Never echo stderr: it can contain credentials or local information.
      const status = /HTTP (\d{3})/.exec(stderr);
      throw new ApiError(`${status ? `HTTP ${status[1]}` : `gh exit ${code}`}; check gh auth/access or API rate limits locally`);
    }
    let pages: unknown;
    try { pages = JSON.parse(stdout); } catch { throw new ApiError('invalid JSON from gh'); }
    if (!Array.isArray(pages) || pages.length === 0) throw new ApiError('unexpected paginated response from gh');
    return pages;
  }

  async one(path: string): Promise<Row> {
    const pages = await this.get(path);
    if (pages.length !== 1 || !isObject(pages[0])) throw new ApiError('expected one object');
    return pages[0]!;
  }

  async rows(path: string, key?: string): Promise<Row[]> {
    const result: Row[] = [];
    for (const page of await this.get(path)) {
      const rows = key && isObject(page) ? page[key] : page;
      if (!Array.isArray(rows)) throw new ApiError('expected a paginated list');
      result.push(...rows);
      if (key === 'workflow_runs' && page.total_count >= 1000) {
        throw new ApiError("workflow runs reach GitHub's 1,000-result filtered-query cap");
      }
    }
    return result;
  }

  async reviewers(path: string): Promise<[Row[], Row[]]> {
    const users: Row[] = [], teams: Row[] = [];
    for (const page of await this.get(path)) {
      if (!isObject(page) || !Array.isArray(page.users) || !Array.isArray(page.teams)) {
        throw new ApiError('expected requested users and teams');
      }
      users.push(...page.users);
      teams.push(...page.teams);
    }
    return [users, teams];
  }
}

function isObject(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function endpoint(repo: string, suffix: string, params: Record<string, string | number> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ per_page: 100, ...params })) query.set(key, String(value));
  return `repos/${repo}/${suffix}?${query}`;
}

export function latestReviews(reviews: Row[]): Map<string, Row> {
  const latest = new Map<string, Row>();
  const sorted = [...reviews].sort((a, b) => compare(a.submitted_at || '', b.submitted_at || '') || a.id - b.id);
  for (const review of sorted) {
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.login.toLowerCase(), review);
  }
  return latest;
}

export function reviewReasons(pr: Row, reviews: Row[], users: Row[], teams: Row[], memberships: Set<number> | null, login: string): Array<[number, string]> {
  const reasons: Array<[number, string]> = [];
  const previous = latestReviews(reviews).get(login.toLowerCase());
  const approvedHead = previous?.state === 'APPROVED' && previous.commit_id === pr.head.sha;
  if (users.some(user => user.login.toLowerCase() === login.toLowerCase())) {
    reasons.push([0, 'Direct review requested now (including any re-request)']);
  }
  for (const team of teams) {
    if (memberships?.has(team.id) && !approvedHead) reasons.push([1, `Team review requested: ${team.slug} (shared request)`]);
  }
  if (previous?.state === 'DISMISSED') {
    reasons.push([1, 'Your previous review was dismissed; review again or clarify the request']);
  } else if (previous && previous.commit_id !== pr.head.sha) {
    reasons.push([1, 'Head changed since your last review; re-review candidate']);
  }
  return reasons;
}

function newest(rows: Row[], key: (row: Row) => string): Row[] {
  const result = new Map<string, Row>();
  for (const row of [...rows].sort((a, b) => b.id - a.id)) {
    const value = key(row);
    if (!result.has(value)) result.set(value, row);
  }
  return [...result.values()];
}

export function ciEvidence(checks: Row[], statuses: Row[], runs: Row[], sha: string): [string[], string[], number] {
  checks = newest(checks, row => JSON.stringify([row.app?.id ?? null, row.name]));
  statuses = newest(statuses, row => row.context);
  runs = newest(runs.filter(run => run.head_sha === sha), row => String(row.workflow_id));
  const failures: string[] = [], pending: string[] = [], successes: string[] = [];
  for (const row of [...checks, ...runs]) {
    const name = row.name || 'unnamed workflow';
    if (row.status !== 'completed') pending.push(name);
    else if (['success', 'neutral', 'skipped'].includes(row.conclusion)) successes.push(name);
    else failures.push(name);
  }
  for (const row of statuses) {
    (row.state === 'success' ? successes : row.state === 'pending' ? pending : failures).push(row.context);
  }
  return [[...new Set(failures)].sort(), [...new Set(pending)].sort(), successes.length];
}

export function text(value: unknown): string {
  return String(value).replace(/\p{C}/gu, '').trim().replace(/\s+/gu, ' ').replace(/([\\`*_{}\[\]<>|])/g, '\\$1');
}

function compare(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function timestamp(date: Date): string { return date.toISOString().replace(/\.\d{3}Z$/, 'Z'); }
function itemKey(repo: string, number: number): string { return `${repo.toLowerCase()}#${number}`; }

export class Report {
  readonly items = new Map<string, Entry>();
  readonly warnings: string[] = [];
  readonly stats: string[] = [];
  suppressed = 0;
  login = '';
  readonly now: Date;
  readonly since: string;

  constructor(readonly api: GitHub, readonly repos: string[], readonly days: number, now = new Date()) {
    this.now = now;
    this.since = timestamp(new Date(now.getTime() - days * 86_400_000));
  }

  async attempt<T>(label: string, call: () => Promise<T>, fallback: T): Promise<T> {
    try { return await call(); } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      this.warnings.push(`${label}: ${error.message}`);
      return fallback;
    }
  }

  async rows(repo: string, suffix: string, key?: string, params: Record<string, string | number> = {}): Promise<Row[] | null> {
    return this.attempt<Row[] | null>(`${repo}: ${suffix}`, () => this.api.rows(endpoint(repo, suffix, params), key), null);
  }

  add(repo: string, item: Row, section: number, reason: string, priority = 9): void {
    if (item.state !== 'open' || item.merged_at) return;
    const key = itemKey(repo, item.number);
    let entry = this.items.get(key);
    if (!entry) {
      entry = { repo, number: item.number, title: item.title, kind: 'head' in item || 'pull_request' in item ? 'pull' : 'issues', section, priority, reasons: [] };
      this.items.set(key, entry);
    }
    entry.section = Math.min(entry.section, section);
    entry.priority = Math.min(entry.priority, priority);
    if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
  }

  async collect(): Promise<void> {
    this.login = (await this.api.one('user')).login;
    const teams = await this.attempt<Row[] | null>('Team membership unavailable (team review/mention matching incomplete)', () => this.api.rows('user/teams?per_page=100'), null);
    const memberships = teams === null ? null : new Set<number>(teams.map(team => team.id));
    const teamHandles = new Set<string>((teams || []).map(team => `${team.organization.login}/${team.slug}`.toLowerCase()));
    for (const repo of this.repos) await this.collectRepo(repo, memberships, teamHandles);
  }

  async collectRepo(repo: string, memberships: Set<number> | null, teamHandles: Set<string>): Promise<void> {
    const pulls = await this.rows(repo, 'pulls', undefined, { state: 'open' });
    const assigned = await this.rows(repo, 'issues', undefined, { state: 'open', assignee: this.login });
    const notifications = await this.rows(repo, 'notifications', undefined, { all: 'true', since: this.since });
    const openPulls = pulls === null ? null : new Map<number, Row>(pulls.filter(pr => pr.state === 'open' && !pr.merged_at).map(pr => [pr.number, pr]));
    const reviewCache = new Map<number, Row[] | null>();
    for (const pr of openPulls?.values() || []) {
      const number = pr.number;
      const reviews = await this.rows(repo, `pulls/${number}/reviews`);
      reviewCache.set(number, reviews);
      if (pr.user.login.toLowerCase() === this.login.toLowerCase()) {
        await this.authored(repo, pr, reviews);
        continue;
      }
      const [users, teams] = await this.attempt<[Row[], Row[]]>(`${repo}: PR #${number} requested reviewers`, () => this.api.reviewers(endpoint(repo, `pulls/${number}/requested_reviewers`)), [[], []]);
      const reasons = reviewReasons(pr, reviews || [], users, teams, memberships, this.login);
      for (const [priority, reason] of reasons) this.add(repo, pr, 0, reason, priority);
      const previous = latestReviews(reviews || []).get(this.login.toLowerCase());
      if (!reasons.length && previous?.state === 'APPROVED' && previous.commit_id === pr.head.sha) {
        this.suppressed++;
        if (memberships !== null && teams.some(team => memberships.has(team.id))) {
          this.add(repo, pr, 2, 'Shared team request remains, but you approved this head; team re-request timing unavailable, no new personal review inferred');
        }
      }
      if (!reasons.length && previous?.state === 'CHANGES_REQUESTED' && previous.commit_id === pr.head.sha) {
        this.add(repo, pr, 1, 'Your requested changes await the author; head unchanged since your review');
      }
    }
    for (const issue of assigned || []) {
      if (!('pull_request' in issue) && (issue.assignees || []).some((user: Row) => user.login.toLowerCase() === this.login.toLowerCase())) {
        this.add(repo, issue, 0, 'Open issue assigned to you', 4);
      }
    }
    let closed = 0;
    for (const notification of notifications || []) {
      if ((notification.repository?.full_name || '').toLowerCase() !== repo.toLowerCase()) {
        this.warnings.push(`${repo}: ignored notification outside the selected repository`);
        continue;
      }
      const escapedRepo = repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = new RegExp(`^https://api\\.github\\.com/repos/${escapedRepo}/(pulls|issues)/(\\d+)(?![\\s\\S])`, 'i').exec(notification.subject.url || '');
      if (!match) continue;
      const kind = match[1]!, number = Number(match[2]);
      const item = kind === 'pulls' && openPulls !== null ? openPulls.get(number) : await this.attempt<Row | null>(`${repo}: notification subject #${number}`, () => this.api.one(`repos/${repo}/${kind}/${number}`), null);
      if (!item) {
        if (kind === 'pulls' && openPulls !== null) closed++;
        continue;
      }
      if (item.state !== 'open' || item.merged_at) { closed++; continue; }
      await this.conversation(repo, item, kind, notification, teamHandles, reviewCache.get(number));
    }
    const count = (rows: Row[] | null) => rows === null ? 'unavailable' : String(rows.length);
    const issues = assigned === null ? null : assigned.filter(row => !('pull_request' in row));
    this.stats.push(`${repo}: ${count(pulls)} open PRs; ${count(issues)} assigned issues; ${count(notifications)} notification threads; ${closed} closed/merged conversations excluded`);
  }

  async authored(repo: string, pr: Row, reviews: Row[] | null): Promise<void> {
    const number = pr.number, sha = pr.head.sha;
    const requested = [...latestReviews(reviews || []).values()].filter(row => row.state === 'CHANGES_REQUESTED').map(row => row.user.login).sort();
    const detail = await this.attempt<Row | null>(`${repo}: PR #${number} merge state`, () => this.api.one(`repos/${repo}/pulls/${number}`), null);
    if (detail && (detail.state !== 'open' || detail.merged_at)) return;
    if (requested.length) this.add(repo, pr, 0, `Changes requested by ${requested.join(', ')}`, 2);
    if (detail?.mergeable_state === 'dirty') this.add(repo, pr, 0, 'Your PR has merge conflicts', 2);
    const checks = await this.rows(repo, `commits/${sha}/check-runs`, 'check_runs', { filter: 'latest' });
    const statuses = await this.rows(repo, `commits/${sha}/statuses`);
    const runs = await this.rows(repo, 'actions/runs', 'workflow_runs', { head_sha: sha });
    const [failures, pending, successes] = ciEvidence(checks || [], statuses || [], runs || [], sha);
    if (failures.length) this.add(repo, pr, 0, `Failing checks/workflows on head ${sha.slice(0, 8)}: ${failures.join(', ')}`, 2);
    if (pending.length) this.add(repo, pr, 1, `Checks/workflows pending on head ${sha.slice(0, 8)}: ${pending.join(', ')}`);
    if (successes) this.add(repo, pr, 2, `${successes} successful/neutral/skipped check, status or workflow records on head ${sha.slice(0, 8)} (not proof all required checks passed)`);
    else if (!failures.length && !pending.length) {
      const complete = [checks, statuses, runs].every(rows => rows !== null);
      this.add(repo, pr, 2, `${complete ? 'No check/status/workflow records returned' : 'CI evidence incomplete'} for head ${sha.slice(0, 8)}; CI requirements unknown`);
    }
    if (this.items.get(itemKey(repo, number))?.section !== 0) this.add(repo, pr, 1, 'Your PR is open; waiting for review/merge decision (merge readiness not established)');
    if (detail && detail.head?.sha !== sha) this.warnings.push(`${repo}#${number}: head changed during collection; rerun before acting`);
  }

  async conversation(repo: string, item: Row, kind: string, notification: Row, teamHandles: Set<string>, reviews?: Row[] | null): Promise<void> {
    const number = item.number;
    const comments = await this.rows(repo, `issues/${number}/comments`);
    const reviewComments = kind === 'pulls' ? await this.rows(repo, `pulls/${number}/comments`) : [];
    const events = [item, ...(comments || []), ...(reviewComments || []), ...(reviews || [])];
    const ownIds = new Set((reviewComments || []).filter(row => (row.user?.login || '').toLowerCase() === this.login.toLowerCase()).map(row => row.id));
    let direct = false, team = false, replies = false;
    for (const row of events) {
      if ((row.user?.login || '').toLowerCase() === this.login.toLowerCase()) continue;
      const mentions = new Set<string>([...(row.body || '').matchAll(/(?<![\p{L}\p{N}_@])@([A-Za-z0-9-]+(?:\/[A-Za-z0-9_-]+)?)(?![\p{L}\p{N}_/-])/gu)].map(match => match[1].toLowerCase()));
      direct ||= mentions.has(this.login.toLowerCase());
      team ||= [...mentions].some(handle => teamHandles.has(handle));
      replies ||= ownIds.has(row.in_reply_to_id);
    }
    const signals: string[] = [];
    if (direct || notification.reason === 'mention') signals.push(`Direct mention${direct ? ' in conversation' : ' signal from notification'}`);
    if (team || notification.reason === 'team_mention') signals.push(`Team mention${team ? ' in conversation' : ' signal from notification'}`);
    if (replies) signals.push('Reply to your review comment');
    if (!signals.length) {
      if (!['comment', 'author'].includes(notification.reason)) return;
      signals.push('Conversation update after participation (not necessarily a reply to you)');
    }
    this.add(repo, item, 2, `${signals.join('; ')}; updated ${notification.updated_at}; response/resolution unknown, inspect thread`);
  }

  render(): string {
    const lines = [`# GitHub attention — ${text(this.login)}`, '', `Repositories: ${this.repos.join(', ')}`, `Collected: ${timestamp(this.now)}; notifications since ${this.since}`, ''];
    for (const [section, title] of ['Needs your action', 'Waiting on others', 'Informational / inspect conversation'].entries()) {
      lines.push(`## ${title}`);
      const entries = [...this.items.values()].filter(item => item.section === section).sort((a, b) => a.priority - b.priority || compare(a.repo.toLowerCase(), b.repo.toLowerCase()) || a.number - b.number);
      if (!entries.length) lines.push(this.warnings.length ? '- None found; coverage is partial (see below).' : '- None found in covered data.');
      for (const item of entries) {
        lines.push(`- [${item.repo}#${item.number}](https://github.com/${item.repo}/${item.kind}/${item.number}) ${text(item.title)}`);
        lines.push(...item.reasons.map(reason => `  - ${text(reason)}`));
      }
      lines.push('');
    }
    lines.push('## Coverage and limits', ...this.stats.map(stat => `- ${text(stat)}`),
      `- ${this.suppressed} already-approved, unchanged PRs not flagged for another personal review.`,
      '- Current open PRs, review requests/review history and assignments queried directly; notifications are not the work queue. All list endpoints paginated; no Search API or its 1,000-result cap used.',
      '- Read/unread notification threads included. Mentions/replies are bounded candidates, not unresolved tasks: done/archived, undelivered, older, inaccessible and Discussion activity may be missing. Conversation mentions can predate the notification update.',
      '- Team matching uses visible memberships; nested/hidden teams can leave gaps. Direct re-requests override prior approval; a shared team request alone does not establish a new personal request after approval of this head.',
      '- CI inspects latest check runs, statuses and exact-head workflows, including workflow_dispatch; successes do not establish required checks or merge readiness. Check runs cover at most the 1,000 most recent suites; filtered workflow runs cap at 1,000 results (warned when reached). Empty rollups do not establish missing CI.',
      '- Read-only snapshot, not atomic; current requests and new commits can change during collection.');
    if (this.warnings.length) lines.push('', '### Partial coverage — do not interpret missing items as no work', ...this.warnings.map(warning => `- ${text(warning)}`));
    return `${lines.join('\n')}\n`;
  }
}

export function parseArgs(argv: string[]): { repos: string[]; days: number; help: boolean } {
  const values: string[] = [];
  let days = 30, help = false, positional = false;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]!;
    if (!positional && arg === '--') { positional = true; continue; }
    if (!positional && (arg === '--help' || arg === '-h')) { help = true; continue; }
    if (!positional && (arg === '--days' || arg.startsWith('--days='))) {
      const value = arg === '--days' ? argv[++index] : arg.slice('--days='.length);
      if (!value || !/^[+-]?\d+(?![\s\S])/.test(value)) throw new Error('--days must be an integer');
      days = Number(value);
      if (!Number.isSafeInteger(days) || days < 1) throw new Error('--days must be positive and within the supported date range');
    } else if (!positional && arg.startsWith('-')) throw new Error(`Unknown option: ${text(arg)}`);
    else values.push(arg);
  }
  if (!help && !values.length) throw new Error('At least one owner/repo is required');
  return { repos: repositories(values), days, help };
}

export async function main(argv = process.argv.slice(2), api = new GitHub(), now?: Date): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      console.log('Usage: github-attention.ts owner/repo [owner/repo ...] [--days N]\n\nExplicit repositories only. --days sets notification lookback (default: 30); current PRs/issues have no time cutoff. Requires Bun and authenticated gh.');
      return 0;
    }
    const report = new Report(api, args.repos, args.days, now);
    await report.collect();
    process.stdout.write(report.render());
    return report.warnings.length ? 2 : 0;
  } catch (error) {
    if (error instanceof ApiError || error instanceof RangeError || error instanceof Error) {
      process.stderr.write(`github-attention: ${text(error.message)}\n`);
      return 2;
    }
    throw error;
  }
}

if (import.meta.main) process.exitCode = await main();
