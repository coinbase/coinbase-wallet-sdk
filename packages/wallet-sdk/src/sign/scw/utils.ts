import { Address, numberToHex } from 'viem';

import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import {
  EmptyFetchPermissionsRequest,
  FetchPermissionsRequest,
} from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { store } from ':store/store.js';
import { get } from ':util/get.js';
import { getCryptoKeyAccount } from '../../kms/crypto-key/index.js';

// ***************************************************************
// Utility
// ***************************************************************
export function getSenderFromRequest(request: RequestArguments) {
  if (!Array.isArray(request.params)) {
    return null;
  }
  switch (request.method) {
    case 'personal_sign':
      return request.params[1] as Address;
    case 'eth_signTypedData_v4':
      return request.params[0] as Address;
    case 'eth_signTransaction':
    case 'eth_sendTransaction':
    case 'wallet_sendCalls':
      return request.params[0]?.from as Address;
    default:
      return null;
  }
}

export function addSenderToRequest(request: RequestArguments, sender: Address) {
  if (!Array.isArray(request.params)) {
    throw standardErrors.rpc.invalidParams();
  }
  const params = [...request.params];
  switch (request.method) {
    case 'eth_signTransaction':
    case 'eth_sendTransaction':
    case 'wallet_sendCalls':
      params[0].from = sender;
      break;
    case 'eth_signTypedData_v4':
      params[0] = sender;
      break;
    case 'personal_sign':
      params[1] = sender;
      break;
    default:
      break;
  }

  return { ...request, params };
}

export function assertParamsChainId(params: unknown): asserts params is [
  {
    chainId: `0x${string}`;
  },
] {
  if (!params || !Array.isArray(params) || !params[0]?.chainId) {
    throw standardErrors.rpc.invalidParams();
  }
  if (typeof params[0].chainId !== 'string' && typeof params[0].chainId !== 'number') {
    throw standardErrors.rpc.invalidParams();
  }
}

export function injectRequestCapabilities(
  request: RequestArguments,
  capabilities: Record<string, unknown>
) {
  // Modify request to include auto sub account capabilities
  const modifiedRequest = { ...request };

  if (capabilities && ['wallet_sendCalls', 'wallet_connect'].includes(request.method)) {
    let requestCapabilities = get(modifiedRequest, 'params.0.capabilities');

    if (typeof requestCapabilities === 'undefined') {
      requestCapabilities = {};
    }

    if (typeof requestCapabilities !== 'object') {
      throw standardErrors.rpc.invalidParams();
    }

    requestCapabilities = {
      ...capabilities,
      ...requestCapabilities,
    };

    if (modifiedRequest.params && Array.isArray(modifiedRequest.params)) {
      modifiedRequest.params[0] = {
        ...modifiedRequest.params[0],
        capabilities: requestCapabilities,
      };
    }
  }

  return modifiedRequest;
}

/**
 * Initializes the `subAccountConfig` store with the owner account function and capabilities
 * @returns void
 */
export async function initSubAccountConfig() {
  const config = store.subAccountsConfig.get();

  if (!config?.enableAutoSubAccounts) {
    return;
  }

  // Get the owner account
  const { account: owner } = config.toOwnerAccount
    ? await config.toOwnerAccount()
    : await getCryptoKeyAccount();

  if (!owner) {
    throw standardErrors.provider.unauthorized('No owner account found');
  }

  // Set the capabilities for the sub account
  const capabilities = {
    addSubAccount: {
      account: {
        type: 'create',
        keys: [
          {
            type: owner.address ? 'address' : 'webauthn-p256',
            key: owner.address || owner.publicKey,
          },
        ],
      },
    },
    spendLimits: config?.defaultSpendLimits ?? undefined,
  };

  // Store the owner account and capabilities in the non-persisted config
  store.subAccountsConfig.set({
    capabilities,
  });
}

export function assertFetchPermissionsRequest(
  request: RequestArguments
): asserts request is FetchPermissionsRequest | EmptyFetchPermissionsRequest {
  if (request.method === 'coinbase_fetchPermissions' && request.params === undefined) {
    return;
  }

  if (
    request.method === 'coinbase_fetchPermissions' &&
    Array.isArray(request.params) &&
    request.params.length === 1 &&
    typeof request.params[0] === 'object'
  ) {
    if (
      typeof request.params[0].account !== 'string' ||
      !request.params[0].chainId.startsWith('0x')
    ) {
      throw standardErrors.rpc.invalidParams(
        'FetchPermissions - Invalid params: params[0].account must be a hex string'
      );
    }

    if (
      typeof request.params[0].chainId !== 'string' ||
      !request.params[0].chainId.startsWith('0x')
    ) {
      throw standardErrors.rpc.invalidParams(
        'FetchPermissions - Invalid params: params[0].chainId must be a hex string'
      );
    }

    if (
      typeof request.params[0].spender !== 'string' ||
      !request.params[0].spender.startsWith('0x')
    ) {
      throw standardErrors.rpc.invalidParams(
        'FetchPermissions - Invalid params: params[0].spender must be a hex string'
      );
    }

    return;
  }

  throw standardErrors.rpc.invalidParams();
}

export function fillMissingParamsForFetchPermissions(
  request: FetchPermissionsRequest | EmptyFetchPermissionsRequest
): FetchPermissionsRequest {
  if (request.params !== undefined) {
    return request as FetchPermissionsRequest;
  }

  // this is based on the assumption that the first account is the active account
  // it could change in the context of multi-(universal)-account
  const accountFromStore = store.getState().account.accounts?.[0];
  const chainId = store.getState().account.chain?.id;
  const subAccountFromStore = store.getState().subAccount?.address;

  if (!accountFromStore || !subAccountFromStore || !chainId) {
    throw standardErrors.rpc.invalidParams(
      'FetchPermissions - one or more of account, sub account, or chain id is missing, connect to sub account via wallet_connect first'
    );
  }

  return {
    method: 'coinbase_fetchPermissions',
    params: [
      {
        account: accountFromStore,
        chainId: numberToHex(chainId),
        spender: subAccountFromStore,
      },
    ],
  };
}
