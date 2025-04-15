import { decodeAbiParameters, encodeFunctionData, toHex } from 'viem';

import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
} from ':core/provider/interface.js';
import { AddSubAccountAccount } from ':core/rpc/wallet_addSubAccount.js';
import { WalletConnectResponse } from ':core/rpc/wallet_connect.js';
import { abi } from ':sign/scw/utils/constants.js';
import { assertPresence } from ':util/assertPresence.js';
import { checkCrossOriginOpenerPolicy } from ':util/checkCrossOriginOpenerPolicy.js';
import { validatePreferences, validateSubAccount } from ':util/validatePreferences.js';
import { createCoinbaseWalletProvider } from './createCoinbaseWalletProvider.js';
import { SubAccount, ToSubAccountSigner, store } from './store/store.js';

export type CreateCoinbaseWalletSDKOptions = Partial<AppMetadata> & {
  preference?: Preference;
  toSubAccountSigner?: ToSubAccountSigner;
};

const DEFAULT_PREFERENCE: Preference = {
  options: 'all',
};

type SubAccountAddOwnerParams = {
  address?: `0x${string}`;
  publicKey?: `0x${string}`;
  chainId: number;
};

/**
 * Create a Coinbase Wallet SDK instance.
 * @param params - Options to create a Coinbase Wallet SDK instance.
 * @returns A Coinbase Wallet SDK object.
 */
export function createCoinbaseWalletSDK(params: CreateCoinbaseWalletSDKOptions) {
  const options: ConstructorOptions = {
    metadata: {
      appName: params.appName || 'Dapp',
      appLogoUrl: params.appLogoUrl || '',
      appChainIds: params.appChainIds || [],
    },
    preference: Object.assign(DEFAULT_PREFERENCE, params.preference ?? {}),
  };

  // set the options in the store
  store.config.set(options);

  // rehydrate the store from storage
  void store.persist.rehydrate();

  // check the cross origin opener policy
  void checkCrossOriginOpenerPolicy();

  // Validate user supplied preferences. Throws if key/values are not valid.
  validatePreferences(options.preference);

  // Set the sub account signer inside the store.
  if (params.toSubAccountSigner) {
    validateSubAccount(params.toSubAccountSigner);
    // store the signer in the sub account store
    store.setState({
      toSubAccountSigner: params.toSubAccountSigner,
    });
  }

  let provider: ProviderInterface | null = null;

  const sdk = {
    getProvider() {
      if (!provider) {
        provider = createCoinbaseWalletProvider(options);
      }
      // @ts-expect-error - store reference to the sdk on the provider
      provider.sdk = sdk;
      return provider;
    },
    subaccount: {
      async create(account: AddSubAccountAccount): Promise<SubAccount> {
        const state = store.getState();
        assertPresence(state.toSubAccountSigner, new Error('toSubAccountSigner is not set'));
        assertPresence(state.subAccount?.address, new Error('subaccount already exists'));

        return (await sdk.getProvider()?.request({
          method: 'wallet_addSubAccount',
          params: [
            {
              version: '1',
              account,
            },
          ],
        })) as SubAccount;
      },
      async get(): Promise<SubAccount> {
        const subAccount = store.subAccounts.get();
        if (subAccount?.address) {
          return subAccount;
        }

        const response = (await sdk.getProvider()?.request({
          method: 'wallet_connect',
          params: [
            {
              version: 1,
              capabilities: {
                getAppAccounts: true,
              },
            },
          ],
        })) as WalletConnectResponse;
        return response.accounts[0].capabilities?.getSubAccounts?.[0] as SubAccount;
      },
      async addOwner({ address, publicKey, chainId }: SubAccountAddOwnerParams): Promise<string> {
        const subAccount = store.subAccounts.get();
        const account = store.account.get();
        assertPresence(account, new Error('account does not exist'));
        assertPresence(subAccount?.address, new Error('subaccount does not exist'));

        const calls = [];
        if (publicKey) {
          const [x, y] = decodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }], publicKey);
          calls.push({
            to: subAccount.address,
            data: encodeFunctionData({
              abi,
              functionName: 'addOwnerPublicKey',
              args: [x, y] as const,
            }),
            value: toHex(0),
          });
        }

        if (address) {
          calls.push({
            to: subAccount.address,
            data: encodeFunctionData({
              abi,
              functionName: 'addOwnerAddress',
              args: [address] as const,
            }),
            value: toHex(0),
          });
        }

        return (await sdk.getProvider()?.request({
          method: 'wallet_sendCalls',
          params: [
            {
              calls,
              chainId: toHex(chainId),
              from: account.accounts?.[0],
              version: 1,
            },
          ],
        })) as string;
      },
      setSigner(toSubAccountSigner: ToSubAccountSigner): void {
        validateSubAccount(toSubAccountSigner);
        store.setState({
          toSubAccountSigner,
        });
      },
    },
  };

  return sdk;
}
