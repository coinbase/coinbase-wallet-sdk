import { standardErrors } from ':core/error/errors.js';
import { Address, Client, Hex, decodeFunctionData, getAddress, isAddress, pad } from 'viem';
import { getCode, readContract } from 'viem/actions';
import { abi, factoryAbi, factoryAddress } from './constants.js';

type FindOwnerIndexParams = {
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
};

export async function findOwnerIndex({
  address,
  client,
  publicKey,
  factory,
  factoryData,
}: FindOwnerIndexParams): Promise<number> {
  const code = await getCode(client, {
    address,
  });

  // Check index of owner in the factoryData
  // Note: importing an undeployed contract might need to be handled differently
  // The implemention will likely require the signer to tell us the index
  if (!code && factory && factoryData) {
    if (getAddress(factory) !== getAddress(factoryAddress)) {
      throw standardErrors.rpc.internal('unknown factory address');
    }

    const initData = decodeFunctionData({
      abi: factoryAbi,
      data: factoryData,
    });

    if (initData.functionName !== 'createAccount') {
      throw standardErrors.rpc.internal('unknown factory function');
    }

    const [owners] = initData.args;
    return owners.findIndex((owner: Hex | Address) => {
      return owner.toLowerCase() === formatPublicKey(publicKey).toLowerCase();
    });
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

  return -1;
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
