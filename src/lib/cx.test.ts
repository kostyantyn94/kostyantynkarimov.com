import { describe, expect, it } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
  it('joins class names with single spaces', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('skips falsy values', () => {
    const active = false;
    expect(cx('base', active && 'active', null, undefined, '')).toBe('base');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cx(false, null)).toBe('');
  });
});
