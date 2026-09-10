import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { ProviderInterface } from ':core/provider/interface.js';
import {
  FetchPermissionsResponse,
  SpendPermission,
} from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { fetchRPCRequest } from ':util/provider.js';
import { withTelemetry } from '../withTelemetry.js';

type FetchPermissionsType = {
  account: string;
  chainId: number;
  spender: string;
  provider?: ProviderInterface;
};

/**
 * Fetches existing spend permissions for a specific account, spender, and chain.
 *
 * This helper method retrieves all spend permissions that have been granted by a specific
 * account to a specific spender on a given chain. This is useful when you need to check
 * what permissions have already been granted.
 *
 * The method uses coinbase_fetchPermissions RPC method to query the permissions
 * from the backend service. If a provider is supplied, it will use that provider to make the request.
 * Otherwise, it will make a direct RPC request to the Coinbase Wallet RPC endpoint.
 *
 * @param params - The parameters for the fetchPermissions method.
 * @param params.account - The account to fetch permissions for.
 * @param params.chainId - The chain ID to fetch permissions for.
 * @param params.spender - The spender to fetch permissions for.
 * @param params.provider - Optional provider interface used to make the coinbase_fetchPermissions request.
 *
 * @returns A promise that resolves to an array of SpendPermission objects.
 *
 * @example
 * ```typescript
 * import { fetchPermissions } from '@base-org/account/spend-permission';
 *
 * // Fetch all permissions for an account-spender pair (with provider)
 * const permissions = await fetchPermissions({
 *   provider, // Coinbase Wallet Provider
 *   account: '0x1234...',
 *   spender: '0x5678...',
 *   chainId: 8453 // Base mainnet
 * });
 *
 * // Fetch all permissions for an account-spender pair (without provider)
 * const permissions = await fetchPermissions({
 *   account: '0x1234...',
 *   spender: '0x5678...',
 *   chainId: 8453 // Base mainnet
 * });
 *
 * console.log(`Found ${permissions.length} permissions`);
 * permissions.forEach(permission => {
 *   console.log(`Token: ${permission.permission.token}`);
 * });
 * ```
 */
const fetchPermissionsFn = async ({
  provider,
  account,
  chainId,
  spender,
}: FetchPermissionsType): Promise<SpendPermission[]> => {
  let response: FetchPermissionsResponse;
  const chainIdHex = `0x${chainId.toString(16)}`;

  if (provider) {
    response = (await provider.request({
      method: 'coinbase_fetchPermissions',
      params: [
        {
          account,
          chainId: chainIdHex,
          spender,
        },
      ],
    })) as FetchPermissionsResponse;
  } else {
    response = (await fetchRPCRequest(
      {
        method: 'coinbase_fetchPermissions',
        params: [
          {
            account,
            chainId: chainIdHex,
            spender,
          },
        ],
      },
      CB_WALLET_RPC_URL
    )) as FetchPermissionsResponse;
  }

  return response.permissions;
};

export const fetchPermissions = withTelemetry(fetchPermissionsFn);
