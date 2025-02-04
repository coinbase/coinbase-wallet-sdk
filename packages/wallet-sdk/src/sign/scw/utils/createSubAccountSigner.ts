import { Address, Hex, http, SignableMessage, TypedDataDefinition } from 'viem';
import { createPaymasterClient, toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { baseSepolia } from 'viem/chains';

import { RequestArguments } from ':core/provider/interface.js';
import { getBundlerClient, getClient } from ':stores/chain-clients/utils.js';
import { SubAccount, SubAccountInfo } from ':stores/sub-accounts/store.js';
import { assetArrayPresence, assetPresence } from ':util/assertPresence.js';
import { get } from ':util/get.js';

export async function createSubAccountSigner(subaccount: SubAccountInfo) {
  const { getSigner } = SubAccount.getState();
  assetPresence(getSigner, 'getSigner not found');

  const signer = await getSigner();
  assetPresence(signer, 'signer not found');

  // TODO[jake] how do we handle unsupported chains
  const client = getClient(subaccount.chainId ?? baseSepolia.id);
  assetPresence(client, 'client not found');

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
          assetArrayPresence(args.params);
          return account.sign(args.params[0] as { hash: Hex });
        }
        case 'wallet_sendCalls': {
          assetArrayPresence(args.params);

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
          assetPresence(chainId, 'chainId is required');

          const bundlerClient = getBundlerClient(chainId);
          assetPresence(bundlerClient, 'bundler client not found');

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
          assetArrayPresence(args.params);
          return account.signMessage({ message: args.params[0] } as {
            message: SignableMessage;
          });
        }
        case 'eth_signTypedData_v4': {
          assetArrayPresence(args.params);
          return account.signTypedData(args.params[1] as TypedDataDefinition);
        }
        default:
          throw new Error('Not supported');
      }
    },
  };
}
