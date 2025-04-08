import { it } from 'vitest';
import { hello } from '../../src/index.js';

it('should return hello world', ({ expect }) => {
  const result = hello('World');
  expect(result).toBe('Hello World!');
});
