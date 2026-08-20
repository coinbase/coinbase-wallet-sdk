import { standardErrors } from ':core/error/errors.js';
import type { Popup } from ':core/popup/types.js';
import { RequestArguments } from ':core/provider/interface.js';
import { eip155Caip2 } from ':core/session/caip.js';
import { ensureSession } from ':core/session/ensureSession.js';
import { projectEthAccounts } from ':core/session/index.js';
import { pair } from ':core/session/pair.js';
import { hexStringFromNumber } from ':core/type/util.js';
import { switchChainId } from './chainParams.js';

/**
 * EIP-1193 methods before a session exists.
 *
 * - `eth_accounts` / `eth_chainId` / `net_version` return empty / default values.
 * - `eth_requestAccounts` opens the popup and pairs (`addSubAccount` injected when
 *   `creation: 'on-connect'`).
 * - `wallet_connect` opens the popup and pairs with the dapp's params (SIWE, spend
 *   permissions, addSubAccount, …).
 * - `wallet_sendCalls` / `wallet_sign` are one-shot: handshake, send, wipe keys.
 */
export async function handleDisconnected(runtime: Popup, args: RequestArguments): Promise<unknown> {
  switch (args.method) {
    case 'eth_accounts':
      return [];
    case 'net_version':
      return 1;
    case 'eth_chainId':
      return hexStringFromNumber(1);
    case 'wallet_switchEthereumChain': {
      runtime.helpers.account.set({ chain: { id: switchChainId(args.params) } });
      return undefined;
    }
    case 'eth_requestAccounts': {
      const { session } = await ensureSession({
        session: undefined,
        requiredScopes: [eip155Caip2(runtime.chainId())],
        pair: () => pair(runtime),
      });
      return projectEthAccounts(session);
    }
    case 'wallet_connect': {
      const { result } = await ensureSession({
        session: undefined,
        requiredScopes: [eip155Caip2(runtime.chainId())],
        pair: () => pair(runtime, args),
      });
      return result;
    }
    case 'wallet_sendCalls':
    case 'wallet_sign': {
      try {
        await runtime.handshake({ method: 'handshake' });
        return runtime.send(args);
      } finally {
        await runtime.cleanup();
      }
    }
    default:
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
  }
}
