import { Address, Hex } from 'viem';

export type WalletAddAddressCapabilities = {
  createAccount?: {
    signer: Hex;
  };
};

export type WalletAddAddressRequest = {
  method: 'wallet_addAddress';
  params: [
    {
      version: '1';
      chainId: number;
      address?: string;
      capabilities?: WalletAddAddressCapabilities;
    },
  ];
};

export type WalletAddAddressResponse = {
  address: Address;
  chainId: number;
  owners: Address[];
  root: Address;
  initCode: {
    factory: Address;
    factoryCalldata: Hex;
  };
};
