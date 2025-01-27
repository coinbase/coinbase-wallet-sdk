/**
 * Compresses a JSON string by removing unnecessary whitespace while preserving structure
 *
 * Safari throws "SyntaxError: JSON Parse error: Unrecognized token ' '" during
 * JSON.parse the JSON string contains newlines, so this function prevents that error.
 *
 * @param jsonString - The JSON string to compress
 * @returns The compressed JSON string with minimal whitespace
 *
 * @example
 * ```ts
 * const json = `{
 *   "name": "John",
 *   "age": 30
 * }`;
 *
 * compressJsonString(json); // Returns '{"name":"John","age":30}'
 * ```
 */
export const compressJsonString = (jsonString: string): string => {
  // Combine all patterns into a single regex for better performance
  // This matches:
  // - Any whitespace after colons
  // - Any whitespace after commas
  // - All newlines and tabs
  // - Any whitespace after opening braces/brackets
  // - Any whitespace before closing braces/brackets
  const whitespacePattern = /(?::\s+|,\s+|[\n\t]|{\s+|\s+}|\[\s+|\s+\])/g;

  // Replace function that determines what to use as replacement
  return jsonString.replace(whitespacePattern, (match) => {
    if (match.startsWith(':')) return ':';
    if (match.startsWith(',')) return ',';
    if (match.startsWith('{')) return '{';
    if (match.startsWith('[')) return '[';
    if (match.endsWith('}')) return '}';
    if (match.endsWith(']')) return ']';
    return ''; // for newlines and tabs
  });
};
