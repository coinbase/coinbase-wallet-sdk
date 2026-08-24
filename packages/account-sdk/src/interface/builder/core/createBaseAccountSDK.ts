import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
  SubAccountOptions,
} from ':core/provider/interface.js';
import { AddSubAccountAccount } from ':core/rpc/wallet_addSubAccount.js';
import { WalletConnectResponse } from ':core/rpc/wallet_connect.js';
import { abi } from ':core/sub-account/constants.js';
import { loadTelemetryScript } from ':core/telemetry/initCCA.js';
import { SubAccount, ToOwnerAccountFn, store } from ':store/store.js';
import { assertPresence } from ':util/assertPresence.js';
import { checkCrossOriginOpenerPolicy } from ':util/checkCrossOriginOpenerPolicy.js';
import { validatePreferences, validateSubAccount } from ':util/validatePreferences.js';
import { decodeAbiParameters, encodeFunctionData, toHex } from 'viem';
import { BaseAccountProvider } from './BaseAccountProvider.js';
import { getInjectedProvider } from './getInjectedProvider.js';

export type CreateProviderOptions = Partial<AppMetadata> & {
  preference?: Preference;
  subAccounts?: SubAccountOptions;
  paymasterUrls?: Record<number, string>;
};

//  ====================================================================
//  One-time initialization tracking
//  These operations only need to run once per page load
//  ====================================================================

let globalInitialized = false;
let telemetryInitialized = false;
let rehydrationPromise: Promise<void> | null = null;

/**
 * Performs one-time global initialization for the SDK (excluding telemetry).
 * Safe to call multiple times - will only execute once.
 */
function initializeGlobalOnce(): void {
  if (globalInitialized) return;
  globalInitialized = true;

  // Check COOP policy once
  void checkCrossOriginOpenerPolicy();

  // Rehydrate store from localStorage once
  if (!rehydrationPromise) {
    const result = store.persist.rehydrate();
    rehydrationPromise = result instanceof Promise ? result : Promise.resolve();
  }
}

/**
 * Initializes telemetry if not already initialized.
 * Separated from global init so telemetry can be enabled by later SDK instances
 * even if the first instance had telemetry disabled.
 */
function initializeTelemetryOnce(): void {
  if (telemetryInitialized) return;
  telemetryInitialized = true;

  void loadTelemetryScript();
}

/**
 * Resets the global initialization state.
 * @internal This is only intended for testing purposes.
 */
export function _resetGlobalInitialization(): void {
  globalInitialized = false;
  telemetryInitialized = false;
  rehydrationPromise = null;
}

/**
 * Create Base AccountSDK instance with EIP-1193 compliant provider
 * @param params - Options to create a base account SDK instance.
 * Pairing is `ensureSession` → `pair` (handshake + `wallet_connect`). Signing is `invoke`
 * through the popup transport, or the sub-account local path when `from` is the sub-account.
 */
export function createBaseAccountSDK(params: CreateProviderOptions) {
  const options: ConstructorOptions = {
    metadata: {
      appName: params.appName || 'App',
      appLogoUrl: params.appLogoUrl || '',
      appChainIds: params.appChainIds || [],
    },
    preference: params.preference ?? {},
    paymasterUrls: params.paymasterUrls,
  };

  //  ====================================================================
  //  If we have a toOwnerAccount function, set it in the non-persisted config
  //  ====================================================================

  if (params.subAccounts?.toOwnerAccount) {
    validateSubAccount(params.subAccounts.toOwnerAccount);
  }

  store.subAccountsConfig.set({
    toOwnerAccount: params.subAccounts?.toOwnerAccount,
    creation: params.subAccounts?.creation ?? 'manual',
    defaultAccount: params.subAccounts?.defaultAccount ?? 'universal',
    funding: params.subAccounts?.funding ?? 'spend-permissions',
  });

  //  ====================================================================
  //  Set the options in the store and rehydrate the store from storage
  //  ====================================================================

  store.config.set(options);

  //  ====================================================================
  //  One-time initialization and validation
  //  ====================================================================

  initializeGlobalOnce();

  // Telemetry is initialized separately so it can be enabled by later SDK instances
  // even if earlier instances had telemetry disabled
  if (options.preference.telemetry !== false) {
    initializeTelemetryOnce();
  }

  validatePreferences(options.preference);

  //  ====================================================================
  //  Return the provider
  //  ====================================================================

  let provider: ProviderInterface | null = null;

  const sdk = {
    getProvider: () => {
      if (!provider) {
        provider = getInjectedProvider() ?? new BaseAccountProvider(options);
      }

      return provider;
    },
    subAccount: {
      async create(accountParam: AddSubAccountAccount): Promise<SubAccount> {
        return (await sdk.getProvider()?.request({
          method: 'wallet_addSubAccount',
          params: [
            {
              version: '1',
              account: accountParam,
            },
          ],
        })) as SubAccount;
      },
      async get(): Promise<SubAccount | null> {
        const subAccount = store.subAccounts.get();

        if (subAccount?.address) {
          return subAccount;
        }

        const response = (await sdk.getProvider()?.request({
          method: 'wallet_connect',
          params: [
            {
              version: '1',
              capabilities: {},
            },
          ],
        })) as WalletConnectResponse;

        const subAccounts = response.accounts[0].capabilities?.subAccounts;
        if (!Array.isArray(subAccounts)) {
          return null;
        }

        return subAccounts[0] as SubAccount;
      },
      addOwner: async ({
        address,
        publicKey,
        chainId,
      }: {
        address?: `0x${string}`;
        publicKey?: `0x${string}`;
        chainId: number;
      }) => {
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
              version: '1',
            },
          ],
        })) as string;
      },
      setToOwnerAccount(toSubAccountOwner: ToOwnerAccountFn): void {
        validateSubAccount(toSubAccountOwner);
        store.subAccountsConfig.set({
          toOwnerAccount: toSubAccountOwner,
        });
      },
    },
  };

  return sdk;
}
