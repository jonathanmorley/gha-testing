import { randomBytes } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import {
  APP,
  LIB,
  OWNER,
  TESTBED,
  deletePackageVersion,
  gh,
  gitAuthArgs,
  info,
  poll,
  remove,
  run,
  tempDir,
  token,
  workspaceRoot
} from './helpers.js';

it('should publish and install a full release from the testbed repo', { timeout: 1_200_000 }, async () => {
  const pat = token();
  const sha = (process.env.GITHUB_SHA ?? run('git', ['rev-parse', 'HEAD'], workspaceRoot)).trim().slice(0, 12);
  const stamp = Date.now().toString(36);
  const rand = randomBytes(4).toString('hex');
  // Namespace mirrors allocateNamespace in gh-testbed/src/alloc.ts: every
  // ref this test creates matches it-*, so the testbed nightly cleanup
  // sweeps stragglers even though cleanup below always runs.
  const namespace = `it-${stamp}-${rand}`;
  const version = `0.0.0-e2e.${stamp}.${rand.slice(0, 4)}`;
  const branch = `${namespace}/patch`;
  const tag = `${namespace}/${LIB}@${version}`;
  info(`E2E from ${sha}: testbed refs ${branch} and ${tag}`);

  const stage = tempDir('release-e2e-stage');
  const installDir = tempDir('release-e2e-install');
  try {
    stageTree(stage, version, sha);
    pushTree(stage, branch, tag, pat);
    await pollRelease(tag);
    await pollRegistry(version, installDir, pat);
    const { appOutput, greeting } = await installAndRun(version, installDir);
    expect(greeting).toBe('Hello Live!');
    expect(appOutput).toBe('Hello World!');
    expect(run('git', ['tag', '--list', '*-e2e*'], workspaceRoot).trim()).toBe('');
    expect(run('git', ['ls-remote', 'origin', 'refs/tags/*-e2e*'], workspaceRoot).trim()).toBe('');
  } finally {
    await cleanup(namespace, branch, tag, version, stage, installDir, pat);
  }
});

function stageTree(stage: string, version: string, sha: string): void {
  run('git', ['archive', 'HEAD', '-o', join(stage, 'tree.tar')], workspaceRoot);
  run('tar', ['-xf', 'tree.tar'], stage);
  rmSync(join(stage, 'tree.tar'));
  for (const name of ['typescript-library', 'typescript-application']) {
    const dir = join(stage, 'packages', name);
    const manifestPath = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version: string };
    manifest.version = version;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`);
    writeFileSync(
      join(dir, 'CHANGELOG.md'),
      `# Changelog\n\n## ${version} (${new Date().toISOString().slice(0, 10)})\n\nE2E fixture entry from ${sha}.\n`
    );
  }
  run('pnpm', ['install', '--lockfile-only'], stage);
  run('git', ['init', '-b', 'main'], stage);
  const identity = ['-c', 'user.name=release-e2e', '-c', 'user.email=release-e2e@users.noreply.github.com'];
  run('git', [...identity, 'add', '-A'], stage);
  run('git', [...identity, 'commit', '-m', `e2e release ${version} from ${sha}`], stage);
}

function testbedUrl(): string {
  return `https://github.com/${OWNER}/${TESTBED}.git`;
}

function pushTree(stage: string, branch: string, tag: string, pat: string): void {
  const auth = gitAuthArgs(pat);
  run('git', [...auth, 'push', testbedUrl(), `main:${branch}`], stage);
  run('git', [...auth, 'tag', tag], stage);
  run('git', [...auth, 'push', testbedUrl(), tag], stage);
}

async function pollRelease(tag: string): Promise<void> {
  try {
    await poll(`GitHub Release ${tag}`, 30, 20_000, () => {
      gh(['release', 'view', tag, '--repo', `${OWNER}/${TESTBED}`, '--json', 'tagName'], workspaceRoot);
      return true;
    });
  } catch (error) {
    const runs = gh(['run', 'list', '--repo', `${OWNER}/${TESTBED}`, '--limit', '5'], workspaceRoot);
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nRecent runs:\n${runs}`, {
      cause: error
    });
  }
}

async function pollRegistry(version: string, installDir: string, pat: string): Promise<void> {
  writeFileSync(
    join(installDir, '.npmrc'),
    `@jonathanmorley:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${pat}\n`
  );
  await poll(`GitHub Packages ${LIB}@${version}`, 30, 20_000, () => {
    const found = run('npm', ['view', `${LIB}@${version}`, 'version'], installDir);
    return found.trim() === version;
  });
}

async function installAndRun(version: string, installDir: string): Promise<{ appOutput: string; greeting: string }> {
  writeFileSync(
    join(installDir, 'package.json'),
    JSON.stringify({ name: 'smoke-live', private: true, type: 'module' })
  );
  run('pnpm', ['add', `${LIB}@${version}`, `${APP}@${version}`], installDir);

  const hello = join(installDir, 'node_modules', LIB, 'dist', 'src', 'index.js');
  const entrypoint = join(installDir, 'node_modules', APP, 'dist', 'src', 'index.js');
  const installed = (await import(pathToFileURL(hello).href)) as { hello: (name: string) => string };
  return { appOutput: run(process.execPath, [entrypoint], installDir).trim(), greeting: installed.hello('Live') };
}

async function cleanup(
  namespace: string,
  branch: string,
  tag: string,
  version: string,
  stage: string,
  installDir: string,
  pat: string
): Promise<void> {
  let released = true;
  try {
    gh(['release', 'delete', tag, '--repo', `${OWNER}/${TESTBED}`, '--cleanup-tag', '--yes'], workspaceRoot);
  } catch (error) {
    released = false;
    info(`Cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
  }
  // The tag outlives a missing release (--cleanup-tag only applies when the
  // release exists), so delete the ref explicitly to stay self-cleaning.
  if (!released) {
    try {
      gh(['api', `repos/${OWNER}/${TESTBED}/git/refs/tags/${tag}`, '--method', 'DELETE'], workspaceRoot);
    } catch (error) {
      info(`Cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  try {
    gh(['api', `repos/${OWNER}/${TESTBED}/git/refs/heads/${branch}`, '--method', 'DELETE'], workspaceRoot);
  } catch (error) {
    info(`Cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
  }
  await Promise.all(
    [LIB, APP].map(async project => {
      try {
        await deletePackageVersion(project, version);
      } catch (error) {
        info(`Cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
  );
  remove(stage);
  remove(installDir);
  try {
    const refs = run(
      'git',
      [...gitAuthArgs(pat), 'ls-remote', testbedUrl(), `refs/heads/${namespace}/*`, `refs/tags/${namespace}/*`],
      workspaceRoot
    );
    if (refs.trim() !== '') {
      info(`Cleanup warning: leftover testbed refs for ${namespace} (nightly cleanup sweeps it-* refs):\n${refs}`);
    }
  } catch (error) {
    info(`Cleanup warning: could not verify testbed refs: ${error instanceof Error ? error.message : String(error)}`);
  }
}
