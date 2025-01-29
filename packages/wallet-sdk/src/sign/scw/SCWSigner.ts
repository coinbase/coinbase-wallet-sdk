import { Signer } from '../interface.js';
import { SCWKeyManager } from './SCWKeyManager.js';
import {
  ACCOUNTS_KEY,
  ACTIVE_CHAIN_STORAGE_KEY,
  ACTIVE_SUB_ACCOUNT_ID_KEY,
  AVAILABLE_CHAINS_STORAGE_KEY,
  getSubAccountFromStorage,
  SCWStateManager,
  SUB_ACCOUNTS_KEY,
  WALLET_CAPABILITIES_STORAGE_KEY,
} from './SCWStateManager.js';
import { Chain } from './types.js';
import { enhanceRequestParams, get, getSenderFromRequest } from './utils.js';
import { Communicator } from ':core/communicator/Communicator.js';
import { standardErrors } from ':core/error/errors.js';
import { RPCRequestMessage, RPCResponseMessage } from ':core/message/RPCMessage.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import { Address } from ':core/type/index.js';
import { ensureIntNumber, hexStringFromNumber } from ':core/type/util.js';
import { createClients } from ':features/clients/utils.js';
import { createSubAccountSigner } from ':features/sub-accounts/createSubAccountSigner.js';
import { generateSubAccountKeypair } from ':features/sub-accounts/cryptokeys/keypair.js';
import { idb } from ':features/sub-accounts/cryptokeys/storage.js';
import { AddAddressResponse } from ':features/sub-accounts/types.js';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher.js';
import { fetchRPCRequest } from ':util/provider.js';

type ConstructorOptions = {
  metadata: AppMetadata;
  communicator: Communicator;
  callback: ProviderEventCallback | null;
};

export class SCWSigner implements Signer {
  private readonly metadata: AppMetadata;
  private readonly communicator: Communicator;
  private readonly keyManager: SCWKeyManager;

  private callback: ProviderEventCallback | null;

  private accounts: Address[];
  private subAccount: AddAddressResponse | null;
  private chain: Chain;

  constructor(params: ConstructorOptions) {
    this.metadata = params.metadata;
    this.communicator = params.communicator;
    this.callback = params.callback;
    this.keyManager = new SCWKeyManager();

    this.accounts = SCWStateManager.loadObject(ACCOUNTS_KEY) ?? [];
    this.chain = SCWStateManager.loadObject(ACTIVE_CHAIN_STORAGE_KEY) || {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };

    this.handshake = this.handshake.bind(this);
    this.request = this.request.bind(this);
    this.createRequestMessage = this.createRequestMessage.bind(this);
    this.decryptResponseMessage = this.decryptResponseMessage.bind(this);

    // Load sub accounts
    this.subAccount = getSubAccountFromStorage();

    // load chains
    const chains = SCWStateManager.loadObject<Chain[]>(AVAILABLE_CHAINS_STORAGE_KEY);
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

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    switch (args.method) {
      case 'eth_requestAccounts': {
        const accounts = result.value as Address[];
        this.accounts = accounts;
        SCWStateManager.storeObject(ACCOUNTS_KEY, accounts);
        this.callback?.('accountsChanged', accounts);
        break;
      }
    }
  }

  async request(request: RequestArguments) {
    if (this.accounts.length === 0) {
      switch (request.method) {
        case 'wallet_sendCalls':
          return this.sendRequestToPopup(request);
        default:
          throw standardErrors.provider.unauthorized();
      }
    }

    if (this.shouldRequestUseSubAccountSigner(request)) {
      return this.sendRequestToSubAccountSigner(request);
    }

    switch (request.method) {
      case 'eth_requestAccounts':
        this.callback?.('connect', { chainId: hexStringFromNumber(this.chain.id) });
        return this.accounts;
      case 'eth_accounts':
        return this.accounts;
      case 'eth_coinbase':
        return this.accounts[0];
      case 'net_version':
        return this.chain.id;
      case 'eth_chainId':
        return hexStringFromNumber(this.chain.id);
      case 'wallet_getCapabilities':
        return SCWStateManager.loadObject(WALLET_CAPABILITIES_STORAGE_KEY);
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
      // Sub Account Support
      case 'wallet_addAddress':
        return this.addAddress(request);
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

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    return result.value;
  }

  async cleanup() {
    SCWStateManager.clear();
    await this.keyManager.clear();
    this.accounts = [];
    this.chain = {
      id: this.metadata.appChainIds?.[0] ?? 1,
    };
  }

  /**
   * @returns `null` if the request was successful.
   * https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
   */
  private async handleSwitchChainRequest(request: RequestArguments) {
    const params = request.params as [
      {
        chainId: Address;
      },
    ];
    if (!params || !params[0]?.chainId) {
      throw standardErrors.rpc.invalidParams();
    }
    const chainId = ensureIntNumber(params[0].chainId);

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
      const chains = Object.entries(availableChains).map(([id, rpcUrl]) => {
        const nativeCurrency = nativeCurrencies?.[Number(id)];
        return {
          id: Number(id),
          rpcUrl,
          ...(nativeCurrency ? { nativeCurrency } : {}),
        };
      });
      SCWStateManager.storeObject(AVAILABLE_CHAINS_STORAGE_KEY, chains);
      this.updateChain(this.chain.id, chains);
      // create clients for sub accounts
      createClients(chains);
    }

    const walletCapabilities = response.data?.capabilities;
    if (walletCapabilities) {
      SCWStateManager.storeObject(WALLET_CAPABILITIES_STORAGE_KEY, walletCapabilities);
    }

    return response;
  }

  private updateChain(chainId: number, newAvailableChains?: Chain[]): boolean {
    const chains =
      newAvailableChains ?? SCWStateManager.loadObject<Chain[]>(AVAILABLE_CHAINS_STORAGE_KEY);
    const chain = chains?.find((chain) => chain.id === chainId);
    if (!chain) return false;

    if (chain !== this.chain) {
      this.chain = chain;
      SCWStateManager.storeObject(ACTIVE_CHAIN_STORAGE_KEY, chain);
      this.callback?.('chainChanged', hexStringFromNumber(chain.id));
    }
    return true;
  }

  private async addAddress(request: RequestArguments) {
    const active = SCWStateManager.getItem(ACTIVE_SUB_ACCOUNT_ID_KEY);
    if (active) {
      const subAccountMap = SCWStateManager.loadObject<Record<string, unknown>>(SUB_ACCOUNTS_KEY);
      const subAccount = subAccountMap?.[active];
      if (subAccount) {
        return subAccount;
      }
    }

    const signer = get(request, 'params[0].signer') as string;
    // could also check if the app supplied a getAddress sub account signer method?
    if (!signer) {
      // Open the popup before constructing the request message.
      // This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
      await this.communicator.waitForPopupLoaded?.();
      // Create the subaccount key pair
      const { id, keypair, publicKey } = await generateSubAccountKeypair();
      // send request to popup

      const chainId = get(request, 'params[0].chainId') as string;
      const params = Object.assign({}, { chainId, signer: publicKey });
      const response = await this.sendRequestToPopup({
        ...request,
        params: [params],
      });
      // Only store the sub account information after the popup has been closed and the
      // user has confirmed the creation
      SCWStateManager.setItem(ACTIVE_SUB_ACCOUNT_ID_KEY, publicKey);
      SCWStateManager.storeObject(SUB_ACCOUNTS_KEY, { [publicKey]: response });
      idb.setItem(id, { keypair });

      this.subAccount = getSubAccountFromStorage();
      return response;
    }
    // when apps bring their own keys
    const response = await this.sendRequestToPopup(request);

    // Only store the sub account information after the popup has been closed and the
    // user has confirmed the creation
    SCWStateManager.setItem(ACTIVE_SUB_ACCOUNT_ID_KEY, signer.toString());
    SCWStateManager.storeObject(SUB_ACCOUNTS_KEY, { [signer]: response });

    this.subAccount = getSubAccountFromStorage();
    return response;
  }

  private shouldRequestUseSubAccountSigner(request: RequestArguments) {
    const sender = getSenderFromRequest(request);
    // if the sender is undefined, it means the application did not provide a sender
    // in this case, we assume the request is for the active sub account (if present)
    // if the sender is defined, we check if it is the same as the active sub account
    // if not, we use the root account signer
    return (
      (this.subAccount && sender === undefined) ||
      (this.subAccount && this.subAccount.address === sender)
    );
  }

  private async sendRequestToSubAccountSigner(request: RequestArguments) {
    if (!this.subAccount) {
      throw standardErrors.provider.unauthorized('No active sub account');
    }
    const sender = getSenderFromRequest(request);
    // if sender is undefined, we inject the active sub account
    // address into the params for the supported request methods
    if (sender === undefined) {
      request = enhanceRequestParams(request, this.subAccount.address as Address);
    }

    const signer = await createSubAccountSigner(this.subAccount);
    return signer.request(request);
  }
}
