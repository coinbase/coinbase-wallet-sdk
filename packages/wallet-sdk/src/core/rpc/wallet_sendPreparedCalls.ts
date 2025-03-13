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
    publicKey: `0x${string}`;
  };
};

export type Secp256k1SignatureType = {
  type: 'secp256k1';
  data: {
    address: `0x${string}`;
    signature: `0x${string}`;
  };
};

export type SendPreparedCallsParams = [
  {
    version: string;
    type: string;
    data: any;
    chainId: `0x${string}`;
    signature: WebauthnSignatureType | Secp256k1SignatureType;
  },
];

export type SendPreparedCallsReturnValue = string[];

export type SendPreparedCallsSchema = {
  Parameters: SendPreparedCallsParams;
  ReturnType: SendPreparedCallsReturnValue;
};
