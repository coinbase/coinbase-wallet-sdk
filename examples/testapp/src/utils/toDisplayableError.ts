/**
 * Make a thrown value safe to render with `JSON.stringify`.
 *
 * The SDK rejects with a plain serialized object (`{ code, message, docUrl }`) rather
 * than an `Error`, so the usual `error instanceof Error ? error.message : String(error)`
 * falls through to `String` and prints `[object Object]`. Objects are already the useful
 * shape; it is `Error` that needs unpacking, because its `message` is non-enumerable and
 * `JSON.stringify(new Error('x'))` is `{}`.
 */
export function toDisplayableError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  // Spread picks up enumerable extras like `code` and `data` without shadowing these.
  return { name: error.name, message: error.message, ...error };
}
