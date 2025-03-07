/**
 * Deep merges two objects or arrays, recursively merging nested properties.
 * Arrays are concatenated with duplicates removed, objects are merged,
 * primitives are overwritten.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns The merged object
 */
export function deepMerge<T extends object, S extends object>(target: T, source: S): T & S {
  // Handle edge cases
  if (!source || typeof source !== 'object') {
    return source as unknown as T & S;
  }

  if (!target || typeof target !== 'object') {
    return { ...(source as object) } as T & S;
  }

  // Create a new object to avoid modifying the inputs
  const result = { ...target } as Record<string, unknown>;

  // Process each property in the source object
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    const sourceValue = (source as Record<string, unknown>)[key];

    // Handle null/undefined source values
    if (sourceValue === null || sourceValue === undefined) {
      result[key] = sourceValue;
      continue;
    }

    // Handle arrays - concatenate with duplicate removal
    if (Array.isArray(sourceValue)) {
      if (!Array.isArray(result[key])) {
        // Target is not an array, so use source array
        result[key] = [...sourceValue];
      } else {
        // Concatenate arrays and remove duplicates
        const targetArray = result[key] as unknown[];

        // For primitive arrays, we can use Set to remove duplicates
        if (isPrimitiveArray(sourceValue) && isPrimitiveArray(targetArray)) {
          result[key] = [...new Set([...targetArray, ...sourceValue])];
        } else {
          // For complex objects, we need to do deep comparison
          // This is a simpler approach that may not catch all duplicates
          // but prevents obvious duplicates when merging arrays of objects
          const merged = [...targetArray];

          for (const item of sourceValue) {
            if (!containsEquivalent(merged, item)) {
              merged.push(item);
            }
          }

          result[key] = merged;
        }
      }
      continue;
    }

    // Handle nested objects
    if (
      typeof sourceValue === 'object' &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key], sourceValue);
    } else {
      // For primitives or when target doesn't have the key, simply override
      result[key] = sourceValue;
    }
  }

  return result as T & S;
}

/**
 * Check if an array contains only primitive values
 */
function isPrimitiveArray(arr: unknown[]): boolean {
  return arr.every(
    (item) =>
      item === null ||
      item === undefined ||
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean'
  );
}

/**
 * Basic check if an array already contains an equivalent object
 * This is a simple implementation that works for most cases
 */
function containsEquivalent(array: unknown[], item: unknown): boolean {
  if (typeof item !== 'object' || item === null) {
    return array.includes(item);
  }

  // For objects, check JSON string representation
  // This is a simple approach but works for most cases
  const itemStr = JSON.stringify(item);
  return array.some(
    (element) =>
      typeof element === 'object' && element !== null && JSON.stringify(element) === itemStr
  );
}
