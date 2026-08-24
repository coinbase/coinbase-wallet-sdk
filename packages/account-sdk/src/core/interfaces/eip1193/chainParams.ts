import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { ensureIntNumber } from ':core/type/util.js';

/** Parse `wallet_switchEthereumChain` params into a numeric chain id. */
export function switchChainId(params: RequestArguments['params']): number {
  if (!Array.isArray(params) || !params[0] || typeof params[0] !== 'object') {
    throw standardErrors.rpc.invalidParams();
  }
  return ensureIntNumber((params[0] as { chainId?: unknown }).chainId);
}
