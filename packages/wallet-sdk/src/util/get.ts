export function get(obj: unknown, path: string): unknown {
  if (typeof obj !== 'object' || obj === null) return undefined;
  return path
    .split(/[.[\]]+/)
    .filter(Boolean)
    .reduce<unknown>((value, key) => {
      if (typeof value === 'object' && value !== null) {
        return (value as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
}
