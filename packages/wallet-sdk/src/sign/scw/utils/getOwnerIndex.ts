import { Client, Hex, decodeFunctionData, getAddress, isAddress, pad, padHex } from 'viem';
import { getCode, readContract } from 'viem/actions';

import { standardErrors } from ':core/error/errors.js';
import { abi, factoryAbi, factoryAddress } from './constants.js';

/**
 * Get the index of the owner
 * @param param0
 * @returns The index of the owner if it exists, otherwise undefined
 */
export async function getOwnerIndex({
  address,
  client,
  publicKey,
  factory,
  factoryData,
}: {
  /**
   * The address of the account to get the owner index for
   */
  address: `0x${string}`;
  /**
   * The client to use to get the code and read the contract
   */
  client: Client;
  /**
   * The public key of the owner
   */
  publicKey: Hex;
  /**
   * The address of the factory
   */
  factory?: `0x${string}`;
  /**
   * The data of the factory
   */
  factoryData?: Hex;
}): Promise<number | undefined> {
  const code = await getCode(client, {
    address,
  });

  // Check index of owner in the factoryData
  // Note: importing an undeployed contract might need to be handled differently
  // The implemention will likely require the signer to tell us the index
  if (!code && factory && factoryData) {
    if (getAddress(factory) !== getAddress(factoryAddress))
      throw standardErrors.rpc.internal('unknown factory address');

    const initData = decodeFunctionData({
      abi: factoryAbi,
      data: factoryData,
    });

    if (initData.functionName !== 'createAccount')
      throw standardErrors.rpc.internal('unknown factory function');

    const [owners] = initData.args;

    const ownerIndex = owners.findIndex(
      (owner: Hex) => owner.toLowerCase() === padHex(publicKey).toLowerCase()
    );

    if (ownerIndex === -1) {
      return undefined;
    }

    return ownerIndex;
  }

  const ownerCount = await readContract(client, {
    address,
    abi,
    functionName: 'ownerCount',
  });

  // Iterate from highest index down and return early when found
  for (let i = Number(ownerCount) - 1; i >= 0; i--) {
    const owner = await readContract(client, {
      address,
      abi,
      functionName: 'ownerAtIndex',
      args: [BigInt(i)],
    });

    const formatted = formatPublicKey(publicKey);
    if (owner.toLowerCase() === formatted.toLowerCase()) {
      return i;
    }
  }

  return undefined;
}

/**
 * Formats 20 byte addresses to 32 byte public keys. Contract uses 32 byte keys for owners.
 * @param publicKey - The public key to format
 * @returns The formatted public key
 */
export function formatPublicKey(publicKey: Hex): Hex {
  if (isAddress(publicKey)) {
    return pad(publicKey);
  }
  return publicKey;
}
