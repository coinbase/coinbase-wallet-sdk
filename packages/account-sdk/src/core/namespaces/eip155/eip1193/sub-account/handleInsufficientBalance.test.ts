import { Mock } from 'vitest';
import { handleInsufficientBalanceError } from './handleInsufficientBalance.js';
import { presentSubAccountFundingDialog } from './utils.js';

vi.mock(import('./utils.js'), async (importOriginal) => {
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
      globalAccountRequest: vi.fn().mockImplementation(async (request) => {
        if (request.method === 'wallet_sendCalls') {
          return { id: '0x1234ca11' };
        }

        if (request.method === 'eth_signTypedData_v4') {
          return '0xsignature';
        }
        throw new Error('Unknown request');
      }),
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

  it('should present a continue with primary account option', async () => {
    (presentSubAccountFundingDialog as Mock).mockResolvedValueOnce('continue_popup');

    await handleInsufficientBalanceError(args);

    // Expect one executeBatch call to sub account
    expect(args.globalAccountRequest).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: [
        expect.objectContaining({
          calls: [
            expect.objectContaining({
              to: subAccountAddress,
              value: '0x0',
              data: expect.stringContaining('0x34fcd5be'),
            }),
          ],
        }),
      ],
    });
  });

  it('should always continue via primary account path', async () => {
    (presentSubAccountFundingDialog as Mock).mockResolvedValueOnce('continue_popup');
    await handleInsufficientBalanceError(args);
    expect(args.globalAccountRequest).toHaveBeenCalled();
  });
});
