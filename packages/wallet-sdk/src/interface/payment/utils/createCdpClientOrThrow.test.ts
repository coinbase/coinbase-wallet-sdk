import { CdpClient } from '@coinbase/cdp-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCdpClientOrThrow } from './createCdpClientOrThrow.js';

// Mock the CdpClient
vi.mock('@coinbase/cdp-sdk', () => ({
  CdpClient: vi.fn(),
}));

describe('createCdpClientOrThrow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create CDP client with provided options', () => {
    const mockCdpClient = {} as CdpClient;
    vi.mocked(CdpClient).mockReturnValue(mockCdpClient);

    const options = {
      cdpApiKeyId: 'test-key-id',
      cdpApiKeySecret: 'test-key-secret',
      cdpWalletSecret: 'test-wallet-secret',
    };

    const result = createCdpClientOrThrow(options, 'test context');

    expect(result).toBe(mockCdpClient);
    expect(CdpClient).toHaveBeenCalledWith({
      apiKeyId: 'test-key-id',
      apiKeySecret: 'test-key-secret',
      walletSecret: 'test-wallet-secret',
    });
  });

  it('should create CDP client with partial options', () => {
    const mockCdpClient = {} as CdpClient;
    vi.mocked(CdpClient).mockReturnValue(mockCdpClient);

    const options = {
      cdpApiKeyId: 'test-key-id',
    };

    const result = createCdpClientOrThrow(options, 'test context');

    expect(result).toBe(mockCdpClient);
    expect(CdpClient).toHaveBeenCalledWith({
      apiKeyId: 'test-key-id',
      apiKeySecret: undefined,
      walletSecret: undefined,
    });
  });

  it('should create CDP client with empty options', () => {
    const mockCdpClient = {} as CdpClient;
    vi.mocked(CdpClient).mockReturnValue(mockCdpClient);

    const result = createCdpClientOrThrow({}, 'test context');

    expect(result).toBe(mockCdpClient);
    expect(CdpClient).toHaveBeenCalledWith({
      apiKeyId: undefined,
      apiKeySecret: undefined,
      walletSecret: undefined,
    });
  });

  it('should throw detailed error when CDP client creation fails with Error', () => {
    const originalError = new Error('Missing API credentials');
    vi.mocked(CdpClient).mockImplementation(() => {
      throw originalError;
    });

    expect(() => createCdpClientOrThrow({}, 'subscription charge')).toThrow(
      'Failed to initialize CDP client for subscription charge. Missing API credentials\n\nPlease ensure you have set the required CDP credentials either:\n1. As environment variables: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET\n2. As function parameters: cdpApiKeyId, cdpApiKeySecret, cdpWalletSecret\n\nYou can get these credentials from https://portal.cdp.coinbase.com/'
    );
  });

  it('should throw detailed error when CDP client creation fails with string', () => {
    vi.mocked(CdpClient).mockImplementation(() => {
      throw 'String error';
    });

    expect(() => createCdpClientOrThrow({}, 'subscription revoke')).toThrow(
      'Failed to initialize CDP client for subscription revoke. String error\n\nPlease ensure you have set the required CDP credentials either:\n1. As environment variables: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET\n2. As function parameters: cdpApiKeyId, cdpApiKeySecret, cdpWalletSecret\n\nYou can get these credentials from https://portal.cdp.coinbase.com/'
    );
  });

  it('should throw detailed error when CDP client creation fails with non-Error object', () => {
    vi.mocked(CdpClient).mockImplementation(() => {
      throw { code: 'INVALID_CREDENTIALS' };
    });

    expect(() => createCdpClientOrThrow({}, 'test context')).toThrow(
      'Failed to initialize CDP client for test context. [object Object]\n\nPlease ensure you have set the required CDP credentials either:\n1. As environment variables: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET\n2. As function parameters: cdpApiKeyId, cdpApiKeySecret, cdpWalletSecret\n\nYou can get these credentials from https://portal.cdp.coinbase.com/'
    );
  });

  it('should include context in error message', () => {
    vi.mocked(CdpClient).mockImplementation(() => {
      throw new Error('Test error');
    });

    expect(() => createCdpClientOrThrow({}, 'payment processing')).toThrow(
      'Failed to initialize CDP client for payment processing'
    );
  });
});
