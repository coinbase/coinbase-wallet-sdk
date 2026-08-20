import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { GetSubAccountsResponse } from ':core/rpc/wallet_getSubAccount.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { assertArrayPresence } from ':util/assertPresence.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import { fetchRPCRequest } from ':util/provider.js';

/**
 * `wallet_getSubAccounts`: cached store value, else the chain RPC URL from handshake.
 */
export async function getSubAccounts(runtime: WalletRuntime, args: RequestArguments) {
  const cached = runtime.store.subAccounts.get();
  if (cached?.address) {
    return { subAccounts: [cached] };
  }

  const rpcUrl = runtime.store.account.get().chain?.rpcUrl;
  if (!rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');

  const response = (await fetchRPCRequest(args, rpcUrl)) as GetSubAccountsResponse;
  assertArrayPresence(response.subAccounts, 'subAccounts');
  if (response.subAccounts.length > 0) {
    assertSubAccount(response.subAccounts[0]);
    runtime.store.subAccounts.set({
      address: response.subAccounts[0].address,
      factory: response.subAccounts[0].factory,
      factoryData: response.subAccounts[0].factoryData,
    });
  }
  return response;
}
