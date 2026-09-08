import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'vitest';
import { projectDir, readPackageVersion, remove, run, tempDir } from './helpers.js';

const LIB = '@jonathanmorley/typescript-library';

it('should pack, install, and run the published application', { timeout: 240_000 }, ({ expect }) => {
  const libDir = projectDir('typescript-library');
  const appDir = projectDir('typescript-application');
  const appVersion = readPackageVersion(appDir);
  const appTarball = join(appDir, `jonathanmorley-typescript-application-${appVersion}.tgz`);
  const unpackDir = tempDir('release-smoke-app-unpack');
  const installDir = tempDir('release-smoke-app');
  // Pack the library into the unique unpack dir because the library test
  // packs the same tarball name in place, and test files run in parallel
  // workers. Only this file writes the application tarball, so packing it
  // in place is safe.
  const stagedLibTarball = join(unpackDir, `jonathanmorley-typescript-library-${readPackageVersion(libDir)}.tgz`);
  try {
    if (existsSync(appTarball)) rmSync(appTarball);
    run('pnpm', ['pack', '--pack-destination', unpackDir], libDir);
    run('pnpm', ['pack'], appDir);
    expect(existsSync(stagedLibTarball)).toBe(true);
    expect(existsSync(appTarball)).toBe(true);

    const contents = run('tar', ['-tzf', appTarball], appDir);
    expect(contents).toContain('package/dist/src/index.js');
    expect(contents).not.toContain('package/src/index.ts');

    // Simulate what `pnpm publish` does to workspace:* ranges so the install
    // stays hermetic. The real tarball points the dependency at GPR instead,
    // which the live E2E in #179 verifies.
    run('tar', ['-xzf', appTarball, '-C', unpackDir], appDir);
    const manifestPath = join(unpackDir, 'package', 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      dependencies: Record<string, string>;
    };
    manifest.dependencies[LIB] = `file:${stagedLibTarball}`;
    writeFileSync(manifestPath, JSON.stringify(manifest, undefined, 2));
    run('pnpm', ['pack'], join(unpackDir, 'package'));
    const fixedTarball = join(unpackDir, 'package', `jonathanmorley-typescript-application-${appVersion}.tgz`);
    expect(existsSync(fixedTarball)).toBe(true);

    writeFileSync(
      join(installDir, 'package.json'),
      JSON.stringify({ name: 'smoke-app', private: true, type: 'module' })
    );
    run('pnpm', ['add', fixedTarball], installDir);

    const entrypoint = join(
      installDir,
      'node_modules',
      '@jonathanmorley',
      'typescript-application',
      'dist',
      'src',
      'index.js'
    );
    expect(existsSync(entrypoint)).toBe(true);
    const output = run(process.execPath, [entrypoint], installDir);
    expect(output.trim()).toBe('Hello World!');
  } finally {
    remove(unpackDir);
    remove(installDir);
    if (existsSync(appTarball)) rmSync(appTarball);
  }
});
