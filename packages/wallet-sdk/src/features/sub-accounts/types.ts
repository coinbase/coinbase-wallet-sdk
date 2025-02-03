import { Hex } from 'viem';

/**
 * RPC response for adding a sub account
 */
export type AddAddressResponse = {
  address: Hex;
  owners: Hex[];
  chainId: number;
  root: Hex;
  initCode: {
    factory: Hex;
    factoryCalldata: Hex;
  };
};
