export type ActionResult<T> =
  | {
      value: T;
    }
  | {
      error: Error;
    };
