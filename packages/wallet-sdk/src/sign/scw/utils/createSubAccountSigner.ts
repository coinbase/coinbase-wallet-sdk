import { Address, Hex, http, numberToHex, SignableMessage, TypedDataDefinition } from 'viem';
import { createPaymasterClient } from 'viem/account-abstraction';
import { getCode } from 'viem/actions';

import { createSmartAccount } from './createSmartAccount.js';
import { getOwnerIndex } from './getOwnerIndex.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { getBundlerClient, getClient } from ':stores/chain-clients/utils.js';
import { SubAccountInfo, subaccounts } from ':stores/sub-accounts/store.js';
import { assertArrayPresence, assertPresence } from ':util/assertPresence.js';
import { get } from ':util/get.js';

export async function createSubAccountSigner({ chainId }: { chainId: number }) {
  const client = getClient(chainId);
  assertPresence(client, standardErrors.rpc.internal('client not found'));

  const { account: subaccount, getSigner } = subaccounts.getState();
  assertPresence(subaccount, standardErrors.rpc.internal('subaccount not found'));
  assertPresence(getSigner, standardErrors.rpc.internal('signer not found'));

  const { account: owner } = await getSigner();
  assertPresence(owner, standardErrors.rpc.internal('signer not found'));

  const code = await getCode(client, {
    address: subaccount.address,
  });

  // Default index to 1 if the contract is not deployed
  // Note: importing an undeployed contract might need to be handled differently
  // The implemention will likely require the signer to tell us the index
  let index = 1;
  if (code) {
    index = await getOwnerIndex({
      address: subaccount.address,
      publicKey: owner.publicKey || owner.address,
      client,
    });
  }

  const account = await createSmartAccount({
    owner,
    ownerIndex: index,
    address: subaccount.address,
    client,
    factoryData: subaccount.factoryData,
  });

  return {
    request: async (
      args: RequestArguments
    ): Promise<string | Hex | Address[] | number | SubAccountInfo> => {
      switch (args.method) {
        case 'wallet_addSubAccount':
          return subaccount;
        case 'eth_accounts':
          return [subaccount.address] as Address[];
        case 'eth_coinbase':
          return subaccount.address;
        case 'net_version':
          return chainId.toString();
        case 'eth_chainId':
          return numberToHex(chainId);
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

          const calls = get(args.params[0], 'calls') as { to: Address; data: Hex }[];
          // Send the user operation
          return await bundlerClient.sendUserOperation({
            account,
            calls,
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
        case 'eth_signTypedData_v1':
        case 'eth_signTypedData_v3':
        case 'wallet_addEthereumChain':
        case 'wallet_switchEthereumChain':
        default:
          throw standardErrors.rpc.methodNotSupported();
      }
    },
  };
}
