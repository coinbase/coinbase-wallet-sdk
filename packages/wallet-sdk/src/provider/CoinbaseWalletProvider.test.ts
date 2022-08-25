import { fireEvent } from "@testing-library/preact";

import { MockRelayClass } from "../__mocks__/relay";
import {
  MOCK_ADDERESS,
  MOCK_SIGNED_TX,
  MOCK_TX,
  MOCK_TYPED_DATA,
} from "../fixtures/provider";
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage";
import { LOCAL_STORAGE_ADDRESSES_KEY } from "../relay/WalletSDKRelayAbstract";
import { WalletSDKRelayEventManager } from "../relay/WalletSDKRelayEventManager";
import { Web3Method } from "../relay/Web3Method";
import { ProviderType } from "../types";
import {
  CoinbaseWalletProvider,
  CoinbaseWalletProviderOptions,
} from "./CoinbaseWalletProvider";

const storage = new ScopedLocalStorage("CoinbaseWalletProvider");

const setupCoinbaseWalletProvider = (
  options: Partial<CoinbaseWalletProviderOptions> = {},
) => {
  return new CoinbaseWalletProvider({
    chainId: 1,
    jsonRpcUrl: "http://test.ethnode.com",
    qrUrl: null,
    overrideIsCoinbaseWallet: true,
    overrideIsCoinbaseBrowser: false,
    overrideIsMetaMask: false,
    relayEventManager: new WalletSDKRelayEventManager(),
    relayProvider: async () => Promise.resolve(new MockRelayClass()),
    storage,
    ...options,
  });
};

const mockSuccessfulFetchResponse = () => {
  global.fetch = jest.fn().mockImplementationOnce(() => {
    return new Promise(resolve => {
      resolve({
        ok: true,
        json: () => ({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_blockNumber",
          result: "0x1",
        }),
      });
    });
  });
};

describe("CoinbaseWalletProvider", () => {
  afterEach(() => {
    storage.clear();
  });

  it("instantiates", () => {
    const provider = setupCoinbaseWalletProvider();
    expect(provider).toBeInstanceOf(CoinbaseWalletProvider);
  });

  it("gives provider info", () => {
    const provider = setupCoinbaseWalletProvider();
    expect(provider.selectedAddress).toBe(undefined);
    expect(provider.networkVersion).toBe("1");
    expect(provider.chainId).toBe("0x1");
    expect(provider.isWalletLink).toBe(true);
    expect(provider.isCoinbaseWallet).toBe(true);
    expect(provider.isCoinbaseBrowser).toBe(false);
    expect(provider.isMetaMask).toBe(false);
    expect(provider.host).toBe("http://test.ethnode.com");
    expect(provider.connected).toBe(true);
    expect(provider.isConnected()).toBe(true);
  });

  it("handles setting provider info", () => {
    const url = "https://new.jsonRpcUrl.com";
    const provider = setupCoinbaseWalletProvider();
    provider.setProviderInfo(url, 1);
    expect(provider.host).toBe(url);
  });

  it("handles setting the app info", () => {
    const provider = setupCoinbaseWalletProvider();
    provider.setAppInfo("Test Dapp", null);
    expect(provider.host).toBe("http://test.ethnode.com");
  });

  it("handles setting disable reload on disconnect flag", () => {
    const provider = setupCoinbaseWalletProvider();
    provider.disableReloadOnDisconnect();
    expect(provider.reloadOnDisconnect).toBe(false);
  });

  it("handles subscriptions", () => {
    const provider = setupCoinbaseWalletProvider();
    expect(provider.supportsSubscriptions()).toBe(false);

    expect(() => {
      provider.subscribe();
    }).toThrowError("Subscriptions are not supported");

    expect(() => {
      provider.unsubscribe();
    }).toThrowError("Subscriptions are not supported");
  });

  it("handles enabling the provider successfully", async () => {
    const provider = setupCoinbaseWalletProvider();
    const response = await provider.enable();
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("handles close", async () => {
    const spy = jest.spyOn(MockRelayClass.prototype, "resetAndReload");
    const relay = new MockRelayClass();

    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => Promise.resolve(relay),
    });
    await provider.close();
    expect(spy).toHaveBeenCalled();
  });

  it("handles disconnect", () => {
    const provider = setupCoinbaseWalletProvider();
    expect(provider.disconnect()).toBe(true);
  });

  it("handles making generic requests successfully", async () => {
    const provider = setupCoinbaseWalletProvider();
    const data = {
      from: MOCK_ADDERESS,
      to: MOCK_ADDERESS,
    };
    const action = "cbSignAndSubmit";
    const response = await provider.genericRequest(data, action);
    expect(response).toBe("Success");
  });

  it("handles making a select provider request", async () => {
    const spy = jest.spyOn(MockRelayClass.prototype, "selectProvider");
    const relay = new MockRelayClass();

    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => Promise.resolve(relay),
    });
    const providerOptions = [
      ProviderType.CoinbaseWallet,
      ProviderType.MetaMask,
    ];
    await provider.selectProvider(providerOptions);
    expect(spy).toHaveBeenCalledWith(providerOptions);
  });

  it("handles making a send with a string param", async () => {
    const provider = setupCoinbaseWalletProvider();
    const response = await provider.send("eth_requestAccounts");
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("handles making a rpc request", async () => {
    const provider = setupCoinbaseWalletProvider();
    const response = await provider.request<string[]>({
      method: "eth_requestAccounts",
    });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("handles making a send with a rpc request", async () => {
    const mockCallback = jest.fn();
    const provider = setupCoinbaseWalletProvider();
    await provider.send(
      {
        jsonrpc: "2.0",
        method: "eth_requestAccounts",
        params: [],
        id: 1,
      },
      mockCallback,
    );

    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        result: [MOCK_ADDERESS.toLowerCase()],
      }),
    );
  });

  it("handles making a send with a string param", async () => {
    const provider = setupCoinbaseWalletProvider();
    const mockCallback = jest.fn();
    await provider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "eth_requestAccounts",
        params: [],
        id: 1,
      },
      mockCallback,
    );
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        result: [MOCK_ADDERESS.toLowerCase()],
      }),
    );
  });

  it("handles generic requests successfully", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "genericRequest").mockReturnValue({
      cancel: () => {},
      promise: Promise.resolve({
        method: Web3Method.generic,
        result: "Success",
      }),
    });
    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => {
        return Promise.resolve(relay);
      },
    });
    const data = {
      from: MOCK_ADDERESS,
      to: MOCK_ADDERESS,
    };
    const action = "cbSignAndSubmit";

    const result = await provider.genericRequest(data, action);
    expect(result).toBe("Success");
  });

  it("updates the providers address on a postMessage's 'addressChanged' event", () => {
    const provider = setupCoinbaseWalletProvider();

    // @ts-expect-error _addresses is private
    expect(provider._addresses).not.toEqual([
      "0x0000000000000000000000000000000000001010",
    ]);

    fireEvent(
      window,
      new MessageEvent("message", {
        data: {
          data: {
            action: "addressChanged",
            address: "0x0000000000000000000000000000000000001010",
          },
          type: "walletLinkMessage",
        },
        origin: "dapp.finance",
      }),
    );

    // @ts-expect-error _addresses is private
    expect(provider._addresses).toEqual([
      "0x0000000000000000000000000000000000001010",
    ]);
  });

  it("handles error responses with generic requests", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "genericRequest").mockReturnValue({
      cancel: () => {},
      // @ts-expect-error result should be a string
      promise: Promise.resolve({
        method: Web3Method.generic,
        result: { foo: "bar" },
      }),
    });
    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => {
        return Promise.resolve(relay);
      },
    });
    const data = {
      from: MOCK_ADDERESS,
      to: MOCK_ADDERESS,
    };
    const action = "cbSignAndSubmit";

    await expect(() =>
      provider.genericRequest(data, action),
    ).rejects.toThrowError("result was not a string");
  });

  it("handles user rejecting enable call", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "requestEthereumAccounts").mockReturnValue({
      cancel: () => {},
      promise: Promise.reject(new Error("rejected")),
    });
    const provider = setupCoinbaseWalletProvider({
      storage: new ScopedLocalStorage("reject-info"),
      relayProvider: async () => {
        return Promise.resolve(relay);
      },
    });

    await expect(() => provider.enable()).rejects.toThrowError(
      "User denied account authorization",
    );
  });

  it("handles user rejecting enable call with unknown error", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "requestEthereumAccounts").mockReturnValue({
      cancel: () => {},
      promise: Promise.reject(new Error("Unknown")),
    });
    const provider = setupCoinbaseWalletProvider({
      storage: new ScopedLocalStorage("unknown-error"),
      relayProvider: async () => {
        return Promise.resolve(relay);
      },
    });

    await expect(() => provider.enable()).rejects.toThrowError("Unknown");
  });

  it("returns the users address on future eth_requestAccounts calls", async () => {
    const provider = setupCoinbaseWalletProvider();
    // Set the account on the first request
    const response1 = await provider.request<string[]>({
      method: "eth_requestAccounts",
    });
    expect(response1[0]).toBe(MOCK_ADDERESS.toLowerCase());

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()]);

    // Set the account on the first request
    const response2 = await provider.request<string[]>({
      method: "eth_requestAccounts",
    });
    expect(response2[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("gets the users address from storage on init", async () => {
    const localStorage = new ScopedLocalStorage("test");
    localStorage.setItem(
      LOCAL_STORAGE_ADDRESSES_KEY,
      MOCK_ADDERESS.toLowerCase(),
    );
    const provider = setupCoinbaseWalletProvider({
      storage: localStorage,
    });

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()]);

    // Set the account on the first request
    const response = await provider.request<string[]>({
      method: "eth_requestAccounts",
    });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("handles scanning QR code with bad response", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "scanQRCode").mockReturnValue({
      cancel: () => {},
      // @ts-expect-error result should be a string
      promise: Promise.resolve({
        method: Web3Method.scanQRCode,
        result: { foo: "bar" },
      }),
    });
    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => Promise.resolve(relay),
    });

    await expect(() =>
      provider.scanQRCode(new RegExp("cbwallet://cool")),
    ).rejects.toThrowError("result was not a string");
  });

  it("handles scanning QR code", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "scanQRCode").mockReturnValue({
      cancel: () => {},
      promise: Promise.resolve({
        method: Web3Method.scanQRCode,
        result: "cbwallet://result",
      }),
    });
    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => Promise.resolve(relay),
    });
    const result = await provider.scanQRCode(new RegExp("cbwallet://cool"));
    expect(result).toBe("cbwallet://result");
  });

  describe("RPC Methods", () => {
    let provider: CoinbaseWalletProvider | null = null;
    let localStorage: ScopedLocalStorage;
    beforeEach(() => {
      localStorage = new ScopedLocalStorage("test");
      localStorage.setItem(
        LOCAL_STORAGE_ADDRESSES_KEY,
        MOCK_ADDERESS.toLowerCase(),
      );
      provider = setupCoinbaseWalletProvider({
        storage: localStorage,
      });
    });

    afterEach(() => {
      provider = null;
      localStorage?.clear();
    });

    test("eth_accounts", async () => {
      const response = await provider?.request({
        method: "eth_accounts",
      });
      expect(response).toEqual([MOCK_ADDERESS.toLowerCase()]);
    });

    test("eth_coinbase", async () => {
      const response = await provider?.request({
        method: "eth_coinbase",
      });
      expect(response).toBe(MOCK_ADDERESS.toLowerCase());
    });

    test("net_version", async () => {
      const response = await provider?.request({
        method: "net_version",
      });
      expect(response).toEqual("1");
    });

    test("eth_chainId", async () => {
      const response = await provider?.request<string>({
        method: "eth_chainId",
      });
      expect(response).toEqual("0x1");
    });

    test("eth_uninstallFilter", async () => {
      const response = await provider?.request<boolean>({
        method: "eth_uninstallFilter",
        params: ["0xb"],
      });
      expect(response).toBe(true);
    });

    test("eth_requestAccounts", async () => {
      const response = await provider?.request({
        method: "eth_requestAccounts",
      });
      expect(response).toEqual([MOCK_ADDERESS.toLowerCase()]);
    });

    test("eth_sign success", async () => {
      const response = await provider?.request({
        method: "eth_sign",
        params: [MOCK_ADDERESS.toLowerCase(), "Super safe message"],
      });
      expect(response).toBe("0x");
    });

    test("eth_sign fail bad address", async () => {
      await expect(() =>
        provider?.request({
          method: "eth_sign",
          params: ["0x123456789abcdef", "Super safe message"],
        }),
      ).rejects.toThrowError("Invalid Ethereum address: 0x123456789abcdef");
    });

    test("eth_sign fail bad message format", async () => {
      await expect(() =>
        provider?.request({
          method: "eth_sign",
          params: [MOCK_ADDERESS.toLowerCase(), 123456789],
        }),
      ).rejects.toThrowError("Not binary data: 123456789");
    });

    test("eth_ecRecover", async () => {
      const response = await provider?.request({
        method: "eth_ecRecover",
        params: ["Super safe message", "0x"],
      });
      expect(response).toBe(MOCK_ADDERESS);
    });

    test("personal_sign success", async () => {
      const response = await provider?.request({
        method: "personal_sign",
        params: ["My secret message", MOCK_ADDERESS.toLowerCase()],
      });
      expect(response).toBe("0x");
    });

    test("personal_sign fail", async () => {
      await expect(() =>
        provider?.request({
          method: "personal_sign",
          params: ["0x123456789abcdef", "Super safe message"],
        }),
      ).rejects.toThrowError("Invalid Ethereum address: Super safe message");
    });

    test("personal_ecRecover", async () => {
      const response = await provider?.request({
        method: "personal_ecRecover",
        params: ["Super safe message", "0x"],
      });
      expect(response).toBe(MOCK_ADDERESS);
    });

    test("eth_signTransaction", async () => {
      const response = await provider?.request({
        method: "eth_signTransaction",
        params: [
          {
            from: MOCK_ADDERESS,
            to: MOCK_ADDERESS,
            gasPrice: "21000",
            maxFeePerGas: "10000000000",
            maxPriorityFeePerGas: "10000000000",
            gas: "10000000000",
            value: "10000000000",
            data: "0xA0",
            nonce: 1,
          },
        ],
      });
      expect(response).toBe(MOCK_TX);
    });

    test("eth_sendRawTransaction", async () => {
      const response = await provider?.request({
        method: "eth_sendRawTransaction",
        params: [MOCK_SIGNED_TX],
      });
      expect(response).toBe(MOCK_TX);
    });

    test("eth_sendTransaction", async () => {
      const response = await provider?.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: MOCK_ADDERESS,
            to: MOCK_ADDERESS,
            gasPrice: "21000",
            maxFeePerGas: "10000000000",
            maxPriorityFeePerGas: "10000000000",
            gas: "10000000000",
            value: "10000000000",
            data: "0xA0",
            nonce: 1,
          },
        ],
      });
      expect(response).toBe(MOCK_TX);
    });

    test.skip("eth_signTypedData_v1", async () => {
      const response = await provider?.request({
        method: "eth_signTypedData_v1",
        params: [[MOCK_TYPED_DATA], MOCK_ADDERESS],
      });
      expect(response).toBe("0x");
    });

    test("eth_signTypedData_v2", async () => {
      await expect(() =>
        provider?.request({
          method: "eth_signTypedData_v2",
          params: [],
        }),
      ).rejects.toThrowError(
        "The requested method is not supported by this Ethereum provider",
      );
    });

    test("eth_signTypedData_v3", async () => {
      const response = await provider?.request({
        method: "eth_signTypedData_v3",
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(response).toBe("0x");
    });

    test("eth_signTypedData_v4", async () => {
      const response = await provider?.request({
        method: "eth_signTypedData_v4",
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(response).toBe("0x");
    });

    test("eth_signTypedData", async () => {
      const response = await provider?.request({
        method: "eth_signTypedData",
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(response).toBe("0x");
    });

    test("wallet_addEthereumChain success", async () => {
      const response = await provider?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x0539",
            chainName: "Leet Chain",
            nativeCurrency: "LEET",
            rpcUrls: ["https://node.ethchain.com"],
            blockExplorerUrls: ["https://leetscan.com"],
            iconUrls: ["https://leetchain.com/icon.svg"],
          },
        ],
      });
      expect(response).toBeNull();
    });

    test("wallet_addEthereumChain missing RPC urls", async () => {
      const response = await provider?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            rpcUrls: [],
          },
        ],
      });
      expect(response).toBeUndefined();
    });

    test("wallet_addEthereumChain missing chainName", async () => {
      await expect(() => {
        return provider?.request({
          method: "wallet_addEthereumChain",
          params: [{}],
        });
      }).rejects.toThrowError(
        '"code" must be an integer such that: 1000 <= code <= 4999',
      );
    });

    test("wallet_addEthereumChain native currency", async () => {
      await expect(() => {
        return provider?.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x0539",
              chainName: "Leet Chain",
            },
          ],
        });
      }).rejects.toThrowError(
        '"code" must be an integer such that: 1000 <= code <= 4999',
      );
    });

    test("wallet_switchEthereumChain", async () => {
      const response = await provider?.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: "0x0539",
          },
        ],
      });
      expect(response).toBeNull();
    });

    test("wallet_switchEthereumChain w/ error code", async () => {
      const relay = new MockRelayClass();

      jest.spyOn(relay, "switchEthereumChain").mockReturnValue({
        cancel: () => {},
        promise: Promise.resolve({
          method: Web3Method.switchEthereumChain,
          errorCode: 4092,
        }),
      });
      const localProvider = setupCoinbaseWalletProvider({
        relayProvider: () => Promise.resolve(relay),
      });

      await expect(() => {
        return localProvider.request({
          method: "wallet_switchEthereumChain",
          params: [
            {
              chainId: "0x0539",
            },
          ],
        });
      }).rejects.toThrowError();
    });

    test("wallet_watchAsset", async () => {
      const response = await provider?.request({
        method: "wallet_watchAsset",
        params: [
          {
            type: "ERC20",
            options: {
              address: "0xAdD4e55",
            },
          },
        ],
      });
      expect(response).toBe(true);
    });

    test("wallet_watchAsset w/o valid asset type", async () => {
      await expect(() =>
        provider?.request({
          method: "wallet_watchAsset",
          params: [{}],
        }),
      ).rejects.toThrowError("Type is required");
    });

    test("wallet_watchAsset w/o valid asset type", async () => {
      await expect(() =>
        provider?.request({
          method: "wallet_watchAsset",
          params: [
            {
              type: "ERC721",
            },
          ],
        }),
      ).rejects.toThrowError("Asset of type 'ERC721' is not supported");
    });

    test("wallet_watchAsset", async () => {
      await expect(() =>
        provider?.request({
          method: "wallet_watchAsset",
          params: [
            {
              type: "ERC20",
            },
          ],
        }),
      ).rejects.toThrowError("Options are required");
    });

    test("wallet_watchAsset", async () => {
      await expect(() =>
        provider?.request({
          method: "wallet_watchAsset",
          params: [
            {
              type: "ERC20",
              options: {},
            },
          ],
        }),
      ).rejects.toThrowError("Address is required");
    });

    test("eth_newFilter", async () => {
      mockSuccessfulFetchResponse();
      const response = await provider?.request({
        method: "eth_newFilter",
        params: [
          {
            fromBlock: "0xa",
            toBlock: "0xc",
            address: MOCK_ADDERESS,
          },
        ],
      });
      expect(response).toBe("0x2");
    });

    test("eth_newBlockFilter", async () => {
      mockSuccessfulFetchResponse();
      const response = await provider?.request({
        method: "eth_newBlockFilter",
      });
      expect(response).toBe("0x2");
    });

    test("eth_newPendingTransactionFilter", async () => {
      mockSuccessfulFetchResponse();
      const response = await provider?.request({
        method: "eth_newPendingTransactionFilter",
      });
      expect(response).toBe("0x2");
    });

    test("eth_getFilterChanges", async () => {
      mockSuccessfulFetchResponse();
      await provider?.request({
        method: "eth_newFilter",
        params: [
          {
            fromBlock: "0xa",
            toBlock: "0xc",
            address: MOCK_ADDERESS,
          },
        ],
      });

      mockSuccessfulFetchResponse();
      const response = await provider?.request({
        method: "eth_getFilterChanges",
        params: ["0x2"],
      });

      expect(response).toEqual([]); // expect empty result
    });

    test("eth_getFilterLogs", async () => {
      mockSuccessfulFetchResponse();
      await provider?.request({
        method: "eth_newFilter",
        params: [
          {
            fromBlock: "0xa",
            toBlock: "0xc",
            address: MOCK_ADDERESS,
          },
        ],
      });

      mockSuccessfulFetchResponse();
      const response = await provider?.request({
        method: "eth_getFilterLogs",
        params: ["0x2"],
      });
      expect(response).toEqual("0x1");
    });
  });
});
