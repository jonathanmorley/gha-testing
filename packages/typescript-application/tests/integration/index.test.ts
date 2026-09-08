import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { it } from 'vitest';

it('should print hello world', ({ expect }) => {
  const entrypoint = resolve('dist/src/index.js');
  const output = execFileSync(process.execPath, [entrypoint], { encoding: 'utf8' });
  expect(output.trim()).toBe('Hello World!');
});
