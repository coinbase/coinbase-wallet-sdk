import { standardErrors } from ':core/error/errors.js';
import { OwnerAccount } from ':core/type/index.js';
import { getClient } from ':core/namespaces/eip155/client/index.js';
import { waitForCallsStatus } from 'viem/actions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findOwnerIndex } from './findOwnerIndex.js';
import { handleAddSubAccountOwner } from './handleAddSubAccountOwner.js';
import { presentAddOwnerDialog } from './presentAddOwnerDialog.js';

vi.mock(':core/namespaces/eip155/client/index.js');
vi.mock('viem/actions', () => ({
  waitForCallsStatus: vi.fn().mockResolvedValue({ status: 'success' }),
}));
vi.mock('./findOwnerIndex.js', () => ({
  findOwnerIndex: vi.fn().mockResolvedValue(1),
}));
vi.mock('./presentAddOwnerDialog.js', () => ({
  presentAddOwnerDialog: vi.fn().mockResolvedValue('authenticate'),
}));

describe('handleAddSubAccountOwner', () => {
  const globalAccount = '0x0000000000000000000000000000000000000001';
  const subAccount = '0x0000000000000000000000000000000000000002';
  const mockOwnerAccount: OwnerAccount = {
    type: 'webAuthn',
    id: 'test',
    publicKey:
      '0x257f092a80cce399bcbdbf2a1a750df0da83d316d3801e5cf248ecd89c41ee60c8d5b15d41a61c7dd792bad1e9f89cb46beadf00eb51fb1ca3da75f035ade048' as const,
    signMessage: vi.fn(),
    sign: vi.fn(),
    signTypedData: vi.fn(),
  };

  const mockLocalOwnerAccount: OwnerAccount = {
    type: 'local',
    address: '0x1234567890123456789012345678901234567890' as const,
    publicKey:
      '0x257f092a80cce399bcbdbf2a1a750df0da83d316d3801e5cf248ecd89c41ee60c8d5b15d41a61c7dd792bad1e9f89cb46beadf00eb51fb1ca3da75f035ade048' as const,
    source: 'test-source',
    signMessage: vi.fn(),
    sign: vi.fn(),
    signTransaction: vi.fn(),
    signTypedData: vi.fn(),
  };

  const mockGlobalAccountRequest = vi.fn().mockResolvedValue('mock-calls-id');
  const mockClient = {
    waitForTransaction: vi.fn(),
  };
  const testChainId = 8453; // Base mainnet

  beforeEach(() => {
    vi.clearAllMocks();
    (getClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
    (waitForCallsStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'success' });
    (findOwnerIndex as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (presentAddOwnerDialog as ReturnType<typeof vi.fn>).mockResolvedValue('authenticate');
  });

  it('should throw error when client is not found', async () => {
    (getClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
        chainId: testChainId,
        globalAccount,
        subAccount,
      })
    ).rejects.toThrow(standardErrors.rpc.internal(`client not found for chainId ${testChainId}`));
  });

  it('should throw error when calls fail', async () => {
    (waitForCallsStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'failed' });

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
        chainId: testChainId,
        globalAccount,
        subAccount,
      })
    ).rejects.toThrow(standardErrors.rpc.internal('add owner call failed'));
  });

  it('should successfully add owner and return owner index for webAuthn account', async () => {
    const result = await handleAddSubAccountOwner({
      ownerAccount: mockOwnerAccount,
      globalAccountRequest: mockGlobalAccountRequest,
      chainId: testChainId,
      globalAccount,
      subAccount,
    });

    expect(result).toBe(1);
    expect(mockGlobalAccountRequest).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: expect.arrayContaining([
        expect.objectContaining({
          version: '1',
          calls: expect.arrayContaining([
            expect.objectContaining({
              to: subAccount,
              data: expect.any(String),
              value: '0x0',
            }),
          ]),
          chainId: expect.any(String),
          from: globalAccount,
        }),
      ]),
    });
    expect(findOwnerIndex).toHaveBeenCalledWith({
      address: subAccount,
      publicKey: mockOwnerAccount.publicKey,
      client: mockClient,
    });
  });

  it('should successfully add owner for local account with address and publicKey', async () => {
    const result = await handleAddSubAccountOwner({
      ownerAccount: mockLocalOwnerAccount,
      globalAccountRequest: mockGlobalAccountRequest,
      chainId: testChainId,
      globalAccount,
      subAccount,
    });

    expect(result).toBe(1);
    expect(mockGlobalAccountRequest).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: expect.arrayContaining([
        expect.objectContaining({
          calls: expect.arrayContaining([
            // Should include both addOwnerAddress and addOwnerPublicKey calls
            expect.objectContaining({
              to: subAccount,
              data: expect.stringContaining('0x'), // addOwnerAddress call
            }),
            expect.objectContaining({
              to: subAccount,
              data: expect.stringContaining('0x'), // addOwnerPublicKey call
            }),
          ]),
        }),
      ]),
    });
    expect(findOwnerIndex).toHaveBeenCalledWith({
      address: subAccount,
      publicKey: mockLocalOwnerAccount.address, // For local accounts, uses address for finding
      client: mockClient,
    });
  });

  it('should throw error when user cancels the dialog', async () => {
    (presentAddOwnerDialog as ReturnType<typeof vi.fn>).mockResolvedValue('cancel');

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
        chainId: testChainId,
        globalAccount,
        subAccount,
      })
    ).rejects.toThrow(standardErrors.provider.unauthorized('user cancelled'));
  });

  it('should throw error when findOwnerIndex returns -1', async () => {
    (findOwnerIndex as ReturnType<typeof vi.fn>).mockResolvedValue(-1);

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
        chainId: testChainId,
        globalAccount,
        subAccount,
      })
    ).rejects.toThrow(standardErrors.rpc.internal('failed to find owner index'));
  });

  it('should handle local account with different address', async () => {
    const mockLocalAccountNoAddress: OwnerAccount = {
      type: 'local',
      address: '0x0000000000000000000000000000000000000000' as const, // LocalAccount requires address
      publicKey:
        '0x257f092a80cce399bcbdbf2a1a750df0da83d316d3801e5cf248ecd89c41ee60c8d5b15d41a61c7dd792bad1e9f89cb46beadf00eb51fb1ca3da75f035ade048' as const,
      source: 'test-source',
      signMessage: vi.fn(),
      sign: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    const result = await handleAddSubAccountOwner({
      ownerAccount: mockLocalAccountNoAddress,
      globalAccountRequest: mockGlobalAccountRequest,
      chainId: testChainId,
      globalAccount,
      subAccount,
    });

    expect(result).toBe(1);
    expect(mockGlobalAccountRequest).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: expect.arrayContaining([
        expect.objectContaining({
          calls: expect.arrayContaining([
            // Should include both addOwnerAddress and addOwnerPublicKey calls for local accounts
            expect.objectContaining({
              to: subAccount,
              data: expect.stringContaining('0x'),
            }),
            expect.objectContaining({
              to: subAccount,
              data: expect.stringContaining('0x'),
            }),
          ]),
        }),
      ]),
    });
    // Should use address for finding since it's a local account
    expect(findOwnerIndex).toHaveBeenCalledWith({
      address: subAccount,
      publicKey: mockLocalAccountNoAddress.address,
      client: mockClient,
    });
  });
});
