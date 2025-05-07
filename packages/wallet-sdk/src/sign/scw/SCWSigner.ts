import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { Hex, hexToNumber, numberToHex } from 'viem';

import { Communicator } from ':core/communicator/Communicator.js';
import { isActionableHttpRequestError, isViemError, standardErrors } from ':core/error/errors.js';
import { RPCRequestMessage, RPCResponseMessage } from ':core/message/RPCMessage.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import { FetchPermissionsResponse } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { WalletConnectResponse } from ':core/rpc/wallet_connect.js';
import { Address } from ':core/type/index.js';
import { ensureIntNumber, hexStringFromNumber } from ':core/type/util.js';
import { SDKChain, createClients, getClient } from ':store/chain-clients/utils.js';
import { store } from ':store/store.js';
import { assertArrayPresence, assertPresence } from ':util/assertPresence.js';
import { assertSubAccount } from ':util/assertSubAccount.js';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher.js';
import { fetchRPCRequest } from ':util/provider.js';
import { getCryptoKeyAccount } from '../../kms/crypto-key/index.js';
import { Signer } from '../interface.js';
import { SCWKeyManager } from './SCWKeyManager.js';
import {
  addSenderToRequest,
  assertFetchPermissionsRequest,
  assertParamsChainId,
  fillMissingParamsForFetchPermissions,
  getSenderFromRequest,
  initSubAccountConfig,
  injectRequestCapabilities,
  makeDataSuffix,
} from './utils.js';
import { createSubAccountSigner } from './utils/createSubAccountSigner.js';
import { findOwnerIndex } from './utils/findOwnerIndex.js';
import { handleAddSubAccountOwner } from './utils/handleAddSubAccountOwner.js';
import { handleInsufficientBalanceError } from './utils/handleInsufficientBalance.js';

type ConstructorOptions = {
  metadata: AppMetadata;
  communicator: Communicator;
  callback: ProviderEventCallback | null;
};

export class SCWSigner implements Signer {
  private readonly communicator: Communicator;
  private readonly keyManager: SCWKeyManager;
  private callback: ProviderEventCallback | null;

  private accounts: Address[];
  private chain: SDKChain;

  constructor(params: ConstructorOptions) {
    this.communicator = params.communicator;
    this.callback = params.callback;
    this.keyManager = new SCWKeyManager();

    const { account, chains } = store.getState();
    this.accounts = account.accounts ?? [];
    this.chain = account.chain ?? {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };

    if (chains) {
      createClients(chains);
    }
  }

  async handshake(args: RequestArguments) {
    // Open the popup before constructing the request message.
    // This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
    await this.communicator.waitForPopupLoaded?.();

    const handshakeMessage = await this.createRequestMessage({
      handshake: {
        method: args.method,
        params: args.params ?? [],
      },
    });
    const response: RPCResponseMessage =
      await this.communicator.postRequestAndWaitForResponse(handshakeMessage);

    // store peer's public key
    if ('failure' in response.content) throw response.content.failure;
    const peerPublicKey = await importKeyFromHexString('public', response.sender);
    await this.keyManager.setPeerPublicKey(peerPublicKey);

    const decrypted = await this.decryptResponseMessage(response);

    this.handleResponse(args, decrypted);
  }

  async request(request: RequestArguments) {
    if (this.accounts.length === 0) {
      switch (request.method) {
        case 'eth_requestAccounts': {
          const subAccountsConfig = store.subAccountsConfig.get();
          if (subAccountsConfig?.enableAutoSubAccounts) {
            // Wait for the popup to be loaded before making async calls
            await this.communicator.waitForPopupLoaded?.();
            await initSubAccountConfig();
            // This will populate the store with the sub account
            await this.request({
              method: 'wallet_connect',
              params: [
                {
                  version: 1,
                  capabilities: {
                    ...(subAccountsConfig?.capabilities ?? {}),
                    getSpendLimits: true,
                  },
                },
              ],
            });
          }
          this.callback?.('connect', { chainId: numberToHex(this.chain.id) });
          return this.accounts;
        }
        case 'wallet_switchEthereumChain': {
          assertParamsChainId(request.params);
          this.chain.id = Number(request.params[0].chainId);
          return;
        }
        case 'wallet_connect': {
          // Wait for the popup to be loaded before making async calls
          await this.communicator.waitForPopupLoaded?.();
          await initSubAccountConfig();
          const modifiedRequest = injectRequestCapabilities(
            request,
            store.subAccountsConfig.get()?.capabilities ?? {}
          );
          return this.sendRequestToPopup(modifiedRequest);
        }
        case 'wallet_sendCalls': {
          return this.sendRequestToPopup(request);
        }
        default:
          throw standardErrors.provider.unauthorized();
      }
    }

    if (this.shouldRequestUseSubAccountSigner(request)) {
      return this.sendRequestToSubAccountSigner(request);
    }

    switch (request.method) {
      case 'eth_requestAccounts': {
        this.callback?.('connect', { chainId: numberToHex(this.chain.id) });
        return this.accounts;
      }
      case 'eth_accounts':
        return this.accounts;
      case 'eth_coinbase':
        return this.accounts[0];
      case 'net_version':
        return this.chain.id;
      case 'eth_chainId':
        return numberToHex(this.chain.id);
      case 'wallet_getCapabilities':
        return store.getState().account.capabilities;
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChainRequest(request);
      case 'eth_ecRecover':
      case 'personal_sign':
      case 'wallet_sign':
      case 'personal_ecRecover':
      case 'eth_signTransaction':
      case 'eth_sendTransaction':
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
      case 'wallet_addEthereumChain':
      case 'wallet_watchAsset':
      case 'wallet_sendCalls':
      case 'wallet_showCallsStatus':
      case 'wallet_grantPermissions':
        return this.sendRequestToPopup(request);
      case 'wallet_connect': {
        // Wait for the popup to be loaded before making async calls
        await this.communicator.waitForPopupLoaded?.();
        await initSubAccountConfig();
        const subAccountsConfig = store.subAccountsConfig.get();
        const modifiedRequest = injectRequestCapabilities(
          request,
          subAccountsConfig?.capabilities ?? {}
        );
        return this.sendRequestToPopup(modifiedRequest);
      }
      // Sub Account Support
      case 'wallet_addSubAccount':
        return this.addSubAccount(request);
      case 'coinbase_fetchPermissions': {
        assertFetchPermissionsRequest(request);
        const completeRequest = fillMissingParamsForFetchPermissions(request);
        const permissions = (await fetchRPCRequest(
          completeRequest,
          CB_WALLET_RPC_URL
        )) as FetchPermissionsResponse;
        const requestedChainId = hexToNumber(completeRequest.params?.[0].chainId);
        store.spendLimits.set({ [requestedChainId]: permissions.permissions });
        return permissions;
      }
      default:
        if (!this.chain.rpcUrl) {
          throw standardErrors.rpc.internal('No RPC URL set for chain');
        }
        return fetchRPCRequest(request, this.chain.rpcUrl);
    }
  }

  private async sendRequestToPopup(request: RequestArguments) {
    // Open the popup before constructing the request message.
    // This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
    await this.communicator.waitForPopupLoaded?.();

    const response = await this.sendEncryptedRequest(request);
    const decrypted = await this.decryptResponseMessage(response);

    return this.handleResponse(request, decrypted);
  }

  private async handleResponse(request: RequestArguments, decrypted: RPCResponse) {
    const result = decrypted.result;

    if ('error' in result) throw result.error;

    switch (request.method) {
      case 'eth_requestAccounts': {
        const accounts = result.value as Address[];
        this.accounts = accounts;
        store.account.set({
          accounts,
          chain: this.chain,
        });
        this.callback?.('accountsChanged', accounts);
        break;
      }
      case 'wallet_connect': {
        const response = result.value as WalletConnectResponse;
        const accounts = response.accounts.map((account) => account.address);
        this.accounts = accounts;
        store.account.set({
          accounts,
        });

        const account = response.accounts.at(0);
        const capabilities = account?.capabilities;
        if (capabilities?.subAccounts) {
          const capabilityResponse = capabilities?.subAccounts;
          assertArrayPresence(capabilityResponse, 'subAccounts');
          assertSubAccount(capabilityResponse[0]);
          store.subAccounts.set({
            address: capabilityResponse[0].address,
            factory: capabilityResponse[0].factory,
            factoryData: capabilityResponse[0].factoryData,
          });
        }
        let accounts_ = [this.accounts[0]];

        const subAccount = store.subAccounts.get();
        const subAccountsConfig = store.subAccountsConfig.get();
        if (subAccount?.address) {
          // Sub account is always at index 0
          accounts_ = [subAccount.address, ...this.accounts];

          // Also update the accounts store if automatic sub accounts are enabled
          if (subAccountsConfig?.enableAutoSubAccounts) {
            store.account.set({
              accounts: accounts_,
            });
            this.accounts = accounts_;
          }
        }

        const spendLimits = response?.accounts?.[0].capabilities?.spendLimits;
        if (spendLimits && 'permissions' in spendLimits) {
          store.spendLimits.set({
            [this.chain.id]: spendLimits.permissions,
          });
        }

        this.callback?.('accountsChanged', accounts_);
        break;
      }
      default:
        break;
    }
    return result.value;
  }

  async cleanup() {
    const metadata = store.config.get().metadata;
    await this.keyManager.clear();

    // clear the store
    store.account.clear();
    store.subAccounts.clear();

    // reset the signer
    this.accounts = [];
    this.chain = {
      id: metadata?.appChainIds?.[0] ?? 1,
    };
  }

  /**
   * @returns `null` if the request was successful.
   * https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
   */
  private async handleSwitchChainRequest(request: RequestArguments) {
    assertParamsChainId(request.params);

    const chainId = ensureIntNumber(request.params[0].chainId);
    const localResult = this.updateChain(chainId);
    if (localResult) return null;

    const popupResult = await this.sendRequestToPopup(request);
    if (popupResult === null) {
      this.updateChain(chainId);
    }
    return popupResult;
  }

  private async sendEncryptedRequest(request: RequestArguments): Promise<RPCResponseMessage> {
    const sharedSecret = await this.keyManager.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized(
        'No valid session found, try requestAccounts before other methods'
      );
    }

    const encrypted = await encryptContent(
      {
        action: request,
        chainId: this.chain.id,
      },
      sharedSecret
    );
    const message = await this.createRequestMessage({ encrypted });

    return this.communicator.postRequestAndWaitForResponse(message);
  }

  private async createRequestMessage(
    content: RPCRequestMessage['content']
  ): Promise<RPCRequestMessage> {
    const publicKey = await exportKeyToHexString('public', await this.keyManager.getOwnPublicKey());
    return {
      id: crypto.randomUUID(),
      sender: publicKey,
      content,
      timestamp: new Date(),
    };
  }

  private async decryptResponseMessage(message: RPCResponseMessage): Promise<RPCResponse> {
    const content = message.content;

    // throw protocol level error
    if ('failure' in content) {
      throw content.failure;
    }

    const sharedSecret = await this.keyManager.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized('Invalid session');
    }

    const response: RPCResponse = await decryptContent(content.encrypted, sharedSecret);

    const availableChains = response.data?.chains;
    if (availableChains) {
      const nativeCurrencies = response.data?.nativeCurrencies;
      const chains: SDKChain[] = Object.entries(availableChains).map(([id, rpcUrl]) => {
        const nativeCurrency = nativeCurrencies?.[Number(id)];
        return {
          id: Number(id),
          rpcUrl,
          ...(nativeCurrency ? { nativeCurrency } : {}),
        };
      });

      store.chains.set(chains);

      this.updateChain(this.chain.id, chains);
      createClients(chains);
    }

    const walletCapabilities = response.data?.capabilities;
    if (walletCapabilities) {
      store.account.set({
        capabilities: walletCapabilities,
      });
    }
    return response;
  }

  private updateChain(chainId: number, newAvailableChains?: SDKChain[]): boolean {
    const state = store.getState();
    const chains = newAvailableChains ?? state.chains;
    const chain = chains?.find((chain) => chain.id === chainId);
    if (!chain) return false;

    if (chain !== this.chain) {
      this.chain = chain;
      store.account.set({
        chain,
      });
      this.callback?.('chainChanged', hexStringFromNumber(chain.id));
    }
    return true;
  }

  private async addSubAccount(request: RequestArguments): Promise<{
    address: Address;
    factory?: Address;
    factoryData?: Hex;
  }> {
    const state = store.getState();
    const subAccount = state.subAccount;
    if (subAccount?.address) {
      const allAccounts = this.accounts.filter(
        (account) => account.toLowerCase() !== subAccount.address.toLowerCase()
      );
      this.accounts = allAccounts;

      this.callback?.('accountsChanged', [subAccount.address, ...allAccounts]);
      return subAccount;
    }

    // Wait for the popup to be loaded before sending the request
    await this.communicator.waitForPopupLoaded?.();

    const response = await this.sendRequestToPopup(request);
    assertSubAccount(response);
    // Only store the sub account information after the popup has been closed and the
    // user has confirmed the creation
    store.subAccounts.set({
      address: response.address,
      factory: response.factory,
      factoryData: response.factoryData,
    });
    const existingAccounts = this.accounts.filter(
      (account) => account.toLowerCase() !== response.address.toLowerCase()
    );
    const allAccounts = [response.address, ...existingAccounts];
    store.account.set({ accounts: allAccounts });
    this.accounts = allAccounts;

    this.callback?.('accountsChanged', allAccounts);
    return response;
  }

  private shouldRequestUseSubAccountSigner(request: RequestArguments) {
    const sender = getSenderFromRequest(request);
    const subAccount = store.subAccounts.get();
    if (sender) {
      return sender.toLowerCase() === subAccount?.address.toLowerCase();
    }
    return false;
  }

  private async sendRequestToSubAccountSigner(request: RequestArguments) {
    const subAccount = store.subAccounts.get();
    const subAccountsConfig = store.subAccountsConfig.get();
    const config = store.config.get();

    assertPresence(
      subAccount?.address,
      standardErrors.provider.unauthorized('no active sub account')
    );

    // Get the owner account from the config
    const ownerAccount = subAccountsConfig?.toOwnerAccount
      ? await subAccountsConfig.toOwnerAccount()
      : await getCryptoKeyAccount();

    assertPresence(
      ownerAccount?.account,
      standardErrors.provider.unauthorized('no active sub account owner')
    );

    const sender = getSenderFromRequest(request);
    // if sender is undefined, we inject the active sub account
    // address into the params for the supported request methods
    if (sender === undefined) {
      request = addSenderToRequest(request, subAccount.address);
    }

    const client = getClient(this.chain.id);
    assertPresence(
      client,
      standardErrors.rpc.internal(`client not found for chainId ${this.chain.id}`)
    );

    const globalAccountAddress = this.accounts.find(
      (account) => account.toLowerCase() !== subAccount.address.toLowerCase()
    );

    assertPresence(
      globalAccountAddress,
      standardErrors.provider.unauthorized('no global account found')
    );
    const dataSuffix = makeDataSuffix({
      attribution: config.preference?.attribution,
      dappOrigin: window.location.origin,
    });

    const publicKey =
      ownerAccount.account.type === 'local'
        ? ownerAccount.account.address
        : ownerAccount.account.publicKey;

    const ownerIndex = await findOwnerIndex({
      address: subAccount.address,
      publicKey,
      client,
      factory: subAccount.factory,
      factoryData: subAccount.factoryData,
    });

    if (ownerIndex === -1) {
      try {
        await handleAddSubAccountOwner({
          ownerAccount: ownerAccount.account,
          globalAccountRequest: this.sendRequestToPopup.bind(this),
        });
      } catch {
        return standardErrors.provider.unauthorized('failed to add sub account owner');
      }
    }

    const { request: subAccountRequest } = await createSubAccountSigner({
      address: subAccount.address,
      owner: ownerAccount.account,
      client: client,
      factory: subAccount.factory,
      factoryData: subAccount.factoryData,
      parentAddress: globalAccountAddress,
      attribution: dataSuffix ? { suffix: dataSuffix } : undefined,
    });

    try {
      const result = await subAccountRequest(request);
      return result;
    } catch (error) {
      let errorObject: unknown;

      if (isViemError(error)) {
        errorObject = JSON.parse(error.details);
      } else if (isActionableHttpRequestError(error)) {
        errorObject = error;
      } else {
        throw error;
      }

      if (
        !(
          isActionableHttpRequestError(errorObject) &&
          subAccountsConfig?.dynamicSpendLimits &&
          subAccountsConfig?.enableAutoSubAccounts &&
          errorObject.data
        )
      ) {
        throw error;
      }

      try {
        const result = await handleInsufficientBalanceError({
          errorData: errorObject.data,
          globalAccountAddress,
          subAccountAddress: subAccount.address,
          client,
          request,
          subAccountRequest,
          globalAccountRequest: this.request.bind(this),
        });
        return result;
      } catch (handlingError) {
        console.error(handlingError);
        throw error;
      }
    }
  }
}
