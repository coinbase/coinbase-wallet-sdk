import { Hex } from 'ox';
import { Address, hashMessage, hashTypedData, LocalAccount } from 'viem';
import { type WebAuthnAccount } from 'viem/account-abstraction';
import { type SignReturnType } from 'viem/accounts';
import type { SignReturnType as WebAuthnSignReturnType } from 'webauthn-p256';

export function toViemAccount({
  type,
  sign,
  address,
}: {
  type: 'webAuthn';
  sign: (payload: Hex.Hex) => Promise<WebAuthnSignReturnType | SignReturnType>;
  address: Address;
}): WebAuthnAccount | LocalAccount {
  if (type === 'webAuthn') {
    return {
      id: address,
      publicKey: address,
      async sign({ hash }) {
        const signature = await sign(hash);
        return signature as WebAuthnSignReturnType;
      },
      async signMessage({ message }) {
        const signature = await sign(hashMessage(message));
        return signature as WebAuthnSignReturnType;
      },
      async signTypedData(parameters) {
        const signature = await sign(hashTypedData(parameters));
        return signature as WebAuthnSignReturnType;
      },
      type,
    };
  }

  throw new Error('invalid account type');
}
