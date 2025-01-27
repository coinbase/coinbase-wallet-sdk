/**
 * Compresses a JSON string by removing all whitespace, tabs, and newlines except within string values
 *
 * Safari throws "SyntaxError: JSON Parse error: Unrecognized token ' '" during
 * JSON.parse when the JSON string contains newlines, so this function prevents that error.
 *
 * @param jsonString - The JSON string to compress
 * @returns The JSON string with all whitespace, tabs, and newlines removed except within string values
 *
 * @example
 * ```ts
 * const json = `{
 *   "name": "John Doe",
 *   "title": "Senior \n Developer"
 * }`;
 *
 * compressJsonString(json); // Returns '{"name":"John Doe","title":"Senior \n Developer"}'
 * ```
 */
export const compressJsonString = (jsonString: string): string => {
  if (!jsonString) return '';

  return jsonString.replace(/("[^"\\]*(?:\\.[^"\\]*)*")|[\s\n\t]+/g, (match, group) =>
    group ? group : ''
  );
};
