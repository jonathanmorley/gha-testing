import { describe, it } from 'vitest';
import { normalizeVersion } from '../live/helpers.js';

describe('normalizeVersion', () => {
  it('should leave versions without numeric prereleases alone', ({ expect }) => {
    expect(normalizeVersion('1.0.0')).toBe('1.0.0');
    expect(normalizeVersion('0.0.0-e2e.mu4l0mvc.a9f3')).toBe('0.0.0-e2e.mu4l0mvc.a9f3');
  });

  it('should strip leading zeros from numeric prerelease identifiers', ({ expect }) => {
    expect(normalizeVersion('0.0.0-e2e.mu4n7i5r.0202')).toBe('0.0.0-e2e.mu4n7i5r.202');
  });
});
