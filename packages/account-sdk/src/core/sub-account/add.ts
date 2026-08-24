import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { AddSubAccountAccount } from ':core/rpc/wallet_addSubAccount.js';
import type { Session } from ':core/session/index.js';
import { invoke } from ':core/session/invoke.js';
import { toEnvelope } from ':core/translators/eip155/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { getCryptoKeyAccount } from ':owner-key/index.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import { isAddressEqual } from 'viem';
import { persistSubAccount } from './accounts.js';

type AddSubAccountParams = {
  version?: string;
  account?: AddSubAccountAccount & {
    keys?: { type: string; publicKey: string }[];
  };
};

function firstParam(request: RequestArguments): AddSubAccountParams | undefined {
  if (!Array.isArray(request.params)) return undefined;
  const first = request.params[0];
  if (!first || typeof first !== 'object') return undefined;
  return first as AddSubAccountParams;
}

/**
 * `wallet_addSubAccount`: return cache when it matches, otherwise fill create-keys
 * and `invoke` the global account (the wallet deploys / records the sub-account).
 */
export async function addSubAccount(
  runtime: WalletRuntime,
  session: Session,
  request: RequestArguments
) {
  const cached = runtime.store.subAccounts.get();
  const account = firstParam(request)?.account;
  const requestedAddress = account && 'address' in account ? account.address : undefined;

  // --- Cache hit: same address already persisted ---
  if (cached?.address) {
    const shouldUseCache = !requestedAddress || isAddressEqual(requestedAddress, cached.address);
    if (shouldUseCache) {
      persistSubAccount(runtime, session, cached);
      return cached;
    }
  }

  let next: RequestArguments = request;
  const params = firstParam(request);
  if (params?.account?.type === 'create') {
    // Fill owner keys for `type: 'create'` when the dapp omitted them.
    let keys: { type: string; publicKey: string }[];
    if (params.account.keys && params.account.keys.length > 0) {
      keys = params.account.keys;
    } else {
      const config = runtime.store.subAccountsConfig.get() ?? {};
      const { account: ownerAccount } = config.toOwnerAccount
        ? await config.toOwnerAccount()
        : await getCryptoKeyAccount();
      if (!ownerAccount) {
        throw standardErrors.provider.unauthorized(
          'could not get subaccount owner account when adding sub account'
        );
      }
      keys = [
        {
          type: ownerAccount.address ? 'address' : 'webauthn-p256',
          publicKey: ownerAccount.address || ownerAccount.publicKey,
        },
      ];
    }
    next = {
      ...request,
      params: [{ ...params, account: { ...params.account, keys } }],
    };
  }

  // Wallet records the sub-account on the global account (encrypted RPC).
  const response = await invoke(session, toEnvelope(next, runtime.chainId()), runtime.transport);
  assertSubAccount(response);
  persistSubAccount(runtime, session, response);
  return response;
}
