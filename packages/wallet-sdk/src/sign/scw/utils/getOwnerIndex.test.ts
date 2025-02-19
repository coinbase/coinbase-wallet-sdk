import { createPublicClient, http } from 'viem';
import { readContract } from 'viem/actions';
import { describe, expect, it, Mock, vi } from 'vitest';

import { getOwnerIndex } from './getOwnerIndex.js';
import { standardErrors } from ':core/error/errors.js';

const client = createPublicClient({
  transport: http('http://localhost:8545'),
});

vi.mock('viem/actions', () => ({
  readContract: vi.fn(),
}));

describe('getOwnerIndex', () => {
  it('returns correct index when owner found', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(BigInt(3)) // ownerCount
      .mockResolvedValueOnce('0x00000000000000000000000046440ECd6746f7612809eFED388347d476369f6D') // owner at index 2
      .mockResolvedValueOnce('0x000000000000000000000000d9Ec1a8603125732c1ee35147619BbFA769A062b') // owner at index 1
      .mockResolvedValueOnce('0x0000000000000000000000007838d2724FC686813CAf81d4429beff1110c739a'); // owner at index 0

    (readContract as Mock).mockImplementation(mockReadContract);

    const result = await getOwnerIndex({
      address: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
      client,
      publicKey: '0x7838d2724FC686813CAf81d4429beff1110c739a',
    });

    expect(result).toBe(0);
    expect(mockReadContract).toHaveBeenCalledTimes(4);
  });

  it('only calls readContract as needed', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(BigInt(3)) // ownerCount
      .mockResolvedValueOnce('0x00000000000000000000000046440ECd6746f7612809eFED388347d476369f6D') // owner at index 2
      .mockResolvedValueOnce('0x000000000000000000000000d9Ec1a8603125732c1ee35147619BbFA769A062b') // owner at index 1
      .mockResolvedValueOnce('0x0000000000000000000000007838d2724FC686813CAf81d4429beff1110c739a'); // owner at index 0

    (readContract as Mock).mockImplementation(mockReadContract);

    const result = await getOwnerIndex({
      address: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
      client,
      publicKey: '0x46440ECd6746f7612809eFED388347d476369f6D',
    });

    expect(result).toBe(2);
    expect(mockReadContract).toHaveBeenCalledTimes(2);
  });

  it('handles 64 byte public keys', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(BigInt(2)) // ownerCount
      .mockResolvedValueOnce(
        '0xe7575170745fe55d7a26190c6d5504743496c49498b129d2b3660da3697e81d4daebb2496f89aa4a05f1705e1d5d316153211c198f80d3100b51489bf4963f47'
      ) // owner at index 1
      .mockResolvedValueOnce('0x0000000000000000000000007838d2724FC686813CAf81d4429beff1110c739a'); // owner at index 0

    (readContract as Mock).mockImplementation(mockReadContract);

    const result = await getOwnerIndex({
      address: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
      client,
      publicKey:
        '0xe7575170745fe55d7a26190c6d5504743496c49498b129d2b3660da3697e81d4daebb2496f89aa4a05f1705e1d5d316153211c198f80d3100b51489bf4963f47',
    });

    expect(result).toBe(1);
    expect(mockReadContract).toHaveBeenCalledTimes(2);
  });

  it('is case insensitive when matching owners', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(BigInt(2)) // ownerCount
      .mockResolvedValueOnce('0xAAA') // owner at index 1
      .mockResolvedValueOnce('0xBBB'); // owner at index 0

    (readContract as Mock).mockImplementation(mockReadContract);

    const result = await getOwnerIndex({
      address: '0xabc',
      client,
      publicKey: '0xaaa',
    });

    expect(result).toBe(1);
  });

  it('throws error when owner not found', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(BigInt(2)) // ownerCount
      .mockResolvedValueOnce('0xaaa') // owner at index 1
      .mockResolvedValueOnce('0xbbb'); // owner at index 0

    (readContract as Mock).mockImplementation(mockReadContract);

    await expect(
      getOwnerIndex({
        address: '0xabc',
        client,
        publicKey: '0xccc',
      })
    ).rejects.toThrow(standardErrors.rpc.internal('account owner not found'));
  });

  it('handles empty owner list', async () => {
    const mockReadContract = vi.fn().mockResolvedValueOnce(BigInt(0)); // ownerCount

    (readContract as Mock).mockImplementation(mockReadContract);

    await expect(
      getOwnerIndex({
        address: '0xabc',
        client,
        publicKey: '0xccc',
      })
    ).rejects.toThrow(standardErrors.rpc.internal('account owner not found'));
  });
});
