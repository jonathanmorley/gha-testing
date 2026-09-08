import { it } from 'vitest';
import { bumpPatch, projectDir, readPackageVersion, run, workspaceRoot } from './helpers.js';

const LIB = '@jonathanmorley/typescript-library';

it('should plan a patch version bump', { timeout: 120_000 }, ({ expect }) => {
  const next = bumpPatch(readPackageVersion(projectDir('typescript-library')));
  const output = run('pnpm', ['nx', 'release', 'version', 'patch', '--dry-run', `--projects=${LIB}`], workspaceRoot);
  expect(output).toContain(`New version ${next} written to manifest`);
});

it('should preview the changelog entry', { timeout: 120_000 }, ({ expect }) => {
  const next = bumpPatch(readPackageVersion(projectDir('typescript-library')));
  const output = run(
    'pnpm',
    ['nx', 'release', 'changelog', next, '--dry-run', '--first-release', `--projects=${LIB}`],
    workspaceRoot
  );
  expect(output).toContain(`## ${next}`);
  expect(output).toContain('CHANGELOG.md');
});
