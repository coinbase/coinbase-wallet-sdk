import { Mock } from 'vitest';
import { presentSubAccountFundingDialog } from '../utils.js';
import { handleInsufficientBalanceError } from './handleInsufficientBalance.js';

vi.mock(import('../utils.js'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    presentSubAccountFundingDialog: vi.fn(),
  };
});

describe('handleInsufficientBalanceError', () => {
  const subAccountAddress = '0x7838d2724FC686813CAf81d4429beff1110c739a';
  const globalAccountAddress = '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54';

  let args: Parameters<typeof handleInsufficientBalanceError>[0];

  beforeEach(() => {
    args = {
      errorData: {
        type: 'INSUFFICIENT_FUNDS',
        reason: 'NO_SUITABLE_SPEND_PERMISSION_FOUND',
        account: {
          address: subAccountAddress,
        },
        required: {
          '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': {
            amount: '0x38d7ea4c68000',
            sources: [
              {
                address: globalAccountAddress,
                balance: '0x1d73b609302000',
              },
            ],
          },
        },
      },
      client: {
        chain: {
          id: 84532,
        },
        request: vi.fn().mockImplementation(async (request) => {
          if (request.method === 'wallet_getCallsStatus') {
            return {
              status: 200,
              receipts: [{ transactionHash: '0x123', blockNumber: '0x123', gasUsed: '0x123' }],
            };
          }
          throw new Error('Unknown request');
        }),
      } as any,
      globalAccountAddress,
      subAccountAddress,
      globalAccountRequest: vi.fn(),
      subAccountRequest: vi.fn(),
      request: {
        method: 'eth_sendTransaction',
        params: [
          {
            from: subAccountAddress,
            to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            value: '0x1',
          },
        ],
      },
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should allow the user to update their spend limits', async () => {
    (presentSubAccountFundingDialog as Mock).mockResolvedValueOnce('update_permission');

    await handleInsufficientBalanceError(args);

    (args.globalAccountRequest as Mock).mockResolvedValueOnce('0x123');

    expect(args.globalAccountRequest).toHaveBeenCalledWith({
      method: 'eth_signTypedData_v4',
      params: [
        globalAccountAddress,
        expect.objectContaining({
          types: expect.any(Object),
          domain: expect.any(Object),
          message: expect.any(Object),
        }),
      ],
    });

    expect(args.subAccountRequest).toHaveBeenCalledWith(args.request);
  });

  it('should allow the user to cancel', async () => {
    (presentSubAccountFundingDialog as Mock).mockResolvedValueOnce('cancel');

    await expect(handleInsufficientBalanceError(args)).rejects.toThrow();

    expect(args.globalAccountRequest).not.toHaveBeenCalled();
    expect(args.subAccountRequest).not.toHaveBeenCalled();
  });

  it('should allow the user to continue with their global account', async () => {
    (presentSubAccountFundingDialog as Mock).mockResolvedValueOnce('continue_popup');

    await handleInsufficientBalanceError(args);

    // Expect 2 calls to global account and none to sub account
    expect(args.globalAccountRequest).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: [
        expect.objectContaining({
          calls: [
            // 1. Transfer funds from global account to sub account
            expect.objectContaining({
              to: subAccountAddress,
              value: '0x38d7ea4c68000',
              data: '0x',
            }),
            // 2. Batch execute original calls on sub account
            expect.objectContaining({
              to: subAccountAddress,
              data: expect.stringContaining('0x34fcd5be'), // executeBatch
              value: '0x0',
            }),
          ],
        }),
      ],
    });
    expect(args.subAccountRequest).toHaveBeenCalledTimes(0);
  });
});
