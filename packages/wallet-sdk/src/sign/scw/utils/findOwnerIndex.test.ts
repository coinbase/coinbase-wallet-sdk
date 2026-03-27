import { standardErrors } from ':core/error/errors.js';
import { createPublicClient, http } from 'viem';
import { readContract } from 'viem/actions';
import { Mock, describe, expect, it, vi } from 'vitest';
import { findOwnerIndex } from './findOwnerIndex.js';

const client = createPublicClient({
  transport: http('http://localhost:8545'),
});

vi.mock('viem/actions', () => ({
  readContract: vi.fn(),
  getCode: vi.fn(),
}));

describe('findOwnerIndex', () => {
  it('returns correct index when owner found', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(BigInt(3)) // ownerCount
      .mockResolvedValueOnce('0x00000000000000000000000046440ECd6746f7612809eFED388347d476369f6D') // owner at index 2
      .mockResolvedValueOnce('0x000000000000000000000000d9Ec1a8603125732c1ee35147619BbFA769A062b') // owner at index 1
      .mockResolvedValueOnce('0x0000000000000000000000007838d2724FC686813CAf81d4429beff1110c739a'); // owner at index 0

    (readContract as Mock).mockImplementation(mockReadContract);

    const result = await findOwnerIndex({
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

    const result = await findOwnerIndex({
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

    const result = await findOwnerIndex({
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

    const result = await findOwnerIndex({
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

    const result = await findOwnerIndex({
      address: '0xabc',
      client,
      publicKey: '0xccc',
    });
    expect(result).toBe(-1);
  });

  it('handles empty owner list', async () => {
    const mockReadContract = vi.fn().mockResolvedValueOnce(BigInt(0)); // ownerCount

    (readContract as Mock).mockImplementation(mockReadContract);

    const result = await findOwnerIndex({
      address: '0xabc',
      client,
      publicKey: '0xccc',
    });
    expect(result).toBe(-1);
  });

  it('finds owner index from factory data when contract not deployed', async () => {
    const mockGetCode = vi.fn().mockResolvedValueOnce(null);
    const mockReadContract = vi.fn();

    (readContract as Mock).mockImplementation(mockReadContract);
    vi.spyOn(client, 'getCode').mockImplementation(mockGetCode);

    const result = await findOwnerIndex({
      address: '0x6e63A8b852Ffde0eD53956Ab7D178DEd348ec7D8',
      client,
      publicKey:
        '0x5f1d235545daf5117e49a899c40cbc90c91a7d4c52b83e7f1fb41f08d1c7e2ecf0d184c18fe2241c6635e9025b7578ada47599026ef9cb1bcb8ca78a15d4f533',
      factory: '0x0ba5ed0c6aa8c49038f819e587e2633c4a9f428a',
      factoryData:
        '0x3ffba36f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000008b19119270991232e396e9406a9d60b6ddd72f9b00000000000000000000000000000000000000000000000000000000000000405f1d235545daf5117e49a899c40cbc90c91a7d4c52b83e7f1fb41f08d1c7e2ecf0d184c18fe2241c6635e9025b7578ada47599026ef9cb1bcb8ca78a15d4f533',
    });

    expect(result).toBe(1);
    expect(mockReadContract).not.toHaveBeenCalled();
  });

  it('returns -1 when owner not found in factory data', async () => {
    const mockGetCode = vi.fn().mockResolvedValueOnce(null);
    const mockReadContract = vi.fn();

    (readContract as Mock).mockImplementation(mockReadContract);
    vi.spyOn(client, 'getCode').mockImplementation(mockGetCode);

    const result = await findOwnerIndex({
      address: '0xabc',
      client,
      publicKey: '0x7838d2724FC686813CAf81d4429beff1110c739a',
      factory: '0x0ba5ed0c6aa8c49038f819e587e2633c4a9f428a',
      factoryData:
        '0x3ffba36f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000008b19119270991232e396e9406a9d60b6ddd72f9b00000000000000000000000000000000000000000000000000000000000000405f1d235545daf5117e49a899c40cbc90c91a7d4c52b83e7f1fb41f08d1c7e2ecf0d184c18fe2241c6635e9025b7578ada47599026ef9cb1bcb8ca78a15d4f533',
    });
    expect(result).toBe(-1);
  });

  it('throws error for unknown factory address', async () => {
    const mockGetCode = vi.fn().mockResolvedValueOnce(null);
    const mockReadContract = vi.fn();

    (readContract as Mock).mockImplementation(mockReadContract);
    vi.spyOn(client, 'getCode').mockImplementation(mockGetCode);

    await expect(
      findOwnerIndex({
        address: '0xabc',
        client,
        publicKey: '0x7838d2724FC686813CAf81d4429beff1110c739a',
        factory: '0x0000000000FFe8B47B3e2130213B802212439497',
        factoryData:
          '0x3ffba36f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000008b19119270991232e396e9406a9d60b6ddd72f9b00000000000000000000000000000000000000000000000000000000000000405f1d235545daf5117e49a899c40cbc90c91a7d4c52b83e7f1fb41f08d1c7e2ecf0d184c18fe2241c6635e9025b7578ada47599026ef9cb1bcb8ca78a15d4f533',
      })
    ).rejects.toThrow(standardErrors.rpc.internal('unknown factory address'));
  });

  it('throws error for unknown factory function', async () => {
    const mockGetCode = vi.fn().mockResolvedValueOnce(null);
    const mockReadContract = vi.fn();

    (readContract as Mock).mockImplementation(mockReadContract);
    vi.spyOn(client, 'getCode').mockImplementation(mockGetCode);

    await expect(
      findOwnerIndex({
        address: '0xabc',
        client,
        publicKey: '0x7838d2724FC686813CAf81d4429beff1110c739a',
        factory: '0x0ba5ed0c6aa8c49038f819e587e2633c4a9f428a',
        factoryData:
          '0x250b1b41000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000147838d2724FC686813CAf81d4429beff1110c739a000000000000000000000000', // invalid function data
      })
    ).rejects.toThrow(standardErrors.rpc.internal('unknown factory function'));
  });
});
