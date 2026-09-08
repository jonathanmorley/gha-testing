# release-smoke

Hermetic release smoke tests. Never published to a registry.

Each test replays part of the real release end to end without touching the network: `pnpm pack` the workspace packages, install the tarballs into an isolated temp project, run the installed code, and dry-run `nx release version`/`changelog` to validate the release configuration. The live publish path (GitHub Packages, GitHub Release) is exercised by #179 instead.

Runs on every PR via the standard `integration-test` target.
