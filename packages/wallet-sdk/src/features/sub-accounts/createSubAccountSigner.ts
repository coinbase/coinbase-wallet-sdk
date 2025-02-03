import { Hex, http, SignableMessage, TypedDataDefinition } from 'viem';
import {
  createPaymasterClient,
  toCoinbaseSmartAccount,
  ToCoinbaseSmartAccountReturnType,
} from 'viem/account-abstraction';
import { baseSepolia } from 'viem/chains';

import { SubAccount } from ':stores/sub-accounts/store.js';
import { AddAddressResponse } from './types.js';
import { RequestArguments } from ':core/provider/interface.js';
import { getBundlerClient, getClient } from ':stores/chain-clients/utils.js';

async function toSmartAccount({
  subAccount,
}: {
  subAccount: AddAddressResponse;
}): Promise<ToCoinbaseSmartAccountReturnType> {
  const { getSigner } = SubAccount.getState();
  if (!getSigner) {
    throw new Error('get signer not found');
  }

  const signer = await getSigner();
  if (!signer) {
    throw new Error('signer not found');
  }

  // TODO[jake] how do we handle unsupported chains
  const client = getClient(subAccount.chainId ?? baseSepolia.id);
  if (!client) {
    throw new Error('client not found');
  }

  return toCoinbaseSmartAccount({
    address: subAccount.address,
    client,
    owners: [subAccount.root, signer],
    ownerIndex: 1,
  });
}

export async function createSubAccountSigner(subAccount: AddAddressResponse) {
  const account = await toSmartAccount({
    subAccount,
  });
  return {
    request: async (args: RequestArguments): Promise<Hex> => {
      switch (args.method) {
        case 'eth_sendTransaction': {
          return account.sign(args.params as { hash: Hex });
        }
        case 'wallet_sendCalls': {
          if (!Array.isArray(args.params)) {
            throw new Error('invalid params');
          }
          // Get the paymaster URL from the requests capabilities
          const paymasterURL = args.params[0]?.capabilities?.paymasterService?.url;
          let paymaster;
          if (paymasterURL) {
            paymaster = createPaymasterClient({
              transport: http(paymasterURL),
            });
          }
          // Get the bundler client for the chain
          const chainId = args.params[0]?.chainId;
          if (!chainId) {
            throw new Error('chainId is required');
          }
          const bundlerClient = getBundlerClient(chainId);

          // Send the user operation
          return await bundlerClient.sendUserOperation({
            account,
            calls: args.params[0].calls,
            paymaster,
          });
        }
        case 'wallet_sendPreparedCalls': {
          throw new Error('Not implemented');
        }
        case 'personal_sign': {
          if (!Array.isArray(args.params)) {
            throw new Error('invalid params');
          }
          return account.signMessage({ message: args.params[0] } as {
            message: SignableMessage;
          });
        }
        case 'eth_signTypedData_v4': {
          if (!Array.isArray(args.params)) {
            throw new Error('invalid params');
          }
          return account.signTypedData(args.params[1] as TypedDataDefinition);
        }
        default:
          throw new Error('Not supported');
      }
    },
  };
}
