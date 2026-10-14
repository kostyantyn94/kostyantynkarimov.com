export type ClassValue = string | false | null | undefined;

/** Joins class names, skipping falsy values: cx('a', cond && 'b') -> 'a b' | 'a'. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
