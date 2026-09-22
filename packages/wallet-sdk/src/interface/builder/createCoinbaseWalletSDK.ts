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
import type { OpenFn } from ':util/web.js';
import { createTransport } from './createTransport.js';
import { CoinbaseWalletProvider } from './eip1193/CoinbaseWalletProvider.js';
import { getInjectedProvider } from './eip1193/getInjectedProvider.js';
import {
  _resetSolanaWalletRegistration,
  registerSolanaWallet,
} from './solana/registerSolanaWallet.js';

export type CreateProviderOptions = Partial<AppMetadata> & {
  preference?: Preference;
  /** @internal Overrides how the prepared wallet URL is presented. */
  openFn?: OpenFn;
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
 * Create a Coinbase Wallet SDK instance with an EIP-1193 compliant provider
 * @param params - Options to create a Coinbase Wallet SDK instance.
 * Connection is `createSession` (handshake + CAIP-25). Signing is `invoke`
 * through the popup transport.
 */
export function createCoinbaseWalletSDK(params: CreateProviderOptions) {
  const options: ConstructorOptions = {
    metadata: {
      appName: params.appName || 'App',
      appLogoUrl: params.appLogoUrl || '',
    },
    preference: params.preference ?? {},
  };

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
  const transport = createTransport(options, store, params.openFn);

  const sdk = {
    getProvider: () => {
      if (!provider) {
        provider = getInjectedProvider() ?? new CoinbaseWalletProvider({ transport, store });
      }

      return provider;
    },
    registerSolanaWallet: () => registerSolanaWallet({ transport, session: store.session }),
  };

  return sdk;
}
