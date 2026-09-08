import { ProviderInterface } from ':core/provider/interface.js';
import { loadTelemetryScript } from ':core/telemetry/initCCA.js';
import { checkCrossOriginOpenerPolicy } from ':util/checkCrossOriginOpenerPolicy.js';
import type { Hex } from 'viem';
import { BaseAccountProvider } from '../../builder/eip1193/BaseAccountProvider.js';
import { CHAIN_IDS } from '../constants.js';
import type { PayerInfoResponses } from '../types.js';

/**
 * Type for wallet_sendCalls request parameters
 */
type WalletSendCallsRequestParams = {
  version: string;
  chainId: number;
  calls: Array<{
    to: Hex;
    data: Hex;
    value: Hex;
  }>;
  capabilities: Record<string, unknown>;
};

/**
 * Type for wallet_sendCalls response when it returns an object
 */
type WalletSendCallsObjectResponse = {
  id: string; // sendCalls 2.0.0+ field
  capabilities?: {
    dataCallback?: PayerInfoResponses;
    [key: string]: unknown;
  };
};

/**
 * Type for payment execution result
 */
export interface PaymentExecutionResult {
  transactionHash: Hex;
  payerInfoResponses?: PayerInfoResponses;
}

//  ====================================================================
//  One-time initialization for ephemeral SDK operations
//  ====================================================================

let ephemeralInitialized = false;
let ephemeralTelemetryInitialized = false;

/**
 * Performs one-time global initialization for ephemeral SDKs (excluding telemetry).
 */
function initializeEphemeralOnce(): void {
  if (ephemeralInitialized) return;
  ephemeralInitialized = true;

  // Check COOP policy once
  void checkCrossOriginOpenerPolicy();
}

/**
 * Initializes telemetry for ephemeral SDKs if not already initialized.
 * Separated from global init so telemetry can be enabled by later requests
 * even if earlier requests had telemetry disabled.
 */
function initializeEphemeralTelemetryOnce(): void {
  if (ephemeralTelemetryInitialized) return;
  ephemeralTelemetryInitialized = true;

  void loadTelemetryScript();
}

/**
 * Resets the ephemeral initialization state.
 * @internal This is only intended for testing purposes.
 */
export function _resetEphemeralInitialization(): void {
  ephemeralInitialized = false;
  ephemeralTelemetryInitialized = false;
}

//  ====================================================================
//  Request queuing to prevent race conditions
//  ====================================================================

/**
 * Queue of pending payment operations.
 * Keyed by a combination of network and wallet URL to prevent
 * concurrent operations to the same destination from interfering.
 */
const paymentQueue = new Map<string, Promise<PaymentExecutionResult>>();

type QueueKeyParams = {
  testnet: boolean;
  walletUrl?: string;
};

function getQueueKey({ testnet, walletUrl }: QueueKeyParams): string {
  const network = testnet ? 'testnet' : 'mainnet';
  return `payment:${network}:${walletUrl ?? 'default'}`;
}

//  ====================================================================
//  Ephemeral SDK creation
//  ====================================================================

/**
 * Creates an ephemeral provider configured for payments.
 *
 * Uses `BaseAccountProvider` with `ephemeral: true`:
 * - Isolated in-memory store (does not share Session / keys with the main SDK)
 * - Public `eth_requestAccounts` / `wallet_connect` calls are rejected
 * - Wallet-bound calls handshake, invoke once through CAIP-27, then clean up
 *
 * @param params.chainId - The chain ID to use
 * @param params.walletUrl - Optional wallet URL to use
 * @param params.telemetry - Whether to enable telemetry (defaults to true)
 * @param params.dataSuffix - Optional attribution data suffix
 * @returns The configured ephemeral provider
 */
type CreateEphemeralSDKParams = {
  chainId: number;
  walletUrl?: string;
  telemetry?: boolean;
  dataSuffix?: Hex;
};

export function createEphemeralSDK({
  chainId,
  walletUrl,
  telemetry = true,
  dataSuffix,
}: CreateEphemeralSDKParams): { getProvider: () => ProviderInterface } {
  const appName = typeof window !== 'undefined' ? window.location.origin : 'Base Pay SDK';

  // Perform one-time initialization
  initializeEphemeralOnce();

  // Telemetry is initialized separately so it can be enabled by later requests
  // even if earlier requests had telemetry disabled
  if (telemetry) {
    initializeEphemeralTelemetryOnce();
  }

  // Create ephemeral provider with isolated state
  const provider = new BaseAccountProvider({
    metadata: {
      appName,
      appLogoUrl: '',
      appChainIds: [chainId],
    },
    preference: {
      telemetry,
      walletUrl,
      attribution: dataSuffix ? { dataSuffix } : undefined,
    },
    ephemeral: true,
  });

  // Return SDK-like interface for compatibility
  return {
    getProvider: () => provider,
  };
}

/**
 * Executes a payment using the provider
 * @param provider - The provider instance
 * @param requestParams - The wallet_sendCalls request parameters
 * @returns The payment execution result with transaction hash and optional info responses
 */
export async function executePaymentWithProvider(
  provider: ProviderInterface,
  requestParams: WalletSendCallsRequestParams
): Promise<PaymentExecutionResult> {
  const result = await provider.request({
    method: 'wallet_sendCalls',
    params: [requestParams],
  });

  let transactionHash: Hex;
  let payerInfoResponses: PayerInfoResponses | undefined;

  // Handle different response formats
  if (typeof result === 'string' && result.length >= 66) {
    // Standard response format - just a transaction hash
    transactionHash = result.slice(0, 66) as Hex;
  } else if (typeof result === 'object' && result !== null) {
    // Object response format - contains id and capabilities with dataCallback (sendCalls 2.0.0+)
    const resultObj = result as WalletSendCallsObjectResponse;

    // Extract transaction hash from id field
    if (typeof resultObj.id === 'string' && resultObj.id.length >= 66) {
      transactionHash = resultObj.id.slice(0, 66) as Hex;

      // Extract info responses from capabilities.dataCallback
      if (resultObj.capabilities?.dataCallback) {
        payerInfoResponses = resultObj.capabilities.dataCallback;
      }
    } else {
      throw new Error(
        `Could not extract transaction hash from object response. Available fields: ${Object.keys(resultObj).join(', ')}`
      );
    }
  } else {
    throw new Error(
      `Unexpected response format from wallet_sendCalls: expected string with length > 66 or object with id, got ${typeof result}`
    );
  }

  return { transactionHash, payerInfoResponses };
}

/**
 * Executes a payment using the SDK (legacy compatibility wrapper)
 * @param sdk - The SDK instance
 * @param requestParams - The wallet_sendCalls request parameters
 * @returns The payment execution result with transaction hash and optional info responses
 * @deprecated Use executePaymentWithProvider instead
 */
export async function executePayment(
  sdk: { getProvider: () => ProviderInterface },
  requestParams: WalletSendCallsRequestParams
): Promise<PaymentExecutionResult> {
  return executePaymentWithProvider(sdk.getProvider(), requestParams);
}

/**
 * Manages the complete payment flow with SDK lifecycle and request queuing.
 *
 * Features:
 * - Uses ephemeral provider with isolated state
 * - Queues concurrent requests to prevent race conditions
 * - Properly cleans up resources after each payment
 *
 * @param requestParams - The wallet_sendCalls request parameters
 * @param testnet - Whether to use testnet
 * @param walletUrl - Optional wallet URL to use
 * @param telemetry - Whether to enable telemetry (defaults to true)
 * @param dataSuffix - Optional attribution data suffix
 * @returns The payment execution result
 */
export async function executePaymentWithSDK(
  requestParams: WalletSendCallsRequestParams,
  testnet: boolean,
  walletUrl?: string,
  telemetry: boolean = true,
  dataSuffix?: Hex
): Promise<PaymentExecutionResult> {
  const queueKey = getQueueKey({ testnet, walletUrl });

  // Chain synchronously before any await so concurrent callers cannot all observe an empty queue,
  // yield, and then run in parallel. Each task waits on the previous promise for this key.
  const previousTask = paymentQueue.get(queueKey) ?? Promise.resolve();

  const execution = (async (): Promise<PaymentExecutionResult> => {
    await previousTask.catch(() => {});

    const network = testnet ? 'baseSepolia' : 'base';
    const chainId = CHAIN_IDS[network];

    const sdk = createEphemeralSDK({
      chainId,
      walletUrl,
      telemetry,
      dataSuffix,
    });
    const provider = sdk.getProvider();

    try {
      return await executePaymentWithProvider(provider, requestParams);
    } finally {
      await provider.disconnect();
    }
  })();

  paymentQueue.set(queueKey, execution);

  try {
    return await execution;
  } finally {
    // Only clear if we are still the tail of the queue — a newer call may have replaced the entry.
    if (paymentQueue.get(queueKey) === execution) {
      paymentQueue.delete(queueKey);
    }
  }
}
