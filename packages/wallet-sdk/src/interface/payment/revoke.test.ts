import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as prepareRevokeModule from './prepareRevoke.js';
import { revoke } from './revoke.js';

vi.mock('@coinbase/cdp-sdk', () => ({
  CdpClient: vi.fn(),
}));

vi.mock('./prepareRevoke.js', () => ({
  prepareRevoke: vi.fn(),
}));

import { CdpClient } from '@coinbase/cdp-sdk';

describe('revoke', () => {
  const mockEoaAccount = {
    address: '0x1234567890123456789012345678901234567890',
  };

  const mockSmartAccount = {
    address: '0xabcdef1234567890123456789012345678901234',
    useNetwork: vi.fn(),
  };

  const mockNetworkSmartAccount = {
    sendUserOperation: vi.fn(),
    waitForUserOperation: vi.fn(),
  };

  const mockCdpClient = {
    evm: {
      getAccount: vi.fn(),
      getSmartAccount: vi.fn(),
    },
  };

  const mockRevokeCall = {
    to: '0xabc123' as any,
    data: '0xdef456' as any,
    value: 0n,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (CdpClient as any).mockImplementation(() => mockCdpClient);
    mockCdpClient.evm.getAccount.mockResolvedValue(mockEoaAccount);
    mockCdpClient.evm.getSmartAccount.mockResolvedValue(mockSmartAccount);
    mockSmartAccount.useNetwork.mockResolvedValue(mockNetworkSmartAccount);
    mockNetworkSmartAccount.sendUserOperation.mockResolvedValue({
      smartAccountAddress: mockSmartAccount.address,
      status: 'broadcast',
      userOpHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
    });
    mockNetworkSmartAccount.waitForUserOperation.mockResolvedValue({
      smartAccountAddress: mockSmartAccount.address,
      status: 'complete',
      userOpHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
      transactionHash: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
    });
    (prepareRevokeModule.prepareRevoke as any).mockResolvedValue(mockRevokeCall);
  });

  it('binds expectedSpender to the CDP smart wallet', async () => {
    const options = {
      id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
      testnet: false,
      cdpApiKeyId: 'test-api-key',
      cdpApiKeySecret: 'test-api-secret',
      cdpWalletSecret: 'test-wallet-secret',
    };

    await revoke(options);

    expect(prepareRevokeModule.prepareRevoke).toHaveBeenCalledWith({
      id: options.id,
      testnet: options.testnet,
      expectedSpender: mockSmartAccount.address,
      expectedPayer: undefined,
    });
  });

  it('passes expectedPayer through to prepareRevoke', async () => {
    const expectedPayer = '0x1111111111111111111111111111111111111111';
    const options = {
      id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
      testnet: false,
      expectedPayer: expectedPayer as any,
      cdpApiKeyId: 'test-api-key',
      cdpApiKeySecret: 'test-api-secret',
      cdpWalletSecret: 'test-wallet-secret',
    };

    await revoke(options);

    expect(prepareRevokeModule.prepareRevoke).toHaveBeenCalledWith({
      id: options.id,
      testnet: options.testnet,
      expectedSpender: mockSmartAccount.address,
      expectedPayer,
    });
  });

  it('rejects when expectedSpender does not match the revoking wallet', async () => {
    const options = {
      id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
      testnet: false,
      expectedSpender: '0x3333333333333333333333333333333333333333' as any,
      cdpApiKeyId: 'test-api-key',
      cdpApiKeySecret: 'test-api-secret',
      cdpWalletSecret: 'test-wallet-secret',
    };

    await expect(revoke(options)).rejects.toThrow(
      `expectedSpender ${options.expectedSpender} does not match revoking wallet ${mockSmartAccount.address}`
    );
    expect(prepareRevokeModule.prepareRevoke).not.toHaveBeenCalled();
  });
});
