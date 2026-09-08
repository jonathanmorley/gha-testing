import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { it } from 'vitest';
import { projectDir, readPackageVersion, remove, run, tempDir } from './helpers.js';

it('should pack, install, and run the published library', { timeout: 180_000 }, async ({ expect }) => {
  const dir = projectDir('typescript-library');
  const version = readPackageVersion(dir);
  const tarball = join(dir, `jonathanmorley-typescript-library-${version}.tgz`);
  const installDir = tempDir('release-smoke-lib');
  try {
    if (existsSync(tarball)) rmSync(tarball);
    run('pnpm', ['pack'], dir);
    expect(existsSync(tarball)).toBe(true);

    const contents = run('tar', ['-tzf', tarball], dir);
    expect(contents).toContain('package/dist/src/index.js');
    expect(contents).toContain('package/package.json');
    expect(contents).not.toContain('package/src/index.ts');
    expect(contents).not.toContain('package/tests/');

    writeFileSync(
      join(installDir, 'package.json'),
      JSON.stringify({ name: 'smoke-lib', private: true, type: 'module' })
    );
    run('pnpm', ['add', tarball], installDir);

    const installed = join(
      installDir,
      'node_modules',
      '@jonathanmorley',
      'typescript-library',
      'dist',
      'src',
      'index.js'
    );
    expect(existsSync(installed)).toBe(true);
    const installedPackage = (await import(pathToFileURL(installed).href)) as {
      hello: (name: string) => string;
    };
    expect(installedPackage.hello('Smoke')).toBe('Hello Smoke!');
  } finally {
    remove(installDir);
    if (existsSync(tarball)) rmSync(tarball);
  }
});
