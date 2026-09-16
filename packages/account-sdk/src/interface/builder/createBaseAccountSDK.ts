import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
} from ':core/provider/interface.js';
import { loadTelemetryScript } from ':core/telemetry/initCCA.js';
import { store } from ':store/store.js';
import { checkCrossOriginOpenerPolicy } from ':util/checkCrossOriginOpenerPolicy.js';
import { validatePreferences } from ':util/validatePreferences.js';
import { createTransport } from './createTransport.js';
import { BaseAccountProvider } from './eip1193/BaseAccountProvider.js';
import { getInjectedProvider } from './eip1193/getInjectedProvider.js';
import {
  _resetSolanaWalletRegistration,
  registerSolanaWallet,
} from './solana/registerSolanaWallet.js';

export type CreateProviderOptions = Partial<AppMetadata> & {
  preference?: Preference;
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
  _resetSolanaWalletRegistration();
}

/**
 * Create Base AccountSDK instance with EIP-1193 compliant provider
 * @param params - Options to create a base account SDK instance.
 * Connection is `ensureSession` → `createSession` (handshake + CAIP-25). Signing is `invoke`
 * through the popup transport, or the sub-account local path when `from` is the sub-account.
 */
export function createBaseAccountSDK(params: CreateProviderOptions) {
  const options: ConstructorOptions = {
    metadata: {
      appName: params.appName || 'App',
      appLogoUrl: params.appLogoUrl || '',
      appChainIds: params.appChainIds || [],
      ...(params.defaultChainId !== undefined ? { defaultChainId: params.defaultChainId } : {}),
    },
    preference: params.preference ?? {},
    paymasterUrls: params.paymasterUrls,
  };

  //  ====================================================================
  //  Set the options in the store and rehydrate the store from storage
  //  ====================================================================

  const { paymasterUrls, ...config } = options;
  store.config.set(config);
  store.eip155.paymasterUrls.set(paymasterUrls);

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
  const transport = createTransport(options, store);

  const sdk = {
    getProvider: () => {
      if (!provider) {
        provider = getInjectedProvider() ?? new BaseAccountProvider(options, transport, store);
      }

      return provider;
    },
    registerSolanaWallet: () => registerSolanaWallet(transport, store.session),
  };

  return sdk;
}
