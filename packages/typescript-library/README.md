# typescript-library

Publishable TypeScript library. Exports `hello(name)` returning `` `Hello ${name}!` ``.

## Install

Published to GitHub Packages on every release. Point the scope at GPR once:

```ini
# .npmrc
@jonathanmorley:registry=https://npm.pkg.github.com
```

then authenticate with a token that can read packages (`GITHUB_TOKEN` works in Actions):

```bash
pnpm add @jonathanmorley/typescript-library
```

## Use

```ts
import { hello } from '@jonathanmorley/typescript-library';

console.log(hello('World')); // Hello World!
```

## Develop

```bash
pnpm nx affected --target=build --projects=@jonathanmorley/typescript-library
pnpm nx affected --target=unit-test --projects=@jonathanmorley/typescript-library
```

Unit tests live in `tests/unit/*.test.ts` and run with `vitest --dir=tests/unit`.
