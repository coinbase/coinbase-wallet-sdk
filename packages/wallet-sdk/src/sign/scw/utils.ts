import {
  Hex,
  PublicClient,
  WalletSendCallsParameters,
  encodeFunctionData,
  erc20Abi,
  hexToBigInt,
  numberToHex,
} from 'viem';

import { InsufficientBalanceErrorData, standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import {
  EmptyFetchPermissionsRequest,
  FetchPermissionsRequest,
} from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { Address } from ':core/type/index.js';
import { store } from ':store/store.js';
import { assertPresence } from ':util/assertPresence.js';
import { get } from ':util/get.js';
import { initSnackbar } from ':util/web.js';
import { waitForCallsStatus } from 'viem/experimental';
import { getCryptoKeyAccount } from '../../kms/crypto-key/index.js';
import { abi, spendPermissionManagerAddress } from './utils/constants.js';

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

  return modifiedRequest;
}

/**
 * Initializes the `subAccountConfig` store with the owner account function and capabilities
 * @returns void
 */
export async function initSubAccountConfig() {
  const { config } = store.subAccountsConfig.get() ?? {};

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
  // TODO: Batch spend permission message
  return {
    domain: {
      name: 'Spend Permission Manager',
      version: '1',
      chainId,
      verifyingContract: spendPermissionManagerAddress,
    },
    spendPermissionBatch,
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
  to,
  data,
  value,
  from,
  chainId,
}: {
  to: Address;
  data: Hex;
  value: Hex;
  from: Address;
  chainId: Hex;
}) {
  return {
    method: 'wallet_sendCalls',
    params: [
      {
        version: '1.0',
        calls: [
          {
            to,
            data,
            value,
          },
        ],
        chainId,
        from,
        atomicRequired: true,
        // TODO: Add paymaster capabilities from config
      },
    ],
  };
}

export async function presentSubAccountFundingDialog() {
  const snackbar = initSnackbar();
  const userChoice = await new Promise<'update_permission' | 'continue_popup' | 'cancel'>(
    (resolve) => {
      snackbar.presentItem({
        autoExpand: true,
        message: 'Insufficient spend permission. Choose how to proceed:',
        menuItems: [
          {
            isRed: false,
            info: 'Update Spend Limit',
            svgWidth: '10',
            svgHeight: '11',
            path: '',
            defaultFillRule: 'evenodd',
            defaultClipRule: 'evenodd',
            onClick: () => {
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

export async function handleInsufficientBalanceError({
  errorData,
  globalAccountAddress,
  subAccountAddress,
  client,
  request,
  subAccountRequest,
  globalAccountRequest,
}: {
  errorData: InsufficientBalanceErrorData;
  globalAccountAddress: Address;
  subAccountAddress: Address;
  request: RequestArguments;
  client: PublicClient;
  subAccountRequest: (request: RequestArguments) => Promise<any>;
  globalAccountRequest: (request: RequestArguments) => Promise<any>;
}) {
  const chainId = client.chain?.id;
  assertPresence(chainId, standardErrors.rpc.internal(`invalid chainId`));

  // Build spend permission requests for each token and check
  // that each token has global account as sufficient source
  // If not, will throw error
  const spendPermissionRequests = parseFundingOptions({
    errorData,
    sourceAddress: globalAccountAddress,
  });

  // Present options to user via snackbar
  const userChoice = await presentSubAccountFundingDialog();

  if (userChoice === 'cancel') {
    throw new Error('User cancelled funding');
  }

  let signatureRequest: RequestArguments;

  // Request 3x the amount per day -- maybe we can do something smarter here
  const defaultPeriod = 60 * 60 * 24;
  const defaultMultiplier = 3;

  if (userChoice === 'update_permission') {
    if (spendPermissionRequests.length === 1) {
      const spendPermission = spendPermissionRequests[0];

      const message = createSpendPermissionMessage({
        spendPermission: {
          token: spendPermission.token,
          allowance: numberToHex(spendPermission.requiredAmount * BigInt(defaultMultiplier)),
          period: defaultPeriod,
          account: globalAccountAddress,
          spender: subAccountAddress,
          start: 0,
          end: 281474976710655,
          salt: numberToHex(BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))),
          extraData: '0x',
        },
        chainId,
      });

      signatureRequest = {
        method: 'eth_signTypedData_v4',
        params: [globalAccountAddress, message],
      };
    } else {
      // Batch spend permission request
      const message = createSpendPermissionBatchMessage({
        spendPermissionBatch: {
          account: globalAccountAddress,
          period: defaultPeriod,
          start: 0,
          end: 281474976710655,
          permissions: spendPermissionRequests.map((spendPermission) => ({
            token: spendPermission.token,
            allowance: numberToHex(spendPermission.requiredAmount * BigInt(defaultMultiplier)),
            period: defaultPeriod,
            account: globalAccountAddress,
            spender: subAccountAddress,
            salt: '0x0',
            extraData: '0x',
          })),
        },
        chainId,
      });

      signatureRequest = {
        method: 'eth_signTypedData_v4',
        params: [globalAccountAddress, message],
      };
    }

    try {
      // Request the signature - will be stored in backend
      await globalAccountRequest(signatureRequest);
    } catch (error) {
      console.error(error);
      // If the signature request is denied, we throw the original error
      throw new Error('User denied spend permission request');
    }

    // Retry the original request after updating permissions
    return subAccountRequest(request);
  }

  /* Handle continue_popup path */
  // Construct calls to transfer required tokens to sub account
  const transferCalls: {
    to: Address;
    value: Hex;
    data: Hex;
  }[] = spendPermissionRequests.map((spendPermission) => {
    const isNative =
      spendPermission.token.toLowerCase() ===
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase();

    if (isNative) {
      return {
        to: subAccountAddress,
        value: numberToHex(spendPermission.requiredAmount),
        data: '0x',
      };
    }

    return {
      to: spendPermission.token,
      value: '0x0',
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [subAccountAddress, spendPermission.requiredAmount],
      }),
    };
  });

  // Construct call to execute the original calls using executeBatch
  let originalSendCallsParams: WalletSendCallsParameters[0];

  if (request.method === 'wallet_sendCalls' && isSendCallsParams(request.params)) {
    originalSendCallsParams = request.params[0];
  } else if (
    request.method === 'eth_sendTransaction' &&
    isEthSendTransactionParams(request.params)
  ) {
    const sendCallsRequest = createWalletSendCallsRequest({
      ...request.params[0],
      chainId: numberToHex(chainId),
    });

    originalSendCallsParams = sendCallsRequest.params[0];
  } else {
    throw new Error('Could not get original call');
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

  // Send using wallet_sendCalls
  const calls: { to: Address; data: Hex; value: Hex }[] = [
    ...transferCalls,
    { data: subAccountCallData, to: subAccountAddress, value: '0x0' },
  ];

  const result = await globalAccountRequest({
    method: 'wallet_sendCalls',
    params: [{ ...originalSendCallsParams, calls, from: globalAccountAddress }],
  });

  if (request.method === 'eth_sendTransaction') {
    return waitForCallsTransactionHash({
      client,
      id: result,
    });
  }

  return result;
}
