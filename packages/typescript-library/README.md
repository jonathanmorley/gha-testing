# typescript-library

Publishable TypeScript library. Exports `hello(name)` returning `` `Hello ${name}!` ``.

## Use

```ts
import { hello } from 'typescript-library';

console.log(hello('World')); // Hello World!
```

## Develop

```bash
pnpm nx affected --target=build --projects=typescript-library
pnpm nx affected --target=unit-test --projects=typescript-library
```

Unit tests live in `tests/unit/*.test.ts` and run with `vitest --dir=tests/unit`.
