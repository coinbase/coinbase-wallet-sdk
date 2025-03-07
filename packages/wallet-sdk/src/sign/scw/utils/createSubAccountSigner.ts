import { Address, Hex, http, numberToHex, SignableMessage, TypedDataDefinition } from 'viem';
import { createPaymasterClient } from 'viem/account-abstraction';
import { getCode } from 'viem/actions';

import { createSmartAccount } from './createSmartAccount.js';
import { getOwnerIndex } from './getOwnerIndex.js';
import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { getBundlerClient, getClient } from ':store/chain-clients/utils.js';
import { store, SubAccount } from ':store/store.js';
import { assertArrayPresence, assertPresence } from ':util/assertPresence.js';
import { get } from ':util/get.js';

export async function createSubAccountSigner({ chainId }: { chainId: number }) {
  const client = getClient(chainId);
  assertPresence(client, standardErrors.rpc.internal('client not found'));

  const subAccount = store.subAccounts.get();
  const toSubAccountSigner = store.getState().toSubAccountSigner;
  assertPresence(subAccount, standardErrors.rpc.internal('subaccount not found'));
  assertPresence(toSubAccountSigner, standardErrors.rpc.internal('toSubAccountSigner not defined'));

  const { account: owner } = await toSubAccountSigner();
  assertPresence(owner, standardErrors.rpc.internal('signer not found'));

  const code = await getCode(client, {
    address: subAccount.address,
  });

  // Default index to 1 if the contract is not deployed
  // Note: importing an undeployed contract might need to be handled differently
  // The implemention will likely require the signer to tell us the index
  let index = 1;
  if (code) {
    index = await getOwnerIndex({
      address: subAccount.address,
      publicKey: owner.publicKey || owner.address,
      client,
    });
  }

  // If contract is not deployed we need to have the factory data
  if (!code) {
    assertPresence(subAccount.factoryData, standardErrors.rpc.internal('factory data not found'));
  }

  const account = await createSmartAccount({
    owner,
    ownerIndex: index,
    address: subAccount.address,
    client,
    factoryData: subAccount.factoryData,
  });

  return {
    request: async (
      args: RequestArguments
    ): Promise<string | Hex | Address[] | number | SubAccount> => {
      switch (args.method) {
        case 'wallet_addSubAccount':
          return subAccount;
        case 'eth_accounts':
          return [subAccount.address] as Address[];
        case 'eth_coinbase':
          return subAccount.address;
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
