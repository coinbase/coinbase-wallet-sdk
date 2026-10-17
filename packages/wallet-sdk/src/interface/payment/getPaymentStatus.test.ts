import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BUNDLER_HEADERS, DEFAULT_BUNDLER_URLS, TOKENS } from './constants.js';
import { getPaymentStatus } from './getPaymentStatus.js';
import type { PaymentStatus, PaymentStatusOptions } from './types.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock telemetry events
vi.mock(':core/telemetry/events/payment.js', () => ({
  logPaymentStatusCheckStarted: vi.fn(),
  logPaymentStatusCheckCompleted: vi.fn(),
  logPaymentStatusCheckError: vi.fn(),
}));

const defaultBundlerHeaders = {
  'Content-Type': 'application/json',
  ...DEFAULT_BUNDLER_HEADERS,
};

const paymentSender = '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce';
const transferEventTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const paymentSenderTopic = '0x0000000000000000000000004a7c6899cdcb379e284fbfd045462e751da4c7ce';
const paymentRecipientTopic = '0x000000000000000000000000f1ddf1fc0310cb11f0ca87508207012f4a9cb336';

function createUsdcTransferLog({
  testnet = false,
  value = '0x0000000000000000000000000000000000000000000000000000000000989680',
  fromTopic = paymentSenderTopic,
  recipientTopic = paymentRecipientTopic,
}: {
  testnet?: boolean;
  value?: string;
  fromTopic?: string;
  recipientTopic?: string;
} = {}) {
  return {
    address: testnet ? TOKENS.USDC.addresses.baseSepolia : TOKENS.USDC.addresses.base,
    data: value,
    topics: [transferEventTopic, fromTopic, recipientTopic],
  };
}

function createSuccessfulReceipt({
  userOpHash,
  logs = [createUsdcTransferLog()],
  bundleLogs = logs,
  includeLogs = true,
  sender = paymentSender,
  includeSender = true,
}: {
  userOpHash: string;
  logs?: ReturnType<typeof createUsdcTransferLog>[];
  bundleLogs?: ReturnType<typeof createUsdcTransferLog>[];
  includeLogs?: boolean;
  sender?: string;
  includeSender?: boolean;
}) {
  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      userOpHash,
      success: true,
      ...(includeLogs ? { logs } : {}),
      receipt: {
        transactionHash: '0xabc123',
        logs: bundleLogs,
      },
      ...(includeSender ? { sender } : {}),
    },
  };
}

describe('getPaymentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockReset();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('mock-correlation-id'),
    });
  });

  it('should return completed status for successful payment from sender wallet', async () => {
    const mockReceipt = createSuccessfulReceipt({ userOpHash: '0x123456' });

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockReceipt,
    } as Response);

    const status = await getPaymentStatus({
      id: '0x123456',
      testnet: false,
    });

    expect(status).toEqual<PaymentStatus>({
      status: 'completed',
      id: '0x123456',
      message: 'Payment completed successfully',
      sender: '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce',
      amount: '10',
      recipient: '0xf1DdF1fc0310Cb11F0Ca87508207012F4a9CB336',
    });

    expect(fetch).toHaveBeenCalledWith(
      DEFAULT_BUNDLER_URLS.base,
      expect.objectContaining({
        method: 'POST',
        headers: defaultBundlerHeaders,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: ['0x123456'],
        }),
      })
    );
  });

  it('should return completed status when expected payment details match', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xexpected-payment' }),
    } as Response);

    const status = await getPaymentStatus({
      id: '0xexpected-payment',
      expectedPayment: {
        amount: '10.000000',
        recipient: '0xf1ddf1fc0310cb11f0ca87508207012f4a9cb336',
      },
      testnet: false,
    });

    expect(status.status).toBe('completed');
    expect(status.amount).toBe('10');
    expect(status.recipient).toBe('0xf1DdF1fc0310Cb11F0Ca87508207012F4a9CB336');
  });

  it('should reject a payment whose amount does not match the expected amount', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xwrong-amount' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xwrong-amount',
        expectedPayment: {
          amount: '9.99',
          recipient: '0xf1ddf1fc0310cb11f0ca87508207012f4a9cb336',
        },
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: USDC amount does not match the expected amount.');

    const { logPaymentStatusCheckCompleted, logPaymentStatusCheckError } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
    expect(logPaymentStatusCheckError).toHaveBeenCalledWith({
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'Unable to verify payment: USDC amount does not match the expected amount.',
    });
  });

  it('should reject a payment whose recipient does not match the expected recipient', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xwrong-recipient' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xwrong-recipient',
        expectedPayment: {
          amount: '10',
          recipient: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
        testnet: false,
      })
    ).rejects.toThrow(
      'Unable to verify payment: USDC recipient does not match the expected recipient.'
    );
  });

  it('should reject an invalid expected amount', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xinvalid-amount' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xinvalid-amount',
        expectedPayment: {
          amount: 'not-an-amount',
          recipient: '0xf1ddf1fc0310cb11f0ca87508207012f4a9cb336',
        },
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: expected USDC amount is invalid.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should reject an expected amount with more than six decimal places', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xexcess-precision' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xexcess-precision',
        expectedPayment: {
          amount: '10.0000004',
          recipient: '0xf1ddf1fc0310cb11f0ca87508207012f4a9cb336',
        },
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: expected USDC amount is invalid.');
  });

  it('should reject a non-positive expected amount', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xzero-expected-amount' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xzero-expected-amount',
        expectedPayment: {
          amount: '0',
          recipient: '0xf1ddf1fc0310cb11f0ca87508207012f4a9cb336',
        },
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: expected USDC amount is invalid.');
  });

  it('should reject an invalid expected recipient', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xinvalid-recipient' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xinvalid-recipient',
        expectedPayment: {
          amount: '10',
          recipient: '0xinvalid',
        },
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: expected recipient address is invalid.');
  });

  it('should reject malformed expected payment details from untyped callers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xmalformed-expected-payment' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmalformed-expected-payment',
        expectedPayment: {
          amount: 10,
          recipient: '0xf1ddf1fc0310cb11f0ca87508207012f4a9cb336',
        } as unknown as NonNullable<PaymentStatusOptions['expectedPayment']>,
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: expected payment details are invalid.');
  });

  it('should reject a null expected payment from untyped callers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xnull-expected-payment' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xnull-expected-payment',
        expectedPayment: null as unknown as NonNullable<PaymentStatusOptions['expectedPayment']>,
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: expected payment details are invalid.');
  });

  it('should return failed status for failed payment', async () => {
    const mockReceipt = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        userOpHash: '0x789abc',
        success: false,
        receipt: {
          transactionHash: '0xdef456',
        },
        sender: '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce',
        reason: 'Insufficient USDC balance',
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockReceipt,
    } as Response);

    const status = await getPaymentStatus({
      id: '0x789abc',
      expectedPayment: {
        amount: '10',
        recipient: '0xf1ddf1fc0310cb11f0ca87508207012f4a9cb336',
      },
      testnet: false,
    });

    expect(status).toEqual<PaymentStatus>({
      status: 'failed',
      id: '0x789abc',
      message: 'Payment failed',
      sender: '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce',
      reason: 'Insufficient USDC balance',
    });
  });

  it('should return pending status when userOp exists but no receipt', async () => {
    // First call returns no receipt
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
    } as Response);

    // Second call returns userOp
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        jsonrpc: '2.0',
        id: 2,
        result: {
          sender: paymentSender,
          // other userOp fields...
        },
      }),
    } as Response);

    const status = await getPaymentStatus({
      id: '0xpending123',
      testnet: false,
    });

    expect(status).toEqual<PaymentStatus>({
      status: 'pending',
      id: '0xpending123',
      message: 'Your payment is being processed. This usually takes a few seconds.',
      sender: paymentSender,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should return not_found status when payment does not exist', async () => {
    // Both calls return null
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ jsonrpc: '2.0', id: 2, result: null }),
      } as Response);

    const status = await getPaymentStatus({
      id: '0xnotfound',
      testnet: false,
    });

    expect(status).toEqual<PaymentStatus>({
      status: 'not_found',
      id: '0xnotfound',
      message: 'Payment not found. Please check your transaction ID.',
    });
  });

  it('should reject an invalid transaction ID before making an RPC request', async () => {
    await expect(
      getPaymentStatus({
        id: '',
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: transaction ID is invalid.');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle RPC errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32602,
          message: 'Invalid params',
        },
      }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xinvalid',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Invalid params');

    const { logPaymentStatusCheckCompleted, logPaymentStatusCheckError } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
    expect(logPaymentStatusCheckError).toHaveBeenCalledTimes(1);
    expect(logPaymentStatusCheckError).toHaveBeenCalledWith({
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'RPC error: Invalid params',
    });
  });

  it('should reject RPC errors from the pending user operation lookup', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          jsonrpc: '2.0',
          id: 2,
          error: {
            code: -32000,
            message: 'Bundler unavailable',
          },
        }),
      } as Response);

    await expect(
      getPaymentStatus({
        id: '0xpending-rpc-error',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Bundler unavailable');

    const { logPaymentStatusCheckCompleted, logPaymentStatusCheckError } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
    expect(logPaymentStatusCheckError).toHaveBeenCalledTimes(1);
    expect(logPaymentStatusCheckError).toHaveBeenCalledWith({
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'RPC error: Bundler unavailable',
    });
  });

  it('should reject non-successful HTTP responses', async () => {
    const json = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json,
    } as unknown as Response);

    await expect(
      getPaymentStatus({
        id: '0xhttp-error',
        testnet: false,
      })
    ).rejects.toThrow('RPC request failed with HTTP status 401');

    expect(json).not.toHaveBeenCalled();
    const { logPaymentStatusCheckCompleted, logPaymentStatusCheckError } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
    expect(logPaymentStatusCheckError).toHaveBeenCalledTimes(1);
  });

  it('should reject unsuccessful HTTP responses from fetch polyfills without ok', async () => {
    const json = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 503,
      json,
    } as unknown as Response);

    await expect(
      getPaymentStatus({
        id: '0xpolyfill-http-error',
        testnet: false,
      })
    ).rejects.toThrow('RPC request failed with HTTP status 503');

    expect(json).not.toHaveBeenCalled();
  });

  it('should reject a malformed receipt response without a result', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmalformed-receipt-response',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Invalid response');
  });

  it('should reject a malformed pending lookup response without a result', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Unauthorized' }),
      } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmalformed-pending-response',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Invalid response');

    const { logPaymentStatusCheckCompleted } = await import(':core/telemetry/events/payment.js');
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
  });

  it('should reject a scalar receipt result', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: false }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xscalar-receipt-result',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Invalid response');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should reject a scalar pending lookup result', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 2, result: true }),
      } as Response);

    await expect(
      getPaymentStatus({
        id: '0xscalar-pending-result',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Invalid response');

    const { logPaymentStatusCheckCompleted } = await import(':core/telemetry/events/payment.js');
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
  });

  it('should reject a receipt result without a boolean success field', async () => {
    const mockReceipt = createSuccessfulReceipt({ userOpHash: '0xmissing-success' });
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        ...mockReceipt,
        result: {
          ...mockReceipt.result,
          success: undefined,
        },
      }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmissing-success',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Invalid response');
  });

  it('should reject a pending lookup result without a sender', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ jsonrpc: '2.0', id: 2, result: {} }),
      } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmissing-pending-sender',
        testnet: false,
      })
    ).rejects.toThrow('RPC error: Invalid response');

    const { logPaymentStatusCheckCompleted } = await import(':core/telemetry/events/payment.js');
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
  });

  it('should handle network errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      getPaymentStatus({
        id: '0xnetworkerror',
        testnet: false,
      })
    ).rejects.toThrow('Network error');
  });

  it('should use testnet bundler URL when testnet is true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ jsonrpc: '2.0', id: 2, result: null }),
    } as Response);

    await getPaymentStatus({
      id: '0xtestnet',
      testnet: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      DEFAULT_BUNDLER_URLS.baseSepolia,
      expect.objectContaining({
        headers: defaultBundlerHeaders,
      })
    );
  });

  it('should parse user-friendly failure reasons', async () => {
    const testCases = [
      { reason: 'execution reverted: insufficient balance', expected: 'Insufficient USDC balance' },
      { reason: 'transaction reverted', expected: 'transaction reverted' },
      { reason: 'custom error message', expected: 'custom error message' },
    ];

    for (const { reason, expected } of testCases) {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            userOpHash: '0xfailedreason',
            success: false,
            receipt: { transactionHash: '0xfailed' },
            sender: '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce',
            reason,
          },
        }),
      } as Response);

      const status = await getPaymentStatus({
        id: '0xfailedreason',
        testnet: false,
      });

      expect(status.reason).toBe(expected);
    }
  });

  it('should handle logs with different USDC addresses on testnet', async () => {
    const mockReceipt = createSuccessfulReceipt({
      userOpHash: '0x123456',
      logs: [createUsdcTransferLog({ testnet: true })],
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockReceipt,
    } as Response);

    const status = await getPaymentStatus({
      id: '0x123456',
      testnet: true,
    });

    expect(status.amount).toBe('10');
    expect(status.recipient).toBe('0xf1DdF1fc0310Cb11F0Ca87508207012F4a9CB336');
  });

  it('should reject a successful user operation with no USDC transfers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xno-payment', logs: [] }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xno-payment',
        testnet: false,
      })
    ).rejects.toThrow(/Unable to find USDC transfer from sender wallet.*Found 0 USDC transfer/);

    const { logPaymentStatusCheckCompleted, logPaymentStatusCheckError } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
    expect(logPaymentStatusCheckError).toHaveBeenCalledWith({
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: expect.stringContaining('Unable to find USDC transfer'),
    });
  });

  it('should ignore matching transfers from other user operations in the same bundle', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () =>
        createSuccessfulReceipt({
          userOpHash: '0xbundled-noop',
          logs: [],
          bundleLogs: [createUsdcTransferLog()],
        }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xbundled-noop',
        testnet: false,
      })
    ).rejects.toThrow(/Unable to find USDC transfer from sender wallet.*Found 0 USDC transfer/);
  });

  it('should reject a receipt for a different user operation hash', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => createSuccessfulReceipt({ userOpHash: '0xdifferent-operation' }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xrequested-operation',
        testnet: false,
      })
    ).rejects.toThrow(
      'Unable to verify payment: receipt does not match the requested transaction.'
    );
  });

  it('should reject a receipt with no user operation hash', async () => {
    const mockReceipt = createSuccessfulReceipt({ userOpHash: '0xrequested-operation' });
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        ...mockReceipt,
        result: {
          ...mockReceipt.result,
          userOpHash: undefined,
        },
      }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xrequested-operation',
        testnet: false,
      })
    ).rejects.toThrow(
      'Unable to verify payment: receipt does not match the requested transaction.'
    );
  });

  it('should reject a successful user operation when scoped logs are missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () =>
        createSuccessfulReceipt({ userOpHash: '0xmissing-logs', includeLogs: false }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmissing-logs',
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: user operation receipt is missing logs.');
  });

  it('should reject a successful user operation when the sender is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () =>
        createSuccessfulReceipt({ userOpHash: '0xmissing-sender', includeSender: false }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmissing-sender',
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: receipt is missing a valid sender address.');
  });

  it('should reject a zero-value USDC transfer from the sender', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () =>
        createSuccessfulReceipt({
          userOpHash: '0xzero-value',
          logs: [
            createUsdcTransferLog({
              value: '0x0000000000000000000000000000000000000000000000000000000000000000',
            }),
          ],
        }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xzero-value',
        testnet: false,
      })
    ).rejects.toThrow('Unable to verify payment: USDC transfer amount must be greater than zero.');
  });

  it('should reject a successful user operation with a malformed USDC transfer log', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () =>
        createSuccessfulReceipt({
          userOpHash: '0xmalformed-transfer',
          logs: [createUsdcTransferLog({ value: '0x' })],
        }),
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0xmalformed-transfer',
        testnet: false,
      })
    ).rejects.toThrow(/Unable to find USDC transfer from sender wallet.*Found 0 USDC transfer/);
  });

  it('should throw error when no USDC transfer from sender wallet is found', async () => {
    const mockReceipt = createSuccessfulReceipt({
      userOpHash: '0x123456',
      logs: [
        createUsdcTransferLog({
          fromTopic: '0x000000000000000000000000bbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
        }),
      ],
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockReceipt,
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0x123456',
        testnet: false,
      })
    ).rejects.toThrow(
      'Unable to find USDC transfer from sender wallet 0x4A7c6899cdcB379e284fBFd045462e751da4C7ce'
    );
  });

  it('should throw error when multiple USDC transfers from sender wallet are found', async () => {
    const mockReceipt = createSuccessfulReceipt({
      userOpHash: '0x123456',
      logs: [
        createUsdcTransferLog(),
        createUsdcTransferLog({
          value: '0x00000000000000000000000000000000000000000000000000000000000f4240',
          recipientTopic: '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        }),
      ],
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockReceipt,
    } as Response);

    await expect(
      getPaymentStatus({
        id: '0x123456',
        testnet: false,
      })
    ).rejects.toThrow(
      /Found multiple USDC transfers from sender wallet.*Expected exactly one transfer/
    );
  });

  it('should correctly identify transfer from sender in complex transaction with multiple USDC transfers', async () => {
    const mockReceipt = createSuccessfulReceipt({
      userOpHash: '0x123456',
      logs: [
        createUsdcTransferLog({
          value: '0x00000000000000000000000000000000000000000000000000000010c388d00',
          fromTopic: '0x000000000000000000000000bbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
          recipientTopic: '0x000000000000000000000000cccccccccccccccccccccccccccccccccccccccc',
        }),
        createUsdcTransferLog({
          value: '0x00000000000000000000000000000000000000000000000000000000000f4240',
        }),
      ],
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockReceipt,
    } as Response);

    const status = await getPaymentStatus({
      id: '0x123456',
      testnet: false,
    });

    expect(status).toEqual<PaymentStatus>({
      status: 'completed',
      id: '0x123456',
      message: 'Payment completed successfully',
      sender: '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce',
      amount: '1', // Should pick the 1 USDC from sender, not the 4500 USDC gas payment
      recipient: '0xf1DdF1fc0310Cb11F0Ca87508207012F4a9CB336',
    });
  });

  describe('telemetry', () => {
    it('should not log telemetry when telemetry is disabled', async () => {
      const mockReceipt = createSuccessfulReceipt({ userOpHash: '0x123456' });

      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => mockReceipt,
      } as Response);

      await getPaymentStatus({
        id: '0x123456',
        testnet: false,
        telemetry: false,
      });

      // Verify telemetry events were NOT called
      const {
        logPaymentStatusCheckStarted,
        logPaymentStatusCheckCompleted,
        logPaymentStatusCheckError,
      } = await import(':core/telemetry/events/payment.js');
      expect(logPaymentStatusCheckStarted).not.toHaveBeenCalled();
      expect(logPaymentStatusCheckCompleted).not.toHaveBeenCalled();
      expect(logPaymentStatusCheckError).not.toHaveBeenCalled();
    });

    it('should log telemetry by default when telemetry is not specified', async () => {
      const mockReceipt = createSuccessfulReceipt({ userOpHash: '0x123456' });

      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => mockReceipt,
      } as Response);

      await getPaymentStatus({
        id: '0x123456',
        testnet: false,
        // telemetry not specified - should default to true
      });

      // Verify telemetry events WERE called
      const { logPaymentStatusCheckStarted, logPaymentStatusCheckCompleted } = await import(
        ':core/telemetry/events/payment.js'
      );
      expect(logPaymentStatusCheckStarted).toHaveBeenCalledWith({
        testnet: false,
        correlationId: 'mock-correlation-id',
      });
      expect(logPaymentStatusCheckCompleted).toHaveBeenCalledWith({
        testnet: false,
        status: 'completed',
        correlationId: 'mock-correlation-id',
      });
    });

    it('should not log telemetry error when telemetry is disabled and status check fails', async () => {
      const mockError = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Network error',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => mockError,
      } as Response);

      await expect(
        getPaymentStatus({
          id: '0x123456',
          testnet: false,
          telemetry: false,
        })
      ).rejects.toThrow('RPC error: Network error');

      // Verify telemetry error was NOT called
      const { logPaymentStatusCheckError } = await import(':core/telemetry/events/payment.js');
      expect(logPaymentStatusCheckError).not.toHaveBeenCalled();
    });

    it('should log different telemetry events based on status', async () => {
      // Test pending status
      const mockNoReceipt = {
        jsonrpc: '2.0',
        id: 1,
        result: null,
      };
      const mockUserOp = {
        jsonrpc: '2.0',
        id: 2,
        result: {
          sender: '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce',
        },
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          json: async () => mockNoReceipt,
        } as Response)
        .mockResolvedValueOnce({
          json: async () => mockUserOp,
        } as Response);

      await getPaymentStatus({
        id: '0x123456',
        testnet: true,
        telemetry: true,
      });

      const { logPaymentStatusCheckCompleted } = await import(':core/telemetry/events/payment.js');
      expect(logPaymentStatusCheckCompleted).toHaveBeenCalledWith({
        testnet: true,
        status: 'pending',
        correlationId: 'mock-correlation-id',
      });
    });
  });

  describe('custom bundlerUrl', () => {
    it('should use custom bundler URL when provided', async () => {
      const customBundlerUrl = 'https://my-custom-bundler.example.com/rpc';
      const mockReceipt = createSuccessfulReceipt({ userOpHash: '0x123456' });

      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => mockReceipt,
      } as Response);

      const status = await getPaymentStatus({
        id: '0x123456',
        testnet: false,
        bundlerUrl: customBundlerUrl,
      });

      expect(status.status).toBe('completed');

      // Verify that custom bundler URL was used instead of default
      expect(fetch).toHaveBeenCalledWith(
        customBundlerUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getUserOperationReceipt',
            params: ['0x123456'],
          }),
        })
      );

      // Verify default bundler URL was NOT used
      expect(fetch).not.toHaveBeenCalledWith(DEFAULT_BUNDLER_URLS.base, expect.anything());
    });

    it('should use custom bundler URL for both receipt and pending checks', async () => {
      const customBundlerUrl = 'https://my-custom-bundler.example.com/rpc';
      const mockReceiptNotFound = {
        jsonrpc: '2.0',
        id: 1,
        result: null,
      };
      const mockUserOp = {
        jsonrpc: '2.0',
        id: 2,
        result: {
          sender: '0x4A7c6899cdcB379e284fBFd045462e751da4C7ce',
        },
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          json: async () => mockReceiptNotFound,
        } as Response)
        .mockResolvedValueOnce({
          json: async () => mockUserOp,
        } as Response);

      const status = await getPaymentStatus({
        id: '0x123456',
        testnet: false,
        bundlerUrl: customBundlerUrl,
      });

      expect(status.status).toBe('pending');

      // Verify custom bundler URL was used for both calls
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        customBundlerUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('eth_getUserOperationReceipt'),
        })
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        customBundlerUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('eth_getUserOperationByHash'),
        })
      );
    });

    it('should fallback to default bundler URL when custom URL is not provided', async () => {
      const mockReceipt = createSuccessfulReceipt({
        userOpHash: '0x123456',
        logs: [createUsdcTransferLog({ testnet: true })],
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => mockReceipt,
      } as Response);

      await getPaymentStatus({
        id: '0x123456',
        testnet: true,
      });

      // Verify default testnet bundler URL was used
      expect(fetch).toHaveBeenCalledWith(
        DEFAULT_BUNDLER_URLS.baseSepolia,
        expect.objectContaining({
          headers: defaultBundlerHeaders,
        })
      );
    });
  });
});
