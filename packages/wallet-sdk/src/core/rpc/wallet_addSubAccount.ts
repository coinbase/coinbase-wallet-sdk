import { Address, Hex } from 'viem';

type AccountCreate = {
  type: 'create';
  keys: {
    type: 'address' | 'p256' | 'webcrypto-p256' | 'webauthn-p256';
    key: `0x${string}`;
  }[];
};

type AccountDeployed = {
  type: 'deployed';
  address: Address;
};

type AccountUndeployed = {
  type: 'undeployed';
  address?: Address;
  factory?: Address;
  factoryData?: Hex;
  chainId?: Hex;
};

export type AddSubAccountAccount = AccountDeployed | AccountCreate | AccountUndeployed;

export type WalletAddSubAccountRequest = {
  method: 'wallet_addSubAccount';
  params: [
    {
      version: '1';
      account: AddSubAccountAccount;
    },
  ];
};

export type WalletAddSubAccountResponse = {
  address: Address;
  chainId?: Hex;
  factory?: Address;
  factoryData?: Hex;
};
