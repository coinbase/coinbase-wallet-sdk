import { standardErrors } from ':core/error/errors.js';
import { OwnerAccount } from ':core/type/index.js';
import { getClient } from ':store/chain-clients/utils.js';
import { store } from ':store/store.js';
import { waitForCallsStatus } from 'viem/experimental';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findOwnerIndex } from './findOwnerIndex.js';
import { handleAddSubAccountOwner } from './handleAddSubAccountOwner.js';
import { presentAddOwnerDialog } from './presentAddOwnerDialog.js';

vi.mock(':store/store.js');
vi.mock(':store/chain-clients/utils.js');
vi.mock('viem/experimental', () => ({
  waitForCallsStatus: vi.fn().mockResolvedValue({ status: 'success' }),
}));
vi.mock('./findOwnerIndex.js', () => ({
  findOwnerIndex: vi.fn().mockResolvedValue(1),
}));
vi.mock('./presentAddOwnerDialog.js', () => ({
  presentAddOwnerDialog: vi.fn().mockResolvedValue('authenticate'),
}));

describe('handleAddSubAccountOwner', () => {
  const mockOwnerAccount: OwnerAccount = {
    type: 'webAuthn',
    id: 'test',
    publicKey:
      '0x257f092a80cce399bcbdbf2a1a750df0da83d316d3801e5cf248ecd89c41ee60c8d5b15d41a61c7dd792bad1e9f89cb46beadf00eb51fb1ca3da75f035ade048' as const,
    signMessage: vi.fn(),
    sign: vi.fn(),
    signTypedData: vi.fn(),
  };

  const mockGlobalAccountRequest = vi.fn();
  const mockClient = {
    waitForTransaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (store.account.get as ReturnType<typeof vi.fn>).mockReturnValue({
      accounts: ['0xglobal', '0xsub'],
      chain: { id: 1 },
    });
    (store.subAccounts.get as ReturnType<typeof vi.fn>).mockReturnValue({
      address: '0xsub',
    });
    (getClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
  });

  it("should throw error when client is not found", async () => {
    (getClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
      })
    ).rejects.toThrow(standardErrors.rpc.internal("client not found for chainId 1"));
  });

  it("should throw error when calls fail", async () => {
    (waitForCallsStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "failed" });

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
      })
    ).rejects.toThrow(standardErrors.rpc.internal("add owner call failed"));
  });

  it('should successfully add owner when all conditions are met', async () => {
    (waitForCallsStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "success" });

    await handleAddSubAccountOwner({
      ownerAccount: mockOwnerAccount,
      globalAccountRequest: mockGlobalAccountRequest,
    });

    expect(mockGlobalAccountRequest).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: expect.any(Array),
    });
    expect(findOwnerIndex).toHaveBeenCalled();
  });

  it('should throw error when no global account is found', async () => {
    (store.account.get as ReturnType<typeof vi.fn>).mockReturnValue({
      accounts: ['0xsub'],
      chain: { id: 1 },
    });

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
      })
    ).rejects.toThrow(standardErrors.provider.unauthorized('no global account'));
  });

  it('should throw error when no chain id is found', async () => {
    (store.account.get as ReturnType<typeof vi.fn>).mockReturnValue({
      accounts: ['0xglobal', '0xsub'],
      chain: {},
    });

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
      })
    ).rejects.toThrow(standardErrors.provider.unauthorized('no chain id'));
  });

  it('should throw error when no sub account is found', async () => {
    (store.subAccounts.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
      })
    ).rejects.toThrow(standardErrors.provider.unauthorized('no sub account'));
  });

  it('should throw error when user cancels the dialog', async () => {
    (presentAddOwnerDialog as ReturnType<typeof vi.fn>).mockResolvedValue('cancel');

    await expect(
      handleAddSubAccountOwner({
        ownerAccount: mockOwnerAccount,
        globalAccountRequest: mockGlobalAccountRequest,
      })
    ).rejects.toThrow(standardErrors.provider.unauthorized('user cancelled'));
  });
});
