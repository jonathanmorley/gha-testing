# gha-testing

Exemplar monorepo for polyglot tooling on GitHub Actions. Currently TypeScript-only; the goal is a known-good Nx + pnpm + mise setup that generalizes to more languages.

Bazel counterpart: [jonathanmorley/bazel-example](https://github.com/jonathanmorley/bazel-example) (Bazel + Rust, publishes a zip to GitHub Releases).

## Packages

| Package                           | Description                                                         |
| --------------------------------- | ------------------------------------------------------------------- |
| `packages/typescript-library`     | Publishable `hello()` library. See its README.                      |
| `packages/typescript-application` | Runnable app printing `hello('World')`. See its README.             |
| `packages/release-smoke`          | Hermetic release smoke tests (never published). See its README.     |
| `packages/release-e2e`            | Live release E2E in ephemeral repos (never on PRs). See its README. |

## Prerequisites

[mise](https://mise.jdx.dev/) provides Node `24.20.0` and pnpm `10.34.5` (see `mise.toml`). Run `mise trust` once, then `mise install`.

## Commands

```bash
pnpm install
pnpm nx affected --target=build          # tsc -b, with ^build deps
pnpm nx affected --target=lint           # oxlint
pnpm nx affected --target=unit-test      # vitest --dir=tests/unit
pnpm nx affected --target=integration-test  # vitest --dir=tests/integration (builds first)
pnpm nx affected --target=fmt            # dprint check (root only)
pnpm nx affected --target=fmt --configuration=fix  # dprint fmt
```

Target defaults live in `nx.json`. Per-package `nx.targets` entries inherit them.

## CI

`pull.yaml` (on `pull_request` and `push`) delegates to reusable `shared.yaml`, which builds a plan matrix over `fmt/build/lint/unit-test/integration-test` and fans out to `pnpm nx affected --target=<targets>` with `nx-set-shas` so only affected projects run. `pull.yaml` documents optional sharding/parallelization overrides in comments.

## Automation status

- Renovate: active (dependency and lock-file-maintenance PRs in history). No local config; uses shared `jonathanmorley/renovate-config`.
- Dependabot security updates: enabled. Dependabot Updates workflow active.
- CodeQL: active workflow (default setup, no local config file).
- Branch protection (`Default branch protection` ruleset): linear history, signed commits, PR with resolved threads, squash/rebase merges only. Auto-merge allowed, merge queue not configured.

## Release

Version with `nx release` locally (independent versions, `{projectName}@{version}` tags, per-project changelogs — see `nx.json`), push the tags, and `release.yaml` publishes to GitHub Packages plus a GitHub Release carrying the `npm pack` tarball, an SPDX SBOM, and SLSA attestation. Supply-chain provenance comes from `attest-build-provenance` on the release assets rather than `npm --provenance`, whose support on GitHub Packages is uncertain. Full maintainer flow lives in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Roadmap

1. [#176](https://github.com/jonathanmorley/gha-testing/issues/176) Repo hygiene (done).
2. [#177](https://github.com/jonathanmorley/gha-testing/issues/177) Release pipeline (done — this slice).
3. [#178](https://github.com/jonathanmorley/gha-testing/issues/178) Hermetic release smoke tests (done — `packages/release-smoke`).
4. [#179](https://github.com/jonathanmorley/gha-testing/issues/179) Live GitHub E2E from namespaced testbed refs (done — `packages/release-e2e`, self-cleaning, Octo STS auth).
5. [#180](https://github.com/jonathanmorley/gha-testing/issues/180) Polyglot proof (Python + Rust) and Nx-vs-Bazel writeup.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
