import type { Caip2 } from '../../storage/schema.js';

/** CAIP-27 `wallet_invokeMethod` request. */
export type WalletInvokeMethodRequest = {
  method: 'wallet_invokeMethod';
  params: Caip27Params;
};

/**
 * CAIP-27 `wallet_invokeMethod` result: the invoked method's result or its error, tagged with
 * the chain it ran on. Session and transport errors replace the whole JSON-RPC result
 * instead, so they never appear here.
 */
export type WalletInvokeMethodResult =
  | {
      chainId: Caip2;
      result: { method: string; result: unknown };
    }
  | {
      chainId: Caip2;
      error: Caip27Error;
    };

/**
 * Nested JSON-RPC body inside CAIP-27 `wallet_invokeMethod` params.
 * Spec: `params` is required and may be empty.
 */
export type Caip27Request = {
  method: string;
  params: readonly unknown[] | object;
};

/**
 * CAIP-27 `wallet_invokeMethod` params (`chainId` + `request`).
 *
 * No `sessionId`: the wallet identifies the session by the pairing that sent the request.
 */
export type Caip27Params = {
  chainId: Caip2;
  request: Caip27Request;
  capabilities?: Record<string, unknown>;
};

export type Caip27Error = {
  code: number;
  message: string;
  data?: unknown;
};
