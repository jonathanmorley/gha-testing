import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

export function projectDir(name: string): string {
  return join(workspaceRoot, 'packages', name);
}

export function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 });
}

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

export function remove(path: string): void {
  rmSync(path, { force: true, recursive: true });
}

export function readPackageVersion(dir: string): string {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version: string };
  return manifest.version;
}

export function bumpPatch(version: string): string {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}
