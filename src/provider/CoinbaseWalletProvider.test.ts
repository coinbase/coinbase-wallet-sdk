import { MOCK_ADDERESS, MockRelayClass } from "../__mocks__/relay";
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage";
import { LOCAL_STORAGE_ADDRESSES_KEY } from "../relay/WalletSDKRelayAbstract";
import { WalletSDKRelayEventManager } from "../relay/WalletSDKRelayEventManager";
import { Web3Method } from "../relay/Web3Method";
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
    provider.setProviderInfo(url);
    expect(provider.host).toBe(url);
  });

  it("handles setting the app info", () => {
    const provider = setupCoinbaseWalletProvider();
    provider.setAppInfo("Test Dapp", null);
    expect(provider.host).toBe("http://test.ethnode.com");
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
    const spy = jest.spyOn(MockRelayClass.prototype, 'resetAndReload');
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

    expect(mockCallback).toHaveBeenCalledWith(null,
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
    expect(mockCallback).toHaveBeenCalledWith(null,
      expect.objectContaining({
        result: [MOCK_ADDERESS.toLowerCase()],
      }),
    );
  });

  it("handles generic requests successfully", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "genericRequest").mockReturnValue({
      cancel: () => { },
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

  it("handles error responses with generic requests", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "genericRequest").mockReturnValue({
      cancel: () => { },
      // @ts-expect-error result should be a string
      promise: Promise.resolve({
        method: Web3Method.generic,
        result: { foo: 'bar' },
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

    await expect(() => provider.genericRequest(data, action)).rejects.toThrowError("result was not a string");
  });

  it("handles user rejecting enable call", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "requestEthereumAccounts").mockReturnValue({
      cancel: () => { },
      promise: Promise.reject(new Error("rejected")),
    });
    const provider = setupCoinbaseWalletProvider({
      storage: new ScopedLocalStorage("reject-info"),
      relayProvider: async () => {
        return Promise.resolve(relay);
      },
    });

    await expect(() => provider.enable()).rejects.toThrowError("User denied account authorization");
  });

  it("handles user rejecting enable call with unknown error", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "requestEthereumAccounts").mockReturnValue({
      cancel: () => { },
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
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()])

    // Set the account on the first request
    const response2 = await provider.request<string[]>({
      method: "eth_requestAccounts",
    });
    expect(response2[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("gets the users address from storage on init", async () => {
    const localStorage = new ScopedLocalStorage('test')
    localStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS.toLowerCase())
    const provider = setupCoinbaseWalletProvider({
      storage: localStorage
    });

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()])

    // Set the account on the first request
    const response = await provider.request<string[]>({
      method: "eth_requestAccounts",
    });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("handles scanning QR code with bad response", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "scanQRCode").mockReturnValue({
      cancel: () => { },
      // @ts-expect-error result should be a string
      promise: Promise.resolve({
        method: Web3Method.scanQRCode,
        result: { foo: 'bar' },
      }),
    });
    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => Promise.resolve(relay),
    });

    await expect(() => provider.scanQRCode(new RegExp('cbwallet://cool'))).rejects.toThrowError("result was not a string");
  });

  it("handles scanning QR code", async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, "scanQRCode").mockReturnValue({
      cancel: () => { },
      promise: Promise.resolve({
        method: Web3Method.scanQRCode,
        result: "cbwallet://result",
      }),
    });
    const provider = setupCoinbaseWalletProvider({
      relayProvider: async () => Promise.resolve(relay),
    });
    const result = await provider.scanQRCode(new RegExp('cbwallet://cool'))
    expect(result).toBe("cbwallet://result");
  });
});
