import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { ProviderInterface } from ':core/provider/interface.js';
import { FetchPermissionResponse } from ':core/rpc/coinbase_fetchPermission.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { fetchRPCRequest } from ':util/provider.js';
import { withTelemetry } from '../withTelemetry.js';

type FetchPermissionType = {
  permissionHash: string;
  provider?: ProviderInterface;
};

/**
 * Fetches a single spend permission by its hash.
 *
 * This helper method retrieves a specific spend permission using its unique hash identifier.
 * This is useful when you have a permission hash and need to retrieve the full permission details.
 *
 * The method uses coinbase_fetchPermission RPC method to query the permission
 * from the backend service. If a provider is supplied, it will use that provider to make the request.
 * Otherwise, it will make a direct RPC request to the Coinbase Wallet RPC endpoint.
 *
 * @param params - The parameters for the fetchPermission method.
 * @param params.permissionHash - The hash of the permission to fetch.
 * @param params.provider - Optional provider interface used to make the coinbase_fetchPermission request.
 *
 * @returns A promise that resolves to a SpendPermission object.
 *
 * @example
 * ```typescript
 * import { fetchPermission } from '@coinbase/wallet-sdk/spend-permission';
 *
 * // Fetch a specific permission by its hash (with provider)
 * const permission = await fetchPermission({
 *   provider, // Coinbase Wallet Provider
 *   permissionHash: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984'
 * });
 *
 * // Fetch a specific permission by its hash (without provider)
 * const permission = await fetchPermission({
 *   permissionHash: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984'
 * });
 *
 * console.log(`Permission for token: ${permission.permission.token}`);
 * console.log(`Spender: ${permission.permission.spender}`);
 * console.log(`Allowance: ${permission.permission.allowance}`);
 * ```
 */
const fetchPermissionFn = async ({
  provider,
  permissionHash,
}: FetchPermissionType): Promise<SpendPermission> => {
  let response: FetchPermissionResponse;

  if (provider) {
    response = (await provider.request({
      method: 'coinbase_fetchPermission',
      params: [
        {
          permissionHash,
        },
      ],
    })) as FetchPermissionResponse;
  } else {
    response = (await fetchRPCRequest(
      {
        method: 'coinbase_fetchPermission',
        params: [
          {
            permissionHash,
          },
        ],
      },
      CB_WALLET_RPC_URL
    )) as FetchPermissionResponse;
  }

  return response.permission;
};

export const fetchPermission = withTelemetry(fetchPermissionFn);
