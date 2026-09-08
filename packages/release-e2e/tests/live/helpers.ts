import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OWNER = 'jonathanmorley';
export const TESTBED = 'gh-testbed';
export const LIB = '@jonathanmorley/typescript-library';
export const APP = '@jonathanmorley/typescript-application';

export const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

export function info(message: string): void {
  process.stdout.write(`${message}\n`);
}

function currentToken(): string | undefined {
  return process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
}

export function token(): string {
  const value = currentToken();
  // In CI e2e-release.yaml mints GH_TOKEN via octo-sts, so no stored secret
  // is needed. Locally there is no OIDC, so export a classic PAT instead.
  if (process.env.GITHUB_ACTIONS === 'true' && !process.env.GH_TOKEN) {
    throw new Error('Missing GH_TOKEN: the e2e-release workflow mints it via octo-sts, check the mint step.');
  }
  if (!value) {
    throw new Error('Missing GH_TOKEN: export a classic PAT with repo, write:packages, and delete:packages scopes.');
  }
  return value;
}

export function sanitize(message: string): string {
  const secret = currentToken();
  if (!secret) return message;
  // Redact both the raw token (REST/Bearer usage) and its Basic form
  // (git smart-HTTP usage, which embeds base64 in argv).
  const basic = Buffer.from(`x-access-token:${secret}`, 'utf8').toString('base64');
  return message.split(secret).join('***').split(basic).join('***');
}

export function run(command: string, args: string[], cwd: string, timeout = 120_000): string {
  try {
    return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout });
  } catch (error) {
    throw new Error(sanitize(error instanceof Error ? error.message : String(error)), { cause: error });
  }
}

export function gh(args: string[], cwd: string, timeout = 60_000): string {
  return run('gh', args, cwd, timeout);
}

// Git smart-HTTP rejects Bearer credentials ("invalid credentials") and
// wants Basic with x-access-token as the username. The REST API used by
// `gh` and fetch accepts Bearer; only git needs this form.
export function gitAuthArgs(pat: string): string[] {
  const basic = Buffer.from(`x-access-token:${pat}`, 'utf8').toString('base64');
  return ['-c', `http.extraHeader=AUTHORIZATION: basic ${basic}`];
}

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

export function remove(path: string): void {
  rmSync(path, { force: true, recursive: true });
}

export async function poll(
  description: string,
  attempts: number,
  intervalMs: number,
  check: () => boolean
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (check()) return;
    } catch {
      // Treat command failures as "not ready yet"; the timeout error carries the context.
    }
    // eslint-disable-next-line no-await-in-loop -- polling is inherently sequential.
    await new Promise(done => setTimeout(done, intervalMs));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

export async function githubApi(path: string, method = 'GET'): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token()}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    method
  });
  if (!response.ok) throw new Error(`GitHub API ${method} ${path}: ${response.status} ${await response.text()}`);
  if (response.status === 204) return undefined;
  return (await response.json()) as unknown;
}

export async function deletePackageVersion(project: string, version: string): Promise<void> {
  const name = encodeURIComponent(project);
  const versions = (await githubApi(`/users/${OWNER}/packages/npm/${name}/versions?per_page=100`)) as {
    id: number;
    name: string;
  }[];
  const match = versions.find(candidate => candidate.name === version);
  if (!match) return;
  await githubApi(`/users/${OWNER}/packages/npm/${name}/versions/${match.id}`, 'DELETE');
}
