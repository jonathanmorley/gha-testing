# Contributing

## Setup

```bash
mise trust
mise install
pnpm install
```

Work in an isolated worktree under the repo-root `.worktrees/` directory (e.g. `git worktree add .worktrees/<topic> -b <topic>`).

## Daily workflow

```bash
pnpm nx affected --target=fmt --configuration=fix
pnpm nx affected --target=build
pnpm nx affected --target=lint
pnpm nx affected --target=unit-test
pnpm nx affected --target=integration-test
```

`integration-test` depends on `build`, so the built output in `dist/` exists when integration tests run. `test` is an alias for `unit-test`.

## Conventions

- Formatting: [dprint](https://dprint.dev/) with the prettier plugin (`dprint.json`: single quotes, no trailing commas). Check with `fmt`, fix with `--configuration=fix`.
- Lint: [oxlint](https://oxc.rs/) (`.oxlintrc.json`); `oxlint --fix` via the `lint --configuration=fix` Nx configuration.
- Tests: [vitest](https://vitest.dev/) (`vitest.config.js`: no watch, pass with no tests). Unit tests live in `tests/unit/`, integration tests in `tests/integration/`, named `*.test.ts`. Import sources via relative `../../src/index.js` paths and use the `({ expect })` fixture-arg style.
- TypeScript: project references via `tsc -b`; packages extend the root `tsconfig.json` (`@tsconfig/node22`).
- Keep coverage high; prefer exercising behavior (pack/install/run) over asserting file contents.

## Release (maintainers)

Versions are independent per package. The flow is split: `nx release` versions locally, `release.yaml` publishes on tag push.

```bash
mise x -- pnpm nx release version patch --projects=@jonathanmorley/typescript-library
git push origin main '@jonathanmorley/typescript-library@*'
```

`nx release version` bumps the manifest, updates the lockfile, writes the changelog, and commits + tags (no push — see the `release` block in `nx.json`). Bumping the library also bumps the application, since it depends on the library. Pushing a `{projectName}@{version}` tag triggers `release.yaml`, which builds, publishes to GitHub Packages, and creates a GitHub Release with the packed tarball, an SPDX SBOM, and SLSA attestation. Republish of an existing version fails by design; cut a new version instead.

Validate without mutating anything via `workflow_dispatch` with `dry_run: true` on an existing tag.

## Pull requests

- Keep PRs small and focused on a single concern.
- Run formatter, linter, and affected tests before pushing (CI runs them anyway).
- Commit often to preserve progress; do not push unless asked (CI still validates the PR).
- Add the `ai:autofix` label so automation can fix up the branch (e.g. `gh pr edit --add-label "ai:autofix"`).
- Always open a PR for completed work; direct pushes to `main` are blocked by branch protection (linear history, signed commits).
