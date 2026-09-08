import { RequestArguments } from ':core/provider/interface.js';
import type { CallCapabilities } from ':core/rpc/wallet_sendCalls.js';
import type { Store } from ':store/store.js';
import {
  Address,
  Hex,
  PublicClient,
  SendCallsReturnType,
  WalletSendCallsParameters,
  encodeFunctionData,
  hexToBigInt,
  numberToHex,
} from 'viem';

import { abi } from './constants.js';
import {
  createWalletSendCallsRequest,
  injectRequestCapabilities,
  isEthSendTransactionParams,
  isSendCallsParams,
  waitForCallsTransactionHash,
} from './utils.js';

/**
 * This function is used to send a request to the global account.
 * It is used to execute a request that requires a spend permission through the global account.
 * @returns The result of the request.
 */
export async function routeThroughGlobalAccount({
  request,
  globalAccountAddress,
  subAccountAddress,
  client,
  globalAccountRequest,
  chainId,
  prependCalls,
  spendPermissions,
  paymasterUrls,
}: {
  /** The request to send to the global account. */
  request: RequestArguments;
  /** The address of the global account. */
  globalAccountAddress: Address;
  /** The address of the sub account. */
  subAccountAddress: Address;
  /** The client to use to send the request. */
  client: PublicClient;
  /** The chain id to use to send the request. */
  chainId: number;
  /** Optional calls to prepend to the request. */
  prependCalls?:
    | { to: Address; data: Hex; value: Hex; capabilities?: CallCapabilities }[]
    | undefined;
  /** The function to use to send the request to the global account. */
  globalAccountRequest: (request: RequestArguments) => Promise<unknown>;
  spendPermissions: Store['eip155']['spendPermissions'];
  paymasterUrls?: Record<number, string>;
}) {
  // Construct call to execute the original calls using executeBatch
  let originalSendCallsParams: WalletSendCallsParameters[0];

  if (request.method === 'wallet_sendCalls' && isSendCallsParams(request.params)) {
    originalSendCallsParams = request.params[0];
  } else if (
    request.method === 'eth_sendTransaction' &&
    isEthSendTransactionParams(request.params)
  ) {
    const sendCallsRequest = createWalletSendCallsRequest({
      calls: [request.params[0]],
      chainId,
      from: request.params[0].from,
      paymasterUrls,
    });

    originalSendCallsParams = sendCallsRequest.params[0];
  } else {
    throw new Error(`Could not get original call from ${request.method} request`);
  }

  const subAccountCallData = encodeFunctionData({
    abi,
    functionName: 'executeBatch',
    args: [
      originalSendCallsParams.calls.map((call) => ({
        target: call.to!,
        value: hexToBigInt(call.value ?? '0x0'),
        data: call.data ?? '0x',
      })),
    ],
  });

  // Aggregate per-call gas limit overrides onto the executeBatch call.
  // When any original call has a gasLimitOverride, we estimate gas for calls
  // without one, sum everything, and set the total on the batch call sent to
  // the global account popup.
  const batchCallCapabilities = await aggregateGasLimitOverrides({
    calls: originalSendCallsParams.calls,
    client,
    subAccountAddress,
  });

  // Send using wallet_sendCalls
  const batchCall: { to: Address; data: Hex; value: Hex; capabilities?: CallCapabilities } = {
    data: subAccountCallData,
    to: subAccountAddress,
    value: '0x0',
    ...(batchCallCapabilities ? { capabilities: batchCallCapabilities } : {}),
  };

  const calls: { to: Address; data: Hex; value: Hex; capabilities?: CallCapabilities }[] = [
    ...(prependCalls ?? []),
    batchCall,
  ];

  const { capabilities: originalCapabilities, ...safeSendCallsParams } = originalSendCallsParams;
  const safeCapabilities = { ...(originalCapabilities ?? {}) };
  // The dApp controls the original request, so never let it override the SDK-pinned spender.
  delete safeCapabilities.spendPermissions;
  const hasSafeCapabilities = Object.keys(safeCapabilities).length > 0;

  const requestToParent = injectRequestCapabilities(
    {
      method: 'wallet_sendCalls',
      params: [
        {
          ...safeSendCallsParams,
          ...(hasSafeCapabilities ? { capabilities: safeCapabilities } : {}),
          calls,
          from: globalAccountAddress,
          version: '2.0.0',
          atomicRequired: true,
        },
      ],
    },
    {
      spendPermissions: {
        request: {
          spender: subAccountAddress,
        },
      },
    }
  );

  const result = (await globalAccountRequest(requestToParent)) as SendCallsReturnType;

  let callsId = result.id;

  // Cache returned spend permissions
  if (result.capabilities?.spendPermissions) {
    spendPermissions.set(result.capabilities.spendPermissions.permissions);
  }

  // Wait for transaction hash if sending a transaction
  if (request.method === 'eth_sendTransaction') {
    return waitForCallsTransactionHash({
      client,
      id: callsId,
    });
  }

  return result;
}

/**
 * Per-call safety buffer (gas). Matches the backend config
 * `safety_buffer_per_call`.
 */
const SAFETY_BUFFER_PER_CALL = 500n;

/**
 * Input data cost per byte (gas). Matches the backend config
 * `proportional_input_cost_per_byte`.
 */
const PROPORTIONAL_INPUT_COST_PER_BYTE = 2n;

/**
 * Aggregates per-call gasLimitOverride values from the original calls into a
 * single gasLimitOverride for the executeBatch call. For calls without an
 * override, gas is estimated via eth_estimateGas. The total includes batch
 * processing overhead.
 *
 * Returns undefined if no original calls have gasLimitOverride set.
 */
async function aggregateGasLimitOverrides({
  calls,
  client,
  subAccountAddress,
}: {
  calls: WalletSendCallsParameters[0]['calls'];
  client: PublicClient;
  subAccountAddress: Address;
}): Promise<CallCapabilities | undefined> {
  const hasAnyOverride = calls.some(
    (call) =>
      call.capabilities &&
      'gasLimitOverride' in call.capabilities &&
      (call.capabilities as { gasLimitOverride?: { value?: Hex } }).gasLimitOverride?.value
  );

  if (!hasAnyOverride) {
    return undefined;
  }

  const gasLimits = await Promise.all(
    calls.map(async (call) => {
      const override = (call.capabilities as { gasLimitOverride?: { value?: Hex } } | undefined)
        ?.gasLimitOverride?.value;

      if (override) {
        return hexToBigInt(override);
      }

      // Estimate gas for calls without an explicit override
      return client.estimateGas({
        account: subAccountAddress,
        to: call.to!,
        data: call.data ?? '0x',
        value: hexToBigInt(call.value ?? '0x0'),
      });
    })
  );

  const totalGas = gasLimits.reduce((sum, gas) => sum + gas, 0n);

  // Calculate input data overhead: 2 gas per byte of calldata per call
  const inputDataOverhead = calls.reduce((sum, call) => {
    const dataLength = call.data ? BigInt((call.data.length - 2) / 2) : 0n; // hex string minus 0x prefix, 2 chars per byte
    return sum + dataLength * PROPORTIONAL_INPUT_COST_PER_BYTE;
  }, 0n);

  // Per-call safety buffer (500 gas per call) + input data overhead
  const batchOverhead = BigInt(calls.length) * SAFETY_BUFFER_PER_CALL + inputDataOverhead;
  const totalWithOverhead = totalGas + batchOverhead;

  return {
    gasLimitOverride: {
      value: numberToHex(totalWithOverhead),
    },
  };
}
