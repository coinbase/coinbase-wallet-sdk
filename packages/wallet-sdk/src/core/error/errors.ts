import { standardErrorCodes } from './constants.js';
import { getMessageFromCode } from './utils.js';

export const standardErrors = {
  rpc: {
    parse: <T>(arg?: EthErrorsArg<T>) => getEthJsonRpcError(standardErrorCodes.rpc.parse, arg),

    invalidRequest: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.invalidRequest, arg),

    invalidParams: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.invalidParams, arg),

    methodNotFound: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.methodNotFound, arg),

    internal: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.internal, arg),

    server: <T>(opts: ServerErrorOptions<T>) => {
      if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
        throw new Error('Ethereum RPC Server errors must provide single object argument.');
      }
      const { code } = opts;
      if (!Number.isInteger(code) || code > -32005 || code < -32099) {
        throw new Error('"code" must be an integer such that: -32099 <= code <= -32005');
      }
      return getEthJsonRpcError(code, opts);
    },

    invalidInput: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.invalidInput, arg),

    resourceNotFound: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.resourceNotFound, arg),

    resourceUnavailable: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.resourceUnavailable, arg),

    transactionRejected: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.transactionRejected, arg),

    methodNotSupported: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.methodNotSupported, arg),

    limitExceeded: <T>(arg?: EthErrorsArg<T>) =>
      getEthJsonRpcError(standardErrorCodes.rpc.limitExceeded, arg),
  },

  provider: {
    userRejectedRequest: <T>(arg?: EthErrorsArg<T>) => {
      return getEthProviderError(standardErrorCodes.provider.userRejectedRequest, arg);
    },

    unauthorized: <T>(arg?: EthErrorsArg<T>) => {
      return getEthProviderError(standardErrorCodes.provider.unauthorized, arg);
    },

    unsupportedMethod: <T>(arg?: EthErrorsArg<T>) => {
      return getEthProviderError(standardErrorCodes.provider.unsupportedMethod, arg);
    },

    disconnected: <T>(arg?: EthErrorsArg<T>) => {
      return getEthProviderError(standardErrorCodes.provider.disconnected, arg);
    },

    chainDisconnected: <T>(arg?: EthErrorsArg<T>) => {
      return getEthProviderError(standardErrorCodes.provider.chainDisconnected, arg);
    },

    unsupportedChain: <T>(arg?: EthErrorsArg<T>) => {
      return getEthProviderError(standardErrorCodes.provider.unsupportedChain, arg);
    },

    custom: <T>(opts: CustomErrorArg<T>) => {
      if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
        throw new Error('Ethereum Provider custom errors must provide single object argument.');
      }

      const { code, message, data } = opts;

      if (!message || typeof message !== 'string') {
        throw new Error('"message" must be a nonempty string');
      }
      return new EthereumProviderError(code, message, data);
    },
  },
};

// Internal

function getEthJsonRpcError<T>(code: number, arg?: EthErrorsArg<T>): EthereumRpcError<T> {
  const [message, data] = parseOpts(arg);
  return new EthereumRpcError(code, message || getMessageFromCode(code), data);
}

function getEthProviderError<T>(code: number, arg?: EthErrorsArg<T>): EthereumProviderError<T> {
  const [message, data] = parseOpts(arg);
  return new EthereumProviderError(code, message || getMessageFromCode(code), data);
}

function parseOpts<T>(arg?: EthErrorsArg<T>): [string?, T?] {
  if (arg) {
    if (typeof arg === 'string') {
      return [arg];
    } else if (typeof arg === 'object' && !Array.isArray(arg)) {
      const { message, data } = arg;

      if (message && typeof message !== 'string') {
        throw new Error('Must specify string message.');
      }
      return [message || undefined, data];
    }
  }
  return [];
}

interface EthereumErrorOptions<T> {
  message?: string;
  data?: T;
}

interface ServerErrorOptions<T> extends EthereumErrorOptions<T> {
  code: number;
}

type CustomErrorArg<T> = ServerErrorOptions<T>;

type EthErrorsArg<T> = EthereumErrorOptions<T> | string;

class EthereumRpcError<T> extends Error {
  code: number;

  data?: T;

  constructor(code: number, message: string, data?: T) {
    if (!Number.isInteger(code)) {
      throw new Error('"code" must be an integer.');
    }
    if (!message || typeof message !== 'string') {
      throw new Error('"message" must be a nonempty string.');
    }

    super(message);
    this.code = code;
    if (data !== undefined) {
      this.data = data;
    }
  }
}

class EthereumProviderError<T> extends EthereumRpcError<T> {
  /**
   * Create an Ethereum Provider JSON-RPC error.
   * `code` must be an integer in the 1000 <= 4999 range.
   */
  constructor(code: number, message: string, data?: T) {
    if (!isValidEthProviderCode(code)) {
      throw new Error('"code" must be an integer such that: 1000 <= code <= 4999');
    }

    super(code, message, data);
  }
}

function isValidEthProviderCode(code: number): boolean {
  return Number.isInteger(code) && code >= 1000 && code <= 4999;
}
