import { Hex } from 'ox';
import { SignReturnType } from 'viem/accounts';
import type { SignReturnType as WebAuthnSignReturnType } from 'webauthn-p256';

export type SubAccountSigner = {
  type: 'webAuthn'; // TODO: add local support
  /**
   * Signs a raw payload
   * @param rawPayload - The raw payload to sign
   * @returns {Hex} Signed payload
   */
  getSigner: () => Promise<
    (rawPayload: Hex.Hex) => Promise<WebAuthnSignReturnType | SignReturnType>
  >;
  /**
   * Returns the current signer address. Should be a 20 byte EOA or 64 byte P256 public key
   * @returns Current Signer Address
   */
  getAddress: () => Promise<Hex.Hex>;
};

/**
 * RPC response for adding a sub account
 */
export type AddAddressResponse = {
  address: Hex.Hex;
  owners: Hex.Hex[];
  chainId: number;
  root: Hex.Hex;
  initCode: {
    factory: Hex.Hex;
    factoryCalldata: Hex.Hex;
  };
};
