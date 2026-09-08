import { describe, it } from 'vitest';
import { hello } from '../../src/index.js';

describe('hello', () => {
  it('should greet by name', ({ expect }) => {
    expect(hello('World')).toBe('Hello World!');
  });

  it('should interpolate any name', ({ expect }) => {
    expect(hello('Jane Doe')).toBe('Hello Jane Doe!');
  });

  it('should not trim input', ({ expect }) => {
    expect(hello('')).toBe('Hello !');
  });
});
