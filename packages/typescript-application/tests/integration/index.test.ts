import { it } from 'vitest';
import { setTimeout } from 'node:timers/promises';

it('should wait for 10 seconds', { timeout: 15_000 }, async ({ expect }) => {
  await setTimeout(10_000);
  expect(true).toBe(true);
});
