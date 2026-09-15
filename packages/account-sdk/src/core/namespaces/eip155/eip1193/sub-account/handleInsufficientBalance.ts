import { InsufficientBalanceErrorData, standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { Address } from ':core/type/index.js';
import type { Store } from ':store/store.js';
import { assertPresence } from ':util/assertPresence.js';
import { PublicClient } from 'viem';
import { routeThroughGlobalAccount } from './routeThroughGlobalAccount.js';
import { presentSubAccountFundingDialog } from './utils.js';

export async function handleInsufficientBalanceError({
  globalAccountAddress,
  subAccountAddress,
  client,
  request,
  globalAccountRequest,
  spendPermissions,
  paymasterUrls,
}: {
  errorData: InsufficientBalanceErrorData;
  globalAccountAddress: Address;
  subAccountAddress: Address;
  request: RequestArguments;
  client: PublicClient;
  globalAccountRequest: (request: RequestArguments) => Promise<unknown>;
  spendPermissions: Store['eip155']['spendPermissions'];
  paymasterUrls?: Record<number, string>;
}) {
  const chainId = client.chain?.id;
  assertPresence(chainId, standardErrors.rpc.internal(`invalid chainId`));

  try {
    await presentSubAccountFundingDialog();
  } catch {
    throw standardErrors.provider.userRejectedRequest({
      message: 'User cancelled funding',
    });
  }

  const result = await routeThroughGlobalAccount({
    request,
    globalAccountAddress,
    subAccountAddress,
    client,
    globalAccountRequest,
    chainId,
    spendPermissions,
    paymasterUrls,
  });

  return result;
}
