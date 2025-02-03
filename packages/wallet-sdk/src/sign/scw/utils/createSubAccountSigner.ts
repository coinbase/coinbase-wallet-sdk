import { Hex, http, SignableMessage, TypedDataDefinition } from 'viem';
import { createPaymasterClient, toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { baseSepolia } from 'viem/chains';

import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { getBundlerClient, getClient } from ':stores/chain-clients/utils.js';
import { SubAccount, SubAccountInfo } from ':stores/sub-accounts/store.js';

export async function createSubAccountSigner(subaccount: SubAccountInfo) {
  const { getSigner } = SubAccount.getState();
  if (!getSigner) {
    throw new Error('get signer not found');
  }

  const signer = await getSigner();
  if (!signer) {
    throw new Error('signer not found');
  }

  // TODO[jake] how do we handle unsupported chains
  const client = getClient(subaccount.chainId ?? baseSepolia.id);
  if (!client) {
    throw new Error('client not found');
  }

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
          if (!Array.isArray(args.params)) {
            throw standardErrors.rpc.invalidParams();
          }
          return account.sign(args.params[0] as { hash: Hex });
        }
        case 'wallet_sendCalls': {
          if (!Array.isArray(args.params)) {
            throw standardErrors.rpc.invalidParams();
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
          if (!bundlerClient) {
            throw new Error('bundler client not found');
          }

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
            throw standardErrors.rpc.invalidParams();
          }
          return account.signMessage({ message: args.params[0] } as {
            message: SignableMessage;
          });
        }
        case 'eth_signTypedData_v4': {
          if (!Array.isArray(args.params)) {
            throw standardErrors.rpc.invalidParams();
          }
          return account.signTypedData(args.params[1] as TypedDataDefinition);
        }
        default:
          throw new Error('Not supported');
      }
    },
  };
}
