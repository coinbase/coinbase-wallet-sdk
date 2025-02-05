import { Address, Hex, http, SignableMessage, TypedDataDefinition } from 'viem';
import { createPaymasterClient, toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { baseSepolia } from 'viem/chains';

import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { getBundlerClient, getClient } from ':stores/chain-clients/utils.js';
import { SubAccountInfo, subaccounts } from ':stores/sub-accounts/store.js';
import { assertArrayPresence, assertPresence } from ':util/assertPresence.js';
import { get } from ':util/get.js';

export async function createSubAccountSigner(subaccount: SubAccountInfo) {
  const { getSigner } = subaccounts.getState();
  assertPresence(getSigner, standardErrors.rpc.invalidParams('getSigner not found'));

  const signer = await getSigner();
  assertPresence(signer, standardErrors.rpc.invalidParams('signer not found'));

  // TODO[jake] how do we handle unsupported chains
  const client = getClient(subaccount.chainId ?? baseSepolia.id);
  assertPresence(client, standardErrors.rpc.invalidParams('client not found'));

  const account = await toCoinbaseSmartAccount({
    address: subaccount.address,
    client,
    owners: [subaccount.root, signer],
    ownerIndex: 1,
  });

  return {
    request: async (args: RequestArguments): Promise<Hex> => {
      switch (args.method) {
        case 'eth_sendTransaction': {
          assertArrayPresence(args.params);
          return account.sign(args.params[0] as { hash: Hex });
        }
        case 'wallet_sendCalls': {
          assertArrayPresence(args.params);

          // Get the paymaster URL from the requests capabilities
          const paymasterURL = get(args.params[0], 'capabilities.paymasterService.url') as string;
          let paymaster;
          if (paymasterURL) {
            paymaster = createPaymasterClient({
              transport: http(paymasterURL),
            });
          }
          // Get the bundler client for the chain
          const chainId = get(args.params[0], 'chainId') as number;
          assertPresence(chainId, standardErrors.rpc.invalidParams('chainId is required'));

          const bundlerClient = getBundlerClient(chainId);
          assertPresence(
            bundlerClient,
            standardErrors.rpc.invalidParams('bundler client not found')
          );

          // Send the user operation
          return await bundlerClient.sendUserOperation({
            account,
            calls: get(args.params[0], 'calls') as { to: Address; data: Hex }[],
            paymaster,
          });
        }
        case 'wallet_sendPreparedCalls': {
          throw new Error('Not implemented');
        }
        case 'personal_sign': {
          assertArrayPresence(args.params);
          return account.signMessage({ message: args.params[0] } as {
            message: SignableMessage;
          });
        }
        case 'eth_signTypedData_v4': {
          assertArrayPresence(args.params);
          return account.signTypedData(args.params[1] as TypedDataDefinition);
        }
        default:
          throw new Error('Not supported');
      }
    },
  };
}
