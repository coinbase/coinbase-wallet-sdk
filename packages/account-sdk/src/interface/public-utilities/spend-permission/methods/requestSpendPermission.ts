import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';

import { ProviderInterface } from ':core/provider/interface.js';
import { createSpendPermissionTypedData, dateToTimestampInSeconds } from '../utils.js';
import { withTelemetry } from '../withTelemetry.js';
import { getHash } from './getHash.js';

export type WalletSignCapabilities = {
  spendPermission?: {
    requireBalance?: boolean;
  };
};

export type RequestSpendPermissionType = {
  account: string;
  spender: string;
  token: string;
  chainId: number;
  allowance: bigint; // in wei
  periodInDays: number;
  start?: Date; // default to now
  end?: Date; // default to never
  salt?: string; // default to a random value by crypto.getRandomValues
  extraData?: string; // default to '0x'
  capabilities?: WalletSignCapabilities; // optional capabilities for wallet_sign
};

/**
 * Requests user approval to create a new spend permission.
 *
 * This helper method opens a prompt to ask the user to sign a spend permission.
 * To learn more about spend permissions, see the [Spend Permission documentation](https://docs.base.org/base-account/improve-ux/spend-permissions).
 *
 * The method uses EIP-712 typed data signing to create a cryptographically secure
 * permission that can be verified on-chain. The resulting permission object contains
 * the signature and all necessary data for later use.
 *
 * @param params - The parameters for the requestSpendPermission method.
 * @param params.provider - Coinbase Wallet Provider
 * @param params.account - The account to request a spend permission for.
 * @param params.spender - The spender to request a spend permission for.
 * @param params.token - The token to request a spend permission for.
 * @param params.chainId - The chain ID to request a spend permission for.
 * @param params.allowance - The allowance to request a spend permission for.
 * @param params.periodInDays - The peroid in days for the allowance to be valid for.
 * @param params.start - The start date for the allowance to be valid from.
 * @param params.end - The end date for the allowance to be valid until next period starts.
 * @param params.salt - Salt
 * @param params.extraData - The extra data to use for the allowance.
 *
 * @returns A promise that resolves to a SpendPermission object containing the signature and permission details.
 *
 * @example
 * ```typescript
 * import { requestSpendPermission } from '@base-org/account/spend-permission';
 *
 * // Request approval for a spend permission
 * const permission = await requestSpendPermission({
 *   provider, // Coinbase Wallet Provider
 *   account: '0x1234...',
 *   spender: '0x5678...',
 *   token: '0xabcd...', // USDC address
 *   chainId: 8453, // Base mainnet
 *   allowance: parseUnits('100', 6), // 100 USDC
 *   periodInDays: 30, // Monthly allowance
 * });
 *
 * console.log('Permission created:', permission.signature);
 * ```
 */
const requestSpendPermissionFn = async (
  request: RequestSpendPermissionType & { provider: ProviderInterface }
): Promise<SpendPermission> => {
  const { provider, account, chainId, capabilities } = request;

  const typedData = createSpendPermissionTypedData(request);

  // Check if we should use wallet_sign (when capabilities are provided) or eth_signTypedData_v4
  let signature: string;
  let permissionHash: string;

  if (capabilities) {
    // Use wallet_sign with capabilities
    const signParams = {
      version: '1.0',
      request: {
        type: '0x01' as const, // EIP-712 Typed Data
        data: typedData,
      },
      mutableData: {
        fields: ['message.account'],
      },
      capabilities,
    };

    const result = await provider.request({
      method: 'wallet_sign',
      params: [signParams],
    });

    // Type guard and validation for the result
    if (!result || typeof result !== 'object') {
      throw new Error(
        `Invalid response from wallet_sign: expected object but got ${typeof result}`
      );
    }

    // Check for expected properties
    const hasSignature = 'signature' in result;
    const hasSignedData = 'signedData' in result;

    if (!hasSignature || !hasSignedData) {
      throw new Error(
        `Invalid response from wallet_sign: missing ${!hasSignature ? 'signature' : ''} ${!hasSignedData ? 'signedData' : ''}`
      );
    }

    // Cast to expected response type
    const signResult = result as {
      signature: `0x${string}`;
      signedData: typeof typedData;
    };

    signature = signResult.signature;
    permissionHash = await getHash({
      permission: signResult.signedData.message,
      chainId,
    });
  } else {
    // Use the original eth_signTypedData_v4 method
    [signature, permissionHash] = await Promise.all([
      provider.request({
        method: 'eth_signTypedData_v4',
        params: [account, typedData],
      }) as Promise<string>,
      getHash({ permission: typedData.message, chainId }),
    ]);
  }

  const permission: SpendPermission = {
    createdAt: dateToTimestampInSeconds(new Date()),
    permissionHash,
    signature,
    chainId,
    permission: typedData.message,
  };

  return permission;
};

export const requestSpendPermission = withTelemetry(requestSpendPermissionFn);
