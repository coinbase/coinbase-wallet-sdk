/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-console */
// @ts-ignore
import { binary_to_base58 } from 'base58-js';
import EventEmitter from 'eventemitter3';
import { Hex, hexToBytes, WalletGrantPermissionsParameters } from 'viem';

import { standardErrorCodes, standardErrors } from './core/error';
import { serializeError } from './core/error/serialize';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
  RequestArguments,
  Signer,
} from './core/provider/interface';
import { AddressString, Chain, IntNumber } from './core/type';
import { areAddressArraysEqual, hexStringFromIntNumber } from './core/type/util';
import { AccountsUpdate, ChainUpdate } from './sign/interface';
import { createSigner, fetchSignerType, loadSignerType, storeSignerType } from './sign/util';
import { checkErrorForInvalidRequestArgs, fetchRPCRequest } from './util/provider';
import { Communicator } from ':core/communicator/Communicator';
import { SignerType } from ':core/message';
import { determineMethodCategory } from ':core/provider/method';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const { createCredential } = require('webauthn-p256');

export class CoinbaseWalletProvider extends EventEmitter implements ProviderInterface {
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly communicator: Communicator;

  private signer: Signer | null;
  protected accounts: AddressString[] = [];
  protected chain: Chain;

  constructor({ metadata, preference: { keysUrl, ...preference } }: Readonly<ConstructorOptions>) {
    super();
    this.metadata = metadata;
    this.preference = preference;
    this.communicator = new Communicator(keysUrl);
    this.chain = {
      id: metadata.appChainIds?.[0] ?? 1,
    };
    // Load states from storage
    const signerType = loadSignerType();
    this.signer = signerType ? this.initSigner(signerType) : null;
  }

  public get connected() {
    return this.accounts.length > 0;
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    try {
      const invalidArgsError = checkErrorForInvalidRequestArgs(args);
      if (invalidArgsError) throw invalidArgsError;
      // unrecognized methods are treated as fetch requests
      const category = determineMethodCategory(args.method) ?? 'fetch';
      return this.handlers[category](args) as T;
    } catch (error) {
      return Promise.reject(serializeError(error, args.method));
    }
  }

  protected readonly handlers = {
    session: async (request: RequestArguments) => {
      const requestBody = {
        ...request,
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
      };
      const res = await window.fetch('http://', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const response = await res.json();
      return response.result;
    },

    // eth_requestAccounts
    handshake: async (args: RequestArguments): Promise<AddressString[]> => {
      try {
        if (this.connected) {
          this.emit('connect', {
            chainId: hexStringFromIntNumber(IntNumber(this.chain.id)),
          });
          return this.accounts;
        }

        const requests = (args.params as { requests: any }).requests as (
          | {
              method: 'wallet_grantPermissions';
              params: WalletGrantPermissionsParameters;
            }
          | { method: 'personal_sign'; params: [Hex] }
        )[];
        const credential = await createCredential({ name: 'App' });
        // @ts-ignore
        const updatedRequests = await Promise.all(
          requests.map(async (request) => {
            if (request.method === 'wallet_grantPermissions') {
              if (request.params.signer?.type === 'wallet') {
                return {
                  ...request,
                  params: {
                    ...request.params,
                    signer: {
                      type: 'key',
                      data: {
                        id: `zDn${binary_to_base58(hexToBytes(credential.publicKeyCompressed))}`,
                      },
                    },
                  },
                };
              }
            }
            return request;
          })
        );

        const signerType = await this.requestSignerSelection();
        const signer = this.initSigner(signerType);
        const accounts = await signer.handshake({ requests: updatedRequests });

        this.signer = signer;
        storeSignerType(signerType);

        this.emit('connect', {
          chainId: hexStringFromIntNumber(IntNumber(this.chain.id)),
        });
        return accounts;
      } catch (error) {
        this.handleUnauthorizedError(error);
        throw error;
      }
    },

    sign: async (request: RequestArguments) => {
      if (!this.connected || !this.signer) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }
      try {
        return await this.signer.request(request);
      } catch (error) {
        this.handleUnauthorizedError(error);
        throw error;
      }
    },

    fetch: (request: RequestArguments) => fetchRPCRequest(request, this.chain),

    state: (request: RequestArguments) => {
      const getConnectedAccounts = (): AddressString[] => {
        if (this.connected) return this.accounts;
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      };
      switch (request.method) {
        case 'eth_chainId':
          return hexStringFromIntNumber(IntNumber(this.chain.id));
        case 'net_version':
          return this.chain.id;
        case 'eth_accounts':
          return getConnectedAccounts();
        case 'eth_coinbase':
          return getConnectedAccounts()[0];
        default:
          return this.handlers.unsupported(request);
      }
    },

    deprecated: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(`Method ${method} is deprecated.`);
    },

    unsupported: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(`Method ${method} is not supported.`);
    },
  };

  private handleUnauthorizedError(error: unknown) {
    const e = error as { code?: number };
    if (e.code === standardErrorCodes.provider.unauthorized) this.disconnect();
  }

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable(): Promise<unknown> {
    console.warn(
      `.enable() has been deprecated. Please use .request({ method: "eth_requestAccounts" }) instead.`
    );
    return await this.request({
      method: 'ahhhhh',
    });
  }

  async disconnect(): Promise<void> {
    this.accounts = [];
    this.chain = { id: 1 };
    ScopedLocalStorage.clearAll();
    this.emit('disconnect', standardErrors.provider.disconnected('User initiated disconnection'));
  }

  readonly isCoinbaseWallet = true;

  protected readonly updateListener = {
    onAccountsUpdate: ({ accounts, source }: AccountsUpdate) => {
      if (areAddressArraysEqual(this.accounts, accounts)) return;
      this.accounts = accounts;
      if (source === 'storage') return;
      this.emit('accountsChanged', this.accounts);
    },
    onChainUpdate: ({ chain, source }: ChainUpdate) => {
      if (chain.id === this.chain.id && chain.rpcUrl === this.chain.rpcUrl) return;
      this.chain = chain;
      if (source === 'storage') return;
      this.emit('chainChanged', hexStringFromIntNumber(IntNumber(chain.id)));
    },
  };

  private requestSignerSelection(): Promise<SignerType> {
    return fetchSignerType({
      communicator: this.communicator,
      preference: this.preference,
      metadata: this.metadata,
    });
  }

  private initSigner(signerType: SignerType): Signer {
    return createSigner({
      signerType,
      metadata: this.metadata,
      communicator: this.communicator,
      updateListener: this.updateListener,
    });
  }
}
