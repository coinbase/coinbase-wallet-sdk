// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import SafeEventEmitter from "@metamask/safe-event-emitter";
import { PublicKey, SendOptions, Transaction } from "@solana/web3.js";

import { ScopedLocalStorage } from "../lib/ScopedLocalStorage";
import { SolanaWeb3Method } from "../relay/solana/SolanaWeb3Method";
import { SolanaWeb3Response } from "../relay/solana/SolanaWeb3Response";
import { randomBytesHex } from "../util";
import { RequestArguments } from "./Web3Provider";
export const SOLANA_PROVIDER_ID = "window.coinbaseSolana";

type ErrorResponse = {
  method: string;
  message: string;
};

type SolanaWeb3Provider = {
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signAndSendTransaction: (
    transaction: Transaction,
    options?: SendOptions,
  ) => Promise<{ signature: string }>;
  signMessage: (
    message: Uint8Array,
  ) => Promise<{ signature: Uint8Array } | Error>;
  handleResponse: (event: any) => void;
};

declare global {
  interface Window {
    __CIPHER_BRIDGE__?: {
      postMessage(message: string): void;
    };
  }
}

export class SolanaProvider
  extends SafeEventEmitter
  implements SolanaWeb3Provider
{
  private _eventManager = new Map<string, any>();
  private _storage: ScopedLocalStorage = new ScopedLocalStorage(
    "coinbaseSolana",
  );
  isConnected: boolean;
  publicKey: PublicKey | null;

  public constructor() {
    super();

    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this._parentDisconnect = this._parentDisconnect.bind(this);
    this.sendTransaction = this.sendTransaction.bind(this);
    this.signMessage = this.signMessage.bind(this);
    this.signTransaction = this.signTransaction.bind(this);
    this._request = this._request.bind(this);
    this.isConnected = false;
    this.publicKey = null;
    window.addEventListener("message", this.handleResponse);
  }

  public handleResponse = (event: any) => {
    if (!["extensionUIResponse", "WEB3_RESPONSE"].includes(event.data.type)) {
      return;
    }

    const data = event.data.data;
    const id = data.id;
    const action = data.action;

    const callback = this.getCallback(id);

    if (callback) {
      this._eventManager.delete(id);

      switch (action) {
        case SolanaWeb3Response.web3RequestCanceled:
          callback(undefined, new Error("User canceled request"));
          break;
        case SolanaWeb3Response.connectionSuccess:
          if (Array.isArray(data?.addresses)) {
            callback(data.addresses);
            return;
          }
          callback(null, new Error("Connection error"));
          break;
        case SolanaWeb3Response.signMessageSuccess:
          if (data.signature) {
            const signature = data.signature;
            if (Array.isArray(signature)) {
              callback(signature);
              return;
            }
          }
          callback(null, new Error("Invalid signature"));
          break;
        case SolanaWeb3Response.signTransactionSuccess:
        case SolanaWeb3Response.signAllTransactionsSuccess:
          if (
            data.signedTransactionData &&
            Array.isArray(data.signedTransactionData)
          ) {
            callback(data.signedTransactionData);
            return;
          }
          callback(null, new Error("Invalid transaction data"));
          break;
        case SolanaWeb3Response.sendTransactionSuccess:
          if (data.txHash) {
            callback(data.txHash);
            return;
          }
          callback(null, new Error("Invalid transaction hash response"));
          break;
        case SolanaWeb3Response.featureFlagOff:
          callback(null, new Error("Feature flag is off"));
          this._parentDisconnect();
          break;
        default:
          // should never get here, no-op
          break;
      }
    } else if (action === SolanaWeb3Response.parentDisconnected) {
      this._parentDisconnect();
    }
  };

  getCallback(id: string) {
    return this._eventManager.get(id);
  }

  private _parentDisconnect = () => {
    // storage should only be cleared when the extension sends a disconnect event
    this._storage.clear();

    void this.disconnect().then(() => {
      this.emit("disconnect");
    });
  };

  public async connect(): Promise<void> {
    const method = SolanaWeb3Method.connect;
    if (!window.__CIPHER_BRIDGE__) {
      window.postMessage(
        {
          type: "solanaProviderRequest",
          data: {
            action: "firstConnectRequest",
          },
        },
        "*",
      );
    }
    return new Promise((resolve, reject) => {
      this._request({ method }, (addresses: string[], error: any) => {
        if (!error) {
          try {
            this.isConnected = true;
            this.publicKey = new PublicKey(addresses[0]);

            this._storage.setItem("Addresses", JSON.stringify(addresses));

            return resolve();
          } catch (e) {
            void this.disconnect().then(() => {
              return reject(this._getErrorResponse(method, "Connection error"));
            });
          }
        }
        void this.disconnect().then(() => {
          return reject(this._getErrorResponse(method, "Connection error"));
        });
      });
    });
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.publicKey = null;

    return Promise.resolve();
  }

  public async sendTransaction(
    transaction: Transaction,
    _connection: any,
    options: SendOptions,
  ) {
    // We do not currently support custom connection so we ignore this arg
    // and forward the request to signAndSendTransaction
    return this.signAndSendTransaction(transaction, options);
  }

  public async signAndSendTransaction(
    transaction: Transaction,
    options?: SendOptions,
  ): Promise<{ signature: string }> {
    const method = SolanaWeb3Method.sendTransaction;
    this._checkWalletConnected(method);

    return new Promise((resolve, reject) => {
      try {
        const serializedTransaction = transaction.serialize({
          verifySignatures: false,
        });

        this._request(
          {
            method,
            params: {
              transactions: [[...serializedTransaction]],
              options,
            },
          },
          (signature: string, error: any) => {
            if (!error) {
              return resolve({ signature });
            }
            return reject(
              error ??
                this._getErrorResponse(method, "Could not send transactions"),
            );
          },
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  public async signMessage(
    msg: Uint8Array,
  ): Promise<{ signature: Uint8Array } | Error> {
    const method = SolanaWeb3Method.signMessage;
    const message = Buffer.from(msg).toString();
    this._checkWalletConnected(method);
    return new Promise((resolve, reject) => {
      this._request(
        {
          method,
          params: {
            message,
            address: this.publicKey!.toString(),
          },
        },
        (signatureArray: any, error: any) => {
          if (!error) {
            const signature = new Uint8Array(signatureArray);
            return resolve({ signature });
          }
          return reject(error);
        },
      );
    });
  }

  public async signAllTransactions(
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    const method = SolanaWeb3Method.signAllTransactions;
    this._checkWalletConnected(method);
    return new Promise((resolve, reject) => {
      try {
        const serializedTransactions = transactions.map(transaction => {
          return [...transaction.serialize({ verifySignatures: false })];
        });
        this._request(
          {
            method,
            params: {
              transactions: serializedTransactions,
            },
          },
          (signedTransactionsArray: number[][], error: any) => {
            if (!error) {
              try {
                const parsedTransactions = signedTransactionsArray.map(
                  (txArray: number[]) => {
                    return Transaction.from(txArray);
                  },
                );
                const allTransactionsAreSigned = parsedTransactions.every(
                  tx => tx.signature,
                );
                if (allTransactionsAreSigned) {
                  resolve(parsedTransactions);
                }
              } catch (e) {
                reject(e);
              }
            }
            return reject(
              error ??
                this._getErrorResponse(method, "Could not sign transactions"),
            );
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    const method = SolanaWeb3Method.signTransaction;
    this._checkWalletConnected(method);
    return new Promise((resolve, reject) => {
      try {
        const serializedTransaction = transaction.serialize({
          verifySignatures: false,
        });
        this._request(
          {
            method,
            params: {
              transactions: [[...serializedTransaction]],
            },
          },
          (transactionDataArray: number[], error: any) => {
            if (!error) {
              try {
                const parsedTransaction =
                  Transaction.from(transactionDataArray);

                if (parsedTransaction?.signature) {
                  resolve(parsedTransaction);
                }
              } catch (e) {
                reject(e);
              }
            }
            return reject(
              error ??
                this._getErrorResponse(method, "Could not sign transaction"),
            );
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  private _getErrorResponse(
    method: string,
    errorMessage: string,
  ): ErrorResponse {
    return { method, message: errorMessage };
  }

  private _checkWalletConnected(method: string) {
    if (!this.isConnected)
      throw this._getErrorResponse(method, "Wallet is not connected");
  }

  private _request(args: RequestArguments, callback: any) {
    const id = randomBytesHex(8);
    this._eventManager.set(id, callback);
    this._postMessage(args, id);
  }

  private _postMessage(args: RequestArguments, id: string) {
    if (window.__CIPHER_BRIDGE__) {
      const message = {
        id,
        type: "browserRequest",
        request: {
          method: args.method,
          params: args.params,
        },
        provider: SOLANA_PROVIDER_ID,
      };

      window.__CIPHER_BRIDGE__.postMessage(JSON.stringify(message));
    } else {
      const message = {
        type: "extensionUIRequest",
        provider: SOLANA_PROVIDER_ID,
        data: {
          action: args.method,
          request: {
            method: args.method,
            params: args.params,
          },
          id,
          dappInfo: {
            dappLogoURL: "",
          },
        },
      };
      window.postMessage(message, "*");
    }
  }
}
