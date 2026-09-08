# typescript-application

Runnable TypeScript app depending on `@jonathanmorley/typescript-library` (`workspace:*`). Prints `hello('World')`.

## Run

```bash
pnpm nx affected --target=build --projects=@jonathanmorley/typescript-application
node packages/typescript-application/dist/src/index.js
# Hello World!
```

## Develop

Integration tests live in `tests/integration/*.test.ts` and run with `vitest --dir=tests/integration`. The `integration-test` target depends on `build`, so tests may execute the built output in `dist/`.
