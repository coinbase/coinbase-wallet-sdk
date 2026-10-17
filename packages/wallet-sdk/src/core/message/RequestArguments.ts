/** Chain-neutral JSON-RPC request shape shared by runtimes and adapters. */
export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}
