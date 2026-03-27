import { Hex } from 'viem';

export type WebauthnSignatureType = {
  type: 'webauthn';
  data: {
    /**
     * The signature is the stringified JSON of the webauthn signature
     * @example
     * ```json
     * {
     *   "id": "string",
     *   "rawId": "string",
     *   "response": {
     *     "authenticatorData": "string",
     *     "clientDataJSON": "string",
     *     "signature": "string"
     *   },
     *   "type": "string"
     * }
     * ```
     */
    signature: string;
    publicKey: Hex;
  };
};

export type Secp256k1SignatureType = {
  type: 'secp256k1';
  data: {
    address: Hex;
    signature: Hex;
  };
};

export type SendPreparedCallsParams = [
  {
    version: string;
    type: string;
    data: unknown;
    chainId: Hex;
    signature: WebauthnSignatureType | Secp256k1SignatureType;
  },
];

export type SendPreparedCallsReturnValue = string[];

export type SendPreparedCallsSchema = {
  Method: 'wallet_sendPreparedCalls';
  Parameters: SendPreparedCallsParams;
  ReturnType: SendPreparedCallsReturnValue;
};
