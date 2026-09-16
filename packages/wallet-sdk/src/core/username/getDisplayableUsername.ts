import { Address } from 'viem';

export async function getDisplayableUsername(address: Address): Promise<string> {
  return truncateAddress(address);
}

function truncateAddress(address: Address, length: number = 4): string {
  return `${address.slice(0, 2 + length)}...${address.slice(-length)}`;
}
