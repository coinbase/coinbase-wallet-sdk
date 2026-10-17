import type { Session } from ':core/session/types.js';
import type { Address } from ':core/type/index.js';
import { EIP155_NAMESPACE, formatEip155ChainId } from './caip.js';
import { EIP155_METHODS } from './methods.js';

/**
 * Build a Session from a flat eip155 address list.
 *
 * Test-only: the real thing comes from `sessionFromCaip25Result`. `chains` seeds the
 * wallet chain catalog, which is what makes a chain selectable — it never widens
 * authorization. Excluded from the build in `tsconfig.build.json`.
 */
export function sessionFromAccounts(opts: {
  accounts: Address[];
  chainId?: number;
  chains?: number[];
}): Session {
  const catalog = opts.chains ?? (opts.chainId === undefined ? [] : [opts.chainId]);
  return {
    namespaces: {
      [EIP155_NAMESPACE]: { accounts: [...opts.accounts], methods: [...EIP155_METHODS] },
    },
    ...(catalog.length > 0
      ? {
          properties: {
            chainMetadata: Object.fromEntries(catalog.map((id) => [formatEip155ChainId(id), {}])),
          },
        }
      : {}),
  };
}
