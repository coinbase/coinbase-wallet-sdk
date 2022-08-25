import { PublicKey, Transaction } from "@solana/web3.js";

import { ScopedLocalStorage } from "../lib/ScopedLocalStorage";
import { SolanaWeb3Method } from "../relay/solana/SolanaWeb3Method";
import { SolanaWeb3Response } from "../relay/solana/SolanaWeb3Response";
import { randomBytesHex } from "../util";
import { SOLANA_PROVIDER_ID, SolanaProvider } from "./SolanaProvider";

jest.mock("../util");

const mockAddress = "26vuBULhY7LbToM91actoETkSLZGsupiwDT7X3hEdwkP";
const mockSolanaPublicKey = new PublicKey(mockAddress);
const mockSolanaUnsignedTransaction = new Transaction();
const mockSolanaSignedTransaction = new Transaction();

const mockTransactionBuffer = Buffer.from([1]);

const scopedStorageCopy = new ScopedLocalStorage("coinbaseSolana");

jest
  .spyOn(mockSolanaSignedTransaction, "signature", "get")
  .mockReturnValue(Buffer.from([1, 2, 3]));

jest.spyOn(Transaction, "from").mockReturnValue(mockSolanaSignedTransaction);

jest
  .spyOn(Transaction.prototype, "serialize")
  .mockReturnValue(mockTransactionBuffer);

describe("Solana Provider", () => {
  const eventId = "testUUID";
  let solanaProvider: SolanaProvider;
  let requestMessage: any;
  let responseMessage: any;

  const firstConnectMessage = {
    type: "solanaProviderRequest",
    data: {
      action: "firstConnectRequest",
    },
  };

  beforeEach(() => {
    solanaProvider = new SolanaProvider();
    jest.spyOn(window, "postMessage");
    (randomBytesHex as jest.Mock).mockReturnValue(eventId);

    requestMessage = {
      type: "extensionUIRequest",
      provider: SOLANA_PROVIDER_ID,
      data: {
        id: eventId,
        dappInfo: {
          dappLogoURL: "",
        },
        request: {},
      },
    };

    responseMessage = {
      data: {
        type: "extensionUIResponse",
        data: { id: eventId },
      },
    };
  });

  afterEach(() => {
    scopedStorageCopy.clear();
    // @ts-expect-error need this to be null for most tests
    window.__CIPHER_BRIDGE__ = null;
  });

  it("should post request and handle response for connect", async () => {
    jest.spyOn(window, "postMessage");
    jest.spyOn(solanaProvider, "disconnect");
    requestMessage.data.action = SolanaWeb3Method.connect;
    requestMessage.data.request = {
      method: SolanaWeb3Method.connect,
    };
    responseMessage.data.data.action = SolanaWeb3Response.connectionSuccess;
    responseMessage.data.data.addresses = [mockAddress];

    const connectionPromise = solanaProvider.connect();

    expect(window.postMessage).toHaveBeenCalledWith(firstConnectMessage, "*");
    expect(window.postMessage).toHaveBeenCalledWith(requestMessage, "*");
    expect(scopedStorageCopy.getItem("Addresses")).toBe(null);

    solanaProvider.handleResponse(responseMessage);

    await expect(connectionPromise).resolves.toBeUndefined();

    expect(solanaProvider.isConnected).toBe(true);
    expect(solanaProvider.publicKey).toEqual(mockSolanaPublicKey);

    expect(scopedStorageCopy.getItem("Addresses")).toEqual(
      JSON.stringify([mockAddress]),
    );
  });

  it("should resolve to error when connectionSuccess returns invalid address", async () => {
    jest.spyOn(solanaProvider, "disconnect");

    requestMessage.data.action = SolanaWeb3Method.connect;
    requestMessage.data.request = {
      method: SolanaWeb3Method.connect,
    };
    responseMessage.data.data.action = SolanaWeb3Response.connectionSuccess;
    responseMessage.data.data.addresses = ["123"];

    const connectionPromise = solanaProvider.connect();

    solanaProvider.handleResponse(responseMessage);

    await expect(connectionPromise).rejects.toEqual({
      message: "Connection error",
      method: "connect",
    });

    expect(solanaProvider.isConnected).toBe(false);
    expect(solanaProvider.publicKey).toBeFalsy();
  });

  it("should handle parentDisconnected event", () => {
    jest.spyOn(solanaProvider, "disconnect");
    jest.spyOn(solanaProvider, "emit");

    responseMessage.data.data.action = SolanaWeb3Response.parentDisconnected;

    solanaProvider.handleResponse(responseMessage);

    expect(scopedStorageCopy.getItem("Addresses")).toEqual(null);
    expect(solanaProvider.isConnected).toBe(false);
    expect(solanaProvider.publicKey).toBeFalsy();
  });

  it("should send messages over injected bridge if it is present", async () => {
    const mockedCipherBridge = jest.fn();

    window.__CIPHER_BRIDGE__ = {
      postMessage: mockedCipherBridge,
    };

    const cipherRequestMessage = {
      id: eventId,
      type: "browserRequest",
      request: {
        method: SolanaWeb3Method.connect,
      },
      provider: SOLANA_PROVIDER_ID,
    };

    responseMessage.data.type = "WEB3_RESPONSE";
    responseMessage.data.data.action = SolanaWeb3Response.connectionSuccess;
    responseMessage.data.data.addresses = [mockAddress];

    const connectionPromise = solanaProvider.connect();

    solanaProvider.handleResponse(responseMessage);

    await expect(connectionPromise).resolves.toBeUndefined();

    // cipher bridge requests are stringified, we need to
    // parse the passed argument to compare that it's correct
    const cipherBridgeCallArgs = JSON.parse(
      mockedCipherBridge.mock.calls[0][0],
    );

    expect(cipherBridgeCallArgs).toEqual(cipherRequestMessage);
    expect(mockedCipherBridge).toHaveBeenCalled();
  });

  describe("Testing web3 methods after connect wallet", () => {
    beforeEach(() => {
      solanaProvider = new SolanaProvider();
      solanaProvider.publicKey = mockSolanaPublicKey;
      solanaProvider.isConnected = true;
    });

    it("Should set pubkey when connection response success", () => {
      expect(solanaProvider.publicKey).toBeTruthy();
      expect(solanaProvider.publicKey).toEqual(mockSolanaPublicKey);
    });
    it("should post and handle response for sign message", async () => {
      const message = new Uint8Array(Buffer.from("a message to sign."));
      const signedMessageUint8Array = new Uint8Array(Buffer.from("signature"));
      const signedMessageResponse = [...signedMessageUint8Array];

      requestMessage.data.action = SolanaWeb3Method.signMessage;
      requestMessage.data.request = {
        method: SolanaWeb3Method.signMessage,
        params: {
          address: mockAddress,
          message: "a message to sign.",
        },
      };

      responseMessage.data.data.action = SolanaWeb3Response.signMessageSuccess;
      responseMessage.data.data.signature = signedMessageResponse;

      const signMessagePromise = solanaProvider.signMessage(message);

      expect(window.postMessage).toHaveBeenCalledWith(requestMessage, "*");

      solanaProvider.handleResponse(responseMessage);

      await expect(signMessagePromise).resolves.toEqual({
        signature: signedMessageUint8Array,
      });
    });

    it("should reject with error message if signMessage response is invalid", async () => {
      const message = new Uint8Array(Buffer.from("message"));
      const invalidSignedMessageResponse = "someSignatureString";

      requestMessage.data.action = SolanaWeb3Method.signMessage;
      requestMessage.data.request = {
        method: SolanaWeb3Method.signMessage,
        params: {
          address: mockAddress,
          message: "a message to sign.",
        },
      };

      responseMessage.data.data.action = SolanaWeb3Response.signMessageSuccess;
      responseMessage.data.data.signature = invalidSignedMessageResponse;

      const signMessagePromise = solanaProvider.signMessage(message);

      solanaProvider.handleResponse(responseMessage);

      return expect(signMessagePromise).rejects.toEqual(
        new Error("Invalid signature"),
      );
    });
    it("should post and handle response for sign transaction", async () => {
      requestMessage.data.action = SolanaWeb3Method.signTransaction;

      requestMessage.data.request = {
        method: SolanaWeb3Method.signTransaction,
        params: {
          transactions: [[...mockTransactionBuffer]],
        },
      };

      responseMessage.data.data.action =
        SolanaWeb3Response.signTransactionSuccess;
      responseMessage.data.data.signedTransactionData = [
        ...mockTransactionBuffer,
      ];

      const signTransactionPromise = solanaProvider.signTransaction(
        mockSolanaUnsignedTransaction,
      );

      solanaProvider.handleResponse(responseMessage);

      expect(window.postMessage).toHaveBeenCalledWith(requestMessage, "*");
      expect(solanaProvider.getCallback(eventId)).toBeFalsy();
      return expect(signTransactionPromise).resolves.toBe(
        mockSolanaSignedTransaction,
      );
    });

    it("should reject with error message if signTransaction response is invalid", async () => {
      responseMessage.data.data.action =
        SolanaWeb3Response.signTransactionSuccess;
      responseMessage.data.data.signedTransactionData = {
        ...mockTransactionBuffer,
      };

      const signTransactionPromise = solanaProvider.signTransaction(
        mockSolanaUnsignedTransaction,
      );
      solanaProvider.handleResponse(responseMessage);

      return expect(signTransactionPromise).rejects.toEqual(
        new Error("Invalid transaction data"),
      );
    });

    it("should reject with error message if signTransaction response is not signed", async () => {
      jest.spyOn(Transaction, "from").mockImplementationOnce(() => {
        return mockSolanaUnsignedTransaction;
      });

      responseMessage.data.data.action =
        SolanaWeb3Response.signTransactionSuccess;
      responseMessage.data.data.signedTransactionData = [
        ...mockTransactionBuffer,
      ];

      const signTransactionPromise = solanaProvider.signTransaction(
        mockSolanaUnsignedTransaction,
      );

      solanaProvider.handleResponse(responseMessage);

      return expect(signTransactionPromise).rejects.toEqual({
        method: "signTransaction",
        message: "Could not sign transaction",
      });
    });

    it("should reject with error message if signTransaction cannot deserialize transaction response", async () => {
      jest.spyOn(Transaction, "from").mockImplementationOnce(() => {
        throw new Error("Could not build native transaction");
      });

      responseMessage.data.data.action =
        SolanaWeb3Response.signTransactionSuccess;
      responseMessage.data.data.signedTransactionData = [
        ...mockTransactionBuffer,
      ];

      const signTransactionPromise = solanaProvider.signTransaction(
        mockSolanaUnsignedTransaction,
      );
      solanaProvider.handleResponse(responseMessage);

      return expect(signTransactionPromise).rejects.toEqual(
        new Error("Could not build native transaction"),
      );
    });
    it("should post and handle response  for sign multiple transactions", async () => {
      const solUnsignedTransactions = [
        mockSolanaUnsignedTransaction,
        mockSolanaUnsignedTransaction,
      ];
      const solSignedTransactions = [
        mockSolanaSignedTransaction,
        mockSolanaSignedTransaction,
      ];
      const mockedTransactionBufferArrays = [
        [...mockTransactionBuffer],
        [...mockTransactionBuffer],
      ];

      requestMessage.data.action = SolanaWeb3Method.signAllTransactions;
      requestMessage.data.request = {
        method: SolanaWeb3Method.signAllTransactions,
        params: {
          transactions: mockedTransactionBufferArrays,
        },
      };

      responseMessage.data.data.action =
        SolanaWeb3Response.signAllTransactionsSuccess;
      responseMessage.data.data.signedTransactionData =
        mockedTransactionBufferArrays;

      const signAllTransactionsPromise = solanaProvider.signAllTransactions(
        solUnsignedTransactions,
      );

      solanaProvider.handleResponse(responseMessage);

      expect(window.postMessage).toHaveBeenCalledWith(requestMessage, "*");
      expect(solanaProvider.getCallback(eventId)).toBeFalsy();
      return expect(signAllTransactionsPromise).resolves.toEqual(
        solSignedTransactions,
      );
    });

    it("should reject with error message if signAllTransactions response is invalid", async () => {
      const solUnsignedTransactions = [
        mockSolanaUnsignedTransaction,
        mockSolanaUnsignedTransaction,
      ];
      const mockedTransactionBufferArrays = [
        [...mockTransactionBuffer],
        [...mockTransactionBuffer],
      ];

      requestMessage.data.request = {
        method: SolanaWeb3Method.signAllTransactions,
        params: {
          transactions: mockedTransactionBufferArrays,
        },
      };

      responseMessage.data.data.action =
        SolanaWeb3Response.signAllTransactionsSuccess;
      responseMessage.data.data.signedTransactionData = {
        mockedTransactionBufferArrays,
      };

      const signAllTransactionsPromise = solanaProvider.signAllTransactions(
        solUnsignedTransactions,
      );
      solanaProvider.handleResponse(responseMessage);

      return expect(signAllTransactionsPromise).rejects.toEqual(
        new Error("Invalid transaction data"),
      );
    });

    it("should reject with error message if signAllTransaction transactions are not signed", async () => {
      jest.spyOn(Transaction, "from").mockImplementationOnce(() => {
        return mockSolanaUnsignedTransaction;
      });
      const solUnsignedTransactions = [
        mockSolanaUnsignedTransaction,
        mockSolanaUnsignedTransaction,
      ];
      const mockedTransactionBufferArrays = [
        [...mockTransactionBuffer],
        [...mockTransactionBuffer],
      ];

      responseMessage.data.data.action =
        SolanaWeb3Response.signTransactionSuccess;
      responseMessage.data.data.signedTransactionData =
        mockedTransactionBufferArrays;

      const signTransactionPromise = solanaProvider.signAllTransactions(
        solUnsignedTransactions,
      );
      solanaProvider.handleResponse(responseMessage);

      return expect(signTransactionPromise).rejects.toEqual({
        method: "signAllTransactions",
        message: "Could not sign transactions",
      });
    });

    it("should reject with error message if signAllTransactions cannot deserialize transaction response", async () => {
      jest.spyOn(Transaction, "from").mockImplementationOnce(() => {
        throw new Error("Could not build native transaction");
      });

      const solUnsignedTransactions = [
        mockSolanaUnsignedTransaction,
        mockSolanaUnsignedTransaction,
      ];
      const mockedTransactionBufferArrays = [
        [...mockTransactionBuffer],
        [...mockTransactionBuffer],
      ];

      responseMessage.data.data.action =
        SolanaWeb3Response.signAllTransactionsSuccess;
      responseMessage.data.data.signedTransactionData =
        mockedTransactionBufferArrays;

      const signAllTransactionsPromise = solanaProvider.signAllTransactions(
        solUnsignedTransactions,
      );
      solanaProvider.handleResponse(responseMessage);

      return expect(signAllTransactionsPromise).rejects.toEqual(
        new Error("Could not build native transaction"),
      );
    });
    it("should post and handle response for send transaction", async () => {
      const mockTxHash = "txhash";
      const mockOptions = {
        skipPreflight: false,
      };
      const mockedTransactionBufferArrays = [[...mockTransactionBuffer]];

      requestMessage.data.action = SolanaWeb3Method.sendTransaction;
      requestMessage.data.request = {
        method: SolanaWeb3Method.sendTransaction,
        params: {
          transactions: mockedTransactionBufferArrays,
          options: mockOptions,
        },
      };

      responseMessage.data.data.action =
        SolanaWeb3Response.sendTransactionSuccess;
      responseMessage.data.data.txHash = mockTxHash;

      const sendTransactionPromise = solanaProvider.sendTransaction(
        mockSolanaUnsignedTransaction,
        null,
        mockOptions,
      );

      solanaProvider.handleResponse(responseMessage);

      expect(window.postMessage).toHaveBeenCalledWith(requestMessage, "*");
      expect(solanaProvider.getCallback(eventId)).toBeFalsy();
      return expect(sendTransactionPromise).resolves.toEqual({
        signature: mockTxHash,
      });
    });
  });
  describe("Error out on all web3 methods when wallet is not connected", () => {
    it("should throw connection error if connect is not called first", async () => {
      await expect(
        solanaProvider.signMessage(new Uint8Array(Buffer.from("message"))),
      ).rejects.toEqual({
        method: "signMessage",
        message: "Wallet is not connected",
      });

      await expect(
        solanaProvider.signTransaction(mockSolanaUnsignedTransaction),
      ).rejects.toEqual({
        method: "signTransaction",
        message: "Wallet is not connected",
      });

      await expect(
        solanaProvider.signAllTransactions([mockSolanaUnsignedTransaction]),
      ).rejects.toEqual({
        method: "signAllTransactions",
        message: "Wallet is not connected",
      });

      await expect(
        solanaProvider.signAndSendTransaction(mockSolanaUnsignedTransaction),
      ).rejects.toEqual({
        method: "sendTransaction",
        message: "Wallet is not connected",
      });
    });
  });
});
