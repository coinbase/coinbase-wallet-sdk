import { PublicClient, WalletSendCallsParameters, hexToBigInt, isAddress } from 'viem';

import { InsufficientBalanceErrorData } from ':core/error/errors.js';
import { Hex, keccak256, numberToHex, slice, toHex } from 'viem';

import { standardErrors } from ':core/error/errors.js';
import { Attribution, RequestArguments } from ':core/provider/interface.js';
import {
  EmptyFetchPermissionsRequest,
  FetchPermissionsRequest,
} from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { WalletConnectRequest, WalletConnectResponse } from ':core/rpc/wallet_connect.js';
import { logSnackbarActionClicked, logSnackbarShown } from ':core/telemetry/events/snackbar.js';
import { Address } from ':core/type/index.js';
import { config, store } from ':store/store.js';
import { get } from ':util/get.js';
import { initSnackbar } from ':util/web.js';
import { waitForCallsStatus } from 'viem/experimental';
import { getCryptoKeyAccount } from '../../kms/crypto-key/index.js';
import { spendPermissionManagerAddress } from './utils/constants.js';

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

export function assertGetCapabilitiesParams(
  params: unknown
): asserts params is [`0x${string}`, `0x${string}`[]?] {
  if (!params || !Array.isArray(params) || (params.length !== 1 && params.length !== 2)) {
    throw standardErrors.rpc.invalidParams();
  }

  if (typeof params[0] !== 'string' || !isAddress(params[0])) {
    throw standardErrors.rpc.invalidParams();
  }

  if (params.length === 2) {
    if (!Array.isArray(params[1])) {
      throw standardErrors.rpc.invalidParams();
    }

    for (const param of params[1]) {
      if (typeof param !== 'string' || !param.startsWith('0x')) {
        throw standardErrors.rpc.invalidParams();
      }
    }
  }
}

export function injectRequestCapabilities<T extends RequestArguments>(
  request: T,
  capabilities: Record<string, unknown>
) {
  // Modify request to include auto sub account capabilities
  const modifiedRequest = { ...request };

  if (capabilities && request.method.startsWith('wallet_')) {
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

  return modifiedRequest as T;
}

/**
 * Initializes the `subAccountConfig` store with the owner account function and capabilities
 * @returns void
 */
export async function initSubAccountConfig() {
  const config = store.subAccountsConfig.get() ?? {};

  const capabilities: WalletConnectRequest['params'][0]['capabilities'] = {};

  if (config.enableAutoSubAccounts) {
    // Get the owner account
    const { account: owner } = config.toOwnerAccount
      ? await config.toOwnerAccount()
      : await getCryptoKeyAccount();

    if (!owner) {
      throw standardErrors.provider.unauthorized('No owner account found');
    }

    capabilities.addSubAccount = {
      account: {
        type: 'create',
        keys: [
          {
            type: owner.address ? 'address' : 'webauthn-p256',
            publicKey: owner.address || owner.publicKey,
          },
        ],
      },
    };
  }

  // Store the owner account and capabilities in the non-persisted config
  store.subAccountsConfig.set({
    capabilities,
  });
}

export type PermissionDetails = {
  spender: Address;
  token: Address;
  allowance: Hex;
  salt: Hex;
  extraData: Hex;
};

export type SpendPermission = PermissionDetails & {
  account: Address;
  period: number;
  start: number;
  end: number;
};

export type SpendPermissionBatch = {
  account: Address;
  period: number;
  start: number;
  end: number;
  permissions: PermissionDetails[];
};

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

export function createSpendPermissionMessage({
  spendPermission,
  chainId,
}: {
  spendPermission: SpendPermission;
  chainId: number;
}) {
  return {
    domain: {
      name: 'Spend Permission Manager',
      version: '1',
      chainId: chainId,
      verifyingContract: spendPermissionManagerAddress,
    },
    types: {
      SpendPermission: [
        { name: 'account', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'allowance', type: 'uint160' },
        { name: 'period', type: 'uint48' },
        { name: 'start', type: 'uint48' },
        { name: 'end', type: 'uint48' },
        { name: 'salt', type: 'uint256' },
        { name: 'extraData', type: 'bytes' },
      ],
    },
    primaryType: 'SpendPermission',
    message: {
      account: spendPermission.account,
      spender: spendPermission.spender,
      token: spendPermission.token,
      allowance: spendPermission.allowance,
      period: spendPermission.period,
      start: spendPermission.start,
      end: spendPermission.end,
      salt: spendPermission.salt,
      extraData: spendPermission.extraData,
    },
  } as const;
}

export function createSpendPermissionBatchMessage({
  spendPermissionBatch,
  chainId,
}: {
  spendPermissionBatch: SpendPermissionBatch;
  chainId: number;
}) {
  return {
    domain: {
      name: 'Spend Permission Manager',
      version: '1',
      chainId,
      verifyingContract: spendPermissionManagerAddress,
    },
    types: {
      SpendPermissionBatch: [
        { name: 'account', type: 'address' },
        { name: 'period', type: 'uint48' },
        { name: 'start', type: 'uint48' },
        { name: 'end', type: 'uint48' },
        { name: 'permissions', type: 'PermissionDetails[]' },
      ],
      PermissionDetails: [
        { name: 'spender', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'allowance', type: 'uint160' },
        { name: 'salt', type: 'uint256' },
        { name: 'extraData', type: 'bytes' },
      ],
    },
    primaryType: 'SpendPermissionBatch',
    message: {
      account: spendPermissionBatch.account,
      period: spendPermissionBatch.period,
      start: spendPermissionBatch.start,
      end: spendPermissionBatch.end,
      permissions: spendPermissionBatch.permissions.map((p) => ({
        spender: p.spender,
        token: p.token,
        allowance: p.allowance,
        salt: p.salt,
        extraData: p.extraData,
      })),
    },
  } as const;
}

export async function waitForCallsTransactionHash({
  client,
  id,
}: { client: PublicClient; id: string }) {
  const result = await waitForCallsStatus(client, {
    id,
  });

  if (result.status === 'success') {
    return result.receipts?.[0].transactionHash;
  }

  throw standardErrors.rpc.internal('failed to send transaction');
}

export function createWalletSendCallsRequest({
  calls,
  from,
  chainId,
  capabilities,
}: {
  calls: { to: Address; data: Hex; value: Hex }[];
  from: Address;
  chainId: number;
  capabilities?: Record<string, unknown>;
}) {
  const paymasterUrls = config.get().paymasterUrls;

  let request: { method: 'wallet_sendCalls'; params: WalletSendCallsParameters } = {
    method: 'wallet_sendCalls',
    params: [
      {
        version: '1.0',
        calls,
        chainId: numberToHex(chainId),
        from,
        atomicRequired: true,
        capabilities,
      },
    ],
  };

  if (paymasterUrls?.[chainId]) {
    request = injectRequestCapabilities(request, {
      paymasterService: { url: paymasterUrls?.[chainId] },
    });
  }

  return request;
}

export async function presentSubAccountFundingDialog() {
  const snackbar = initSnackbar();
  const userChoice = await new Promise<'update_permission' | 'continue_popup' | 'cancel'>(
    (resolve) => {
      logSnackbarShown({ snackbarContext: 'sub_account_insufficient_balance' });
      snackbar.presentItem({
        autoExpand: true,
        message: 'Insufficient spend permission. Choose how to proceed:',
        menuItems: [
          {
            isRed: false,
            info: 'Create new Spend Permission',
            svgWidth: '10',
            svgHeight: '11',
            path: '',
            defaultFillRule: 'evenodd',
            defaultClipRule: 'evenodd',
            onClick: () => {
              logSnackbarActionClicked({
                snackbarContext: 'sub_account_insufficient_balance',
                snackbarAction: 'create_permission',
              });
              snackbar.clear();
              resolve('update_permission');
            },
          },
          {
            isRed: false,
            info: 'Continue in Popup',
            svgWidth: '10',
            svgHeight: '11',
            path: '',
            defaultFillRule: 'evenodd',
            defaultClipRule: 'evenodd',
            onClick: () => {
              logSnackbarActionClicked({
                snackbarContext: 'sub_account_insufficient_balance',
                snackbarAction: 'continue_in_popup',
              });
              snackbar.clear();
              resolve('continue_popup');
            },
          },
          {
            isRed: true,
            info: 'Cancel',
            svgWidth: '10',
            svgHeight: '11',
            path: '',
            defaultFillRule: 'evenodd',
            defaultClipRule: 'evenodd',
            onClick: () => {
              logSnackbarActionClicked({
                snackbarContext: 'sub_account_insufficient_balance',
                snackbarAction: 'cancel',
              });
              snackbar.clear();
              resolve('cancel');
            },
          },
        ],
      });
    }
  );

  return userChoice;
}
export function parseFundingOptions({
  errorData,
  sourceAddress,
}: { errorData: InsufficientBalanceErrorData; sourceAddress: Address }) {
  const spendPermissionRequests: {
    token: Address;
    requiredAmount: bigint;
  }[] = [];
  for (const [token, { amount, sources }] of Object.entries(errorData?.required ?? {})) {
    const sourcesWithSufficientBalance = sources.filter((source) => {
      return (
        hexToBigInt(source.balance) >= hexToBigInt(amount) &&
        source.address.toLowerCase() === sourceAddress?.toLowerCase()
      );
    });
    if (sourcesWithSufficientBalance.length === 0) {
      throw new Error('Source address has insufficient balance for a token');
    }

    spendPermissionRequests.push({
      token: token as `0x${string}`,
      requiredAmount: hexToBigInt(amount),
    });
  }

  return spendPermissionRequests;
}
export function isSendCallsParams(params: unknown): params is WalletSendCallsParameters {
  return typeof params === 'object' && params !== null && 'calls' in params;
}
export function isEthSendTransactionParams(params: unknown): params is [
  {
    to: Address;
    data: Hex;
    from: Address;
    value: Hex;
  },
] {
  return (
    Array.isArray(params) &&
    params.length === 1 &&
    typeof params[0] === 'object' &&
    params[0] !== null &&
    'to' in params[0]
  );
}
export function compute16ByteHash(input: string): Hex {
  return slice(keccak256(toHex(input)), 0, 16);
}

export function makeDataSuffix({
  attribution,
  dappOrigin,
}: { attribution?: Attribution; dappOrigin: string }): Hex | undefined {
  if (!attribution) {
    return;
  }

  if ('auto' in attribution && attribution.auto && dappOrigin) {
    return compute16ByteHash(dappOrigin);
  }

  if ('dataSuffix' in attribution) {
    return attribution.dataSuffix;
  }

  return;
}

/**
 * Checks if a specific capability is present in a request's params
 * @param request The request object to check
 * @param capabilityName The name of the capability to check for
 * @returns boolean indicating if the capability is present
 */
export function requestHasCapability(request: RequestArguments, capabilityName: string): boolean {
  if (!Array.isArray(request?.params)) return false;
  const capabilities = request.params[0]?.capabilities;
  if (!capabilities || typeof capabilities !== 'object') return false;
  return capabilityName in capabilities;
}

/**
 * Prepends an item to an array without duplicates
 * @param array The array to prepend to
 * @param item The item to prepend
 * @returns The array with the item prepended
 */
export function prependWithoutDuplicates<T>(array: T[], item: T): T[] {
  const filtered = array.filter((i) => i !== item);
  return [item, ...filtered];
}

/**
 * Appends an item to an array without duplicates
 * @param array The array to append to
 * @param item The item to append
 * @returns The array with the item appended
 */
export function appendWithoutDuplicates<T>(array: T[], item: T): T[] {
  const filtered = array.filter((i) => i !== item);
  return [...filtered, item];
}

export async function getCachedWalletConnectResponse(): Promise<WalletConnectResponse | null> {
  const spendPermissions = store.spendPermissions.get();
  const subAccount = store.subAccounts.get();
  const accounts = store.account.get().accounts;

  if (!accounts) {
    return null;
  }

  const walletConnectAccounts = accounts?.map<WalletConnectResponse['accounts'][number]>(
    (account) => ({
      address: account,
      capabilities: {
        subAccounts: subAccount ? [subAccount] : undefined,
        spendPermissions:
          spendPermissions.length > 0 ? { permissions: spendPermissions } : undefined,
      },
    })
  );

  return {
    accounts: walletConnectAccounts,
  };
}
