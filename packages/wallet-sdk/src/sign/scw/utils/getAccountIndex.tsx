import { Client, Hex } from 'viem';
import { readContract } from 'viem/actions';

import { abi } from './constants.js';
import { standardErrors } from ':core/error/errors.js';

export async function getAccountIndex({
  address,
  client,
  publicKey,
}: {
  address: `0x${string}`;
  client: Client;
  publicKey: Hex;
}): Promise<number> {
  const ownerCount = await readContract(client, {
    address,
    abi,
    functionName: 'ownerCount',
  });

  // map over owner count and get each owner at each index
  const owners = await Promise.all(
    Array.from({ length: Number(ownerCount) }, async (_, index) => {
      return readContract(client, {
        address,
        abi,
        functionName: 'ownerAtIndex',
        args: [BigInt(index)],
      });
    })
  );

  // find the owner that matches the public key
  const index = owners.findIndex((owner) => owner.toLowerCase() === publicKey.toLowerCase());
  if (index === -1) {
    throw standardErrors.rpc.internal('account owner not found');
  }

  return index;
}
