import {
  getErrorCode,
  serializeError,
  standardErrorCodes,
  standardErrorMessage,
  standardErrors,
} from "./errors";
import { JSONRPCRequest } from "./provider/JSONRPC";
import { Web3Method } from "./relay/Web3Method";
import { ErrorResponse, isErrorResponse } from "./relay/Web3Response";

describe("errors", () => {
  test("getErrorCode", () => {
    expect(getErrorCode(4137)).toEqual(4137);

    expect(getErrorCode({ code: 4137 })).toEqual(4137);
    expect(getErrorCode({ errorCode: 4137 })).toEqual(4137);
    expect(getErrorCode({ code: 4137, errorCode: 4137 })).toEqual(4137);

    expect(getErrorCode({ code: "4137" })).toEqual(undefined);
    expect(getErrorCode({ code: undefined })).toEqual(undefined);
    expect(getErrorCode({ errorCode: "4137" })).toEqual(undefined);
    expect(getErrorCode({ errorCode: undefined })).toEqual(undefined);

    expect(getErrorCode({})).toEqual(undefined);
    expect(getErrorCode("4137")).toEqual(undefined);
    expect(getErrorCode(new Error("generic error"))).toEqual(undefined);

    expect(getErrorCode(null)).toEqual(undefined);
    expect(getErrorCode(undefined)).toEqual(undefined);

    const errorResponse: ErrorResponse = {
      method: Web3Method.generic,
      errorMessage: "test error message",
      errorCode: 4137,
    };
    expect(isErrorResponse(errorResponse)).toEqual(true);
    expect(getErrorCode(errorResponse)).toEqual(4137);
  });

  test("standardErrorMessage", () => {
    expect(standardErrorMessage(undefined)).toEqual("Unknown error");

    // default error message
    expect(
      standardErrorMessage(standardErrorCodes.provider.userRejectedRequest),
    ).toEqual(expect.stringContaining("rejected"));

    // non-standard error code
    expect(standardErrorMessage(0)).toEqual(
      "Unspecified error message. This is a bug, please report it.",
    );
  });

  test("unsupportedChain error", () => {
    const errorWithoutChainID = standardErrors.provider.unsupportedChain();
    expect(errorWithoutChainID.code).toEqual(
      standardErrorCodes.provider.unsupportedChain,
    );
    expect(errorWithoutChainID.message).toEqual(
      expect.stringContaining("Unrecognized chain ID"),
    );

    const errorWithChainID = standardErrors.provider.unsupportedChain(1234);
    expect(errorWithChainID.code).toEqual(
      standardErrorCodes.provider.unsupportedChain,
    );
    expect(errorWithChainID.message).toEqual(
      expect.stringContaining("Unrecognized chain ID 1234"),
    );
  });
});

describe("serializeError", () => {
  test("with ErrorResponse object", () => {
    const errorResponse: ErrorResponse = {
      method: Web3Method.generic,
      errorMessage: "test ErrorResponse object",
      errorCode: standardErrorCodes.provider.unsupportedMethod,
    };

    const serialized = serializeError(errorResponse, "");
    expect(serialized.code).toEqual(
      standardErrorCodes.provider.unsupportedMethod,
    );
    expect(serialized.message).toEqual("test ErrorResponse object");
    expect(serialized.docUrl).toMatch(/.*version=\d+\.\d+\.\d+.*/);
    expect(serialized.docUrl).toContain(
      `code=${standardErrorCodes.provider.unsupportedMethod}`,
    );
  });

  test("with standardError", () => {
    const error = standardErrors.provider.userRejectedRequest({});

    const serialized = serializeError(error, "test_request");
    expect(serialized.code).toEqual(
      standardErrorCodes.provider.userRejectedRequest,
    );
    expect(serialized.message).toEqual(error.message);
    expect(serialized.stack).toEqual(expect.stringContaining("User rejected"));
    expect(serialized.docUrl).toMatch(/.*version=\d+\.\d+\.\d+.*/);
    expect(serialized.docUrl).toContain(
      `code=${standardErrorCodes.provider.userRejectedRequest}`,
    );
  });

  test("with Error object", () => {
    const error = new Error("test Error object");

    const serialized = serializeError(error, "test_request");
    expect(serialized.code).toEqual(standardErrorCodes.rpc.internal);
    expect(serialized.message).toEqual("test Error object");
    expect(serialized.stack).toEqual(
      expect.stringContaining("test Error object"),
    );
    expect(serialized.docUrl).toMatch(/.*version=\d+\.\d+\.\d+.*/);
    expect(serialized.docUrl).toContain(
      `code=${standardErrorCodes.rpc.internal}`,
    );
  });

  test("with string", () => {
    const error = "test error with just string";

    const serialized = serializeError(error, "test_request");
    expect(serialized.code).toEqual(standardErrorCodes.rpc.internal);
    expect(serialized.message).toEqual("test error with just string");
    expect(serialized.docUrl).toMatch(/.*version=\d+\.\d+\.\d+.*/);
    expect(serialized.docUrl).toContain(
      `code=${standardErrorCodes.rpc.internal}`,
    );
  });

  test("with unknown type", () => {
    const error = { unknown: "error" };
    const serialized = serializeError(error, "test_request");
    expect(serialized.code).toEqual(standardErrorCodes.rpc.internal);
    expect(serialized.message).toEqual("Internal JSON-RPC error.");
    expect(serialized.docUrl).toMatch(/.*version=\d+\.\d+\.\d+.*/);
    expect(serialized.docUrl).toContain(
      `code=${standardErrorCodes.rpc.internal}`,
    );
  });
});

describe("serializeError to retrieve the request method", () => {
  test("with JSONRPCRequest object", () => {
    const jsonRpcRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: Web3Method.requestEthereumAccounts,
      params: [],
    };

    const error = standardErrors.provider.userRejectedRequest({});

    const serialized = serializeError(error, jsonRpcRequest);
    expect(serialized.code).toEqual(
      standardErrorCodes.provider.userRejectedRequest,
    );
    expect(serialized.docUrl).toContain(
      `method=${Web3Method.requestEthereumAccounts}`,
    );
  });

  test("with string", () => {
    const method = "test_method";

    const error = standardErrors.provider.userRejectedRequest({});

    const serialized = serializeError(error, method);
    expect(serialized.code).toEqual(
      standardErrorCodes.provider.userRejectedRequest,
    );
    expect(serialized.docUrl).toContain(`method=${method}`);
  });

  test("with JSONRPCRequest array", () => {
    const jsonRpcRequests: JSONRPCRequest[] = [
      {
        jsonrpc: "2.0",
        id: 1,
        method: Web3Method.requestEthereumAccounts,
        params: [],
      },
      {
        jsonrpc: "2.0",
        id: 1,
        method: Web3Method.signEthereumMessage,
        params: [],
      },
    ];

    const error = standardErrors.provider.userRejectedRequest({});

    const serialized = serializeError(error, jsonRpcRequests);
    expect(serialized.code).toEqual(
      standardErrorCodes.provider.userRejectedRequest,
    );
    expect(serialized.docUrl).toContain(
      `method=${Web3Method.requestEthereumAccounts}`,
    );
  });
});
