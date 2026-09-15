import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { GetSubAccountsResponse } from ':core/rpc/wallet_getSubAccount.js';
import type { Session } from ':core/session/types.js';
import type { Store } from ':store/store.js';
import { assertArrayPresence } from ':util/assertPresence.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import { fetchRPCRequest } from ':util/provider.js';
import { rpcUrlForEip155Chain } from '../../session.js';

/**
 * `wallet_getSubAccounts`: cached store value, else the chain RPC URL from handshake.
 */
export async function getSubAccounts(
  store: Store['eip155'],
  args: RequestArguments,
  session: Session,
  chainId: number
) {
  const cached = store.subAccounts.get();
  if (cached?.address) {
    return { subAccounts: [cached] };
  }

  const rpcUrl = rpcUrlForEip155Chain(session, chainId);
  if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');

  const response = (await fetchRPCRequest(args, rpcUrl)) as GetSubAccountsResponse;
  assertArrayPresence(response.subAccounts, 'subAccounts');
  if (response.subAccounts.length > 0) {
    assertSubAccount(response.subAccounts[0]);
    store.subAccounts.set({
      address: response.subAccounts[0].address,
      factory: response.subAccounts[0].factory,
      factoryData: response.subAccounts[0].factoryData,
    });
  }
  return response;
}
