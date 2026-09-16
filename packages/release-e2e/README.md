# release-e2e

Live release end-to-end test. Runs only via `e2e-release.yaml` (`workflow_dispatch` or weekly schedule), never on PRs.

The suite stages this repo at HEAD into the `gh-testbed` repo under an `it-*` namespace (branch `<ns>/patch`, tag `<ns>/<project>@<version>` with a unique `0.0.0-e2e.*` version), waits for that repo's own `release.yaml` to publish to GitHub Packages and cut a GitHub Release, then installs both packages from GitHub Packages and runs them. Cleanup deletes the release (with its tag), the branch, and the published package versions; leftover `it-*` refs are swept by the testbed nightly cleanup. Nothing is ever created in `gha-testing` itself.

Authentication is split by capability. Git, release, and Actions API calls use Octo STS: the workflow mints a short-lived token scoped to the testbed repo (trust policy at `gh-testbed/.github/chainguard/gha-testing-e2e.sts.yaml`). Package registry reads and version deletions use a classic PAT instead, because those endpoints only honor PATs — installation tokens get 404s even with `packages:write`. That PAT lives in the `TESTBED_PACKAGES_TOKEN` secret (classic, `read:packages` + `write:packages` + `delete:packages`; unpublish needs the write scope) and reaches the suite as `PACKAGES_TOKEN`.

## Run locally

Danger: creates real releases and packages in `gh-testbed`. Requires `GH_TOKEN` with classic scopes `repo`, `write:packages`, `delete:packages` (any PAT covering both roles works locally, so `PACKAGES_TOKEN` may point at the same token):

```bash
GH_TOKEN="$(gh auth token)" PACKAGES_TOKEN="$(gh auth token)" pnpm nx run @jonathanmorley/release-e2e:live-e2e
```
