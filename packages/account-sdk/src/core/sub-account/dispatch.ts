import type { PopupRuntime } from ':core/channel/types.js';
import { isActionableHttpRequestError, isViemError, standardErrors } from ':core/error/errors.js';
import { toEnvelope } from ':core/namespaces/eip155/index.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { SessionData } from ':core/session/index.js';
import { invoke } from ':core/session/invoke.js';
import {
  logAddOwnerCompleted,
  logAddOwnerError,
  logAddOwnerStarted,
  logInsufficientBalanceErrorHandlingCompleted,
  logInsufficientBalanceErrorHandlingError,
  logInsufficientBalanceErrorHandlingStarted,
  logSubAccountRequestCompleted,
  logSubAccountRequestError,
  logSubAccountRequestStarted,
} from ':core/telemetry/events/scw-sub-account.js';
import { parseErrorMessageFromAny } from ':core/telemetry/utils.js';
import { getCryptoKeyAccount } from ':kms/crypto-key/index.js';
import { getClient } from ':store/chain-clients/utils.js';
import { correlationIds } from ':store/correlation-ids/store.js';
import { assertPresence } from ':util/assertPresence.js';
import { type WalletSendCallsParameters, hexToNumber } from 'viem';
import { createSubAccountSigner } from './createSubAccountSigner.js';
import { findOwnerIndex } from './findOwnerIndex.js';
import { handleAddSubAccountOwner } from './handleAddSubAccountOwner.js';
import { handleInsufficientBalanceError } from './handleInsufficientBalance.js';
import { routeThroughGlobalAccount } from './routeThroughGlobalAccount.js';
import { addSenderToRequest, getSenderFromRequest, makeDataSuffix } from './utils.js';

/**
 * True when the request's `from` / signer address is the cached sub-account.
 * Requests without a sender stay on the global popup path.
 */
export function shouldUseSubAccount(runtime: PopupRuntime, request: RequestArguments): boolean {
  const sender = getSenderFromRequest(request);
  const subAccount = runtime.helpers.subAccounts.get();
  if (!sender || !subAccount?.address) return false;
  return sender.toLowerCase() === subAccount.address.toLowerCase();
}

/** Popup send used as `globalAccountRequest` for add-owner and funding. */
function sendViaPopup(runtime: PopupRuntime, session: SessionData, request: RequestArguments) {
  return invoke(session, toEnvelope(session, request, runtime.chainId()), runtime.channel);
}

/**
 * Sign/send as the sub-account: local smart-account owner, or global popup for first
 * spend-permission funding / add-owner.
 */
export async function dispatchSubAccount(
  runtime: PopupRuntime,
  session: SessionData,
  request: RequestArguments
): Promise<unknown> {
  const correlationId = correlationIds.get(request);
  logSubAccountRequestStarted({ method: request.method, correlationId });
  try {
    const result = await sendToSubAccount(runtime, session, request);
    logSubAccountRequestCompleted({ method: request.method, correlationId });
    return result;
  } catch (error) {
    logSubAccountRequestError({
      method: request.method,
      correlationId,
      errorMessage: parseErrorMessageFromAny(error),
    });
    throw error;
  }
}

async function sendToSubAccount(
  runtime: PopupRuntime,
  session: SessionData,
  request: RequestArguments
): Promise<unknown> {
  const subAccount = runtime.helpers.subAccounts.get();
  const subAccountsConfig = runtime.helpers.subAccountsConfig.get();
  const config = runtime.helpers.config.get();

  assertPresence(
    subAccount?.address,
    standardErrors.provider.unauthorized(
      'no active sub account when sending request to sub account signer'
    )
  );

  const ownerAccount = subAccountsConfig?.toOwnerAccount
    ? await subAccountsConfig.toOwnerAccount()
    : await getCryptoKeyAccount();

  assertPresence(
    ownerAccount?.account,
    standardErrors.provider.unauthorized(
      'no active sub account owner when sending request to sub account signer'
    )
  );

  const sender = getSenderFromRequest(request);
  if (sender === undefined) {
    request = addSenderToRequest(request, subAccount.address);
  }

  const globalAccountAddress = (runtime.helpers.account.get().accounts ?? []).find(
    (account) => account.toLowerCase() !== subAccount.address.toLowerCase()
  );

  assertPresence(
    globalAccountAddress,
    standardErrors.provider.unauthorized(
      'no global account found when sending request to sub account signer'
    )
  );

  const dataSuffix = makeDataSuffix({
    attribution: config.preference?.attribution,
    dappOrigin: window.location.origin,
  });

  const walletSendCallsChainId =
    request.method === 'wallet_sendCalls' &&
    (request.params as WalletSendCallsParameters)?.[0]?.chainId;
  const chainId = walletSendCallsChainId ? hexToNumber(walletSendCallsChainId) : runtime.chainId();

  const client = getClient(chainId);
  assertPresence(
    client,
    standardErrors.rpc.internal(
      `client not found for chainId ${chainId} when sending request to sub account signer`
    )
  );

  const globalAccountRequest = (args: RequestArguments) => sendViaPopup(runtime, session, args);

  if (['eth_sendTransaction', 'wallet_sendCalls'].includes(request.method)) {
    if (subAccountsConfig?.funding === 'spend-permissions') {
      const storedSpendPermissions = runtime.helpers.spendPermissions.get();
      if (storedSpendPermissions.length === 0) {
        return routeThroughGlobalAccount({
          request,
          globalAccountAddress,
          subAccountAddress: subAccount.address,
          client,
          globalAccountRequest,
          chainId,
        });
      }
    }
  }

  const publicKey =
    ownerAccount.account.type === 'local'
      ? ownerAccount.account.address
      : ownerAccount.account.publicKey;

  let ownerIndex = await findOwnerIndex({
    address: subAccount.address,
    factory: subAccount.factory,
    factoryData: subAccount.factoryData,
    publicKey,
    client,
  });

  if (ownerIndex === -1) {
    const addOwnerCorrelationId = correlationIds.get(request);
    logAddOwnerStarted({ method: request.method, correlationId: addOwnerCorrelationId });
    try {
      ownerIndex = await handleAddSubAccountOwner({
        ownerAccount: ownerAccount.account,
        globalAccountRequest,
        chainId,
      });
      logAddOwnerCompleted({ method: request.method, correlationId: addOwnerCorrelationId });
    } catch (error) {
      logAddOwnerError({
        method: request.method,
        correlationId: addOwnerCorrelationId,
        errorMessage: parseErrorMessageFromAny(error),
      });
      throw standardErrors.provider.unauthorized(
        'failed to add sub account owner when sending request to sub account signer'
      );
    }
  }

  const { request: subAccountRequest } = await createSubAccountSigner({
    address: subAccount.address,
    owner: ownerAccount.account,
    client,
    factory: subAccount.factory,
    factoryData: subAccount.factoryData,
    parentAddress: globalAccountAddress,
    attribution: dataSuffix ? { suffix: dataSuffix } : undefined,
    ownerIndex,
  });

  try {
    return await subAccountRequest(request);
  } catch (error) {
    if (subAccountsConfig?.funding === 'manual') {
      throw error;
    }

    let errorObject: unknown;
    if (isViemError(error)) {
      errorObject = JSON.parse(error.details);
    } else if (isActionableHttpRequestError(error)) {
      errorObject = error;
    } else {
      throw error;
    }

    if (!(isActionableHttpRequestError(errorObject) && errorObject.data)) {
      throw error;
    }

    const fundingCorrelationId = correlationIds.get(request);
    logInsufficientBalanceErrorHandlingStarted({
      method: request.method,
      correlationId: fundingCorrelationId,
    });
    try {
      const result = await handleInsufficientBalanceError({
        errorData: errorObject.data,
        globalAccountAddress,
        subAccountAddress: subAccount.address,
        client,
        request,
        globalAccountRequest,
      });
      logInsufficientBalanceErrorHandlingCompleted({
        method: request.method,
        correlationId: fundingCorrelationId,
      });
      return result;
    } catch (handlingError) {
      console.error(handlingError);
      logInsufficientBalanceErrorHandlingError({
        method: request.method,
        correlationId: fundingCorrelationId,
        errorMessage: parseErrorMessageFromAny(handlingError),
      });
      throw error;
    }
  }
}
