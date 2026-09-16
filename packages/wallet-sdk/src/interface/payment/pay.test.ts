import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pay } from './pay.js';
import * as sdkManager from './utils/sdkManager.js';
import * as translatePayment from './utils/translatePayment.js';
import * as validation from './utils/validation.js';

// Mock the utility modules
vi.mock('./utils/validation.js', async () => {
  const actual =
    await vi.importActual<typeof import('./utils/validation.js')>('./utils/validation.js');
  return {
    ...actual,
    validateStringAmount: vi.fn(), // Mock validateStringAmount
    normalizeAddress: vi.fn(actual.normalizeAddress), // Spy on the real implementation
  };
});
vi.mock('./utils/translatePayment.js');
vi.mock('./utils/sdkManager.js');

// Mock telemetry events
vi.mock(':core/telemetry/events/payment.js', () => ({
  logPaymentStarted: vi.fn(),
  logPaymentError: vi.fn(),
  logPaymentCompleted: vi.fn(),
}));

describe('pay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('mock-correlation-id'),
    });
  });

  it('should successfully process a payment', async () => {
    // Setup mocks
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          data: '0xabcdef',
          value: '0x0',
        },
      ],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    const payment = await pay({
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      testnet: false,
    });

    expect(payment).toEqual({
      success: true,
      id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      payerInfoResponses: undefined,
    });

    expect(validation.validateStringAmount).toHaveBeenCalledWith('10.50', 6);
    expect(validation.normalizeAddress).toHaveBeenCalledWith(
      '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51'
    );
    expect(translatePayment.translatePaymentToSendCalls).toHaveBeenCalledWith(
      '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      '10.50',
      false,
      undefined,
      undefined
    );

    // Verify telemetry events
    const { logPaymentStarted, logPaymentCompleted } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStarted).toHaveBeenCalledWith({
      amount: '10.50',
      testnet: false,
      correlationId: 'mock-correlation-id',
    });
    expect(logPaymentCompleted).toHaveBeenCalledWith({
      amount: '10.50',
      testnet: false,
      correlationId: 'mock-correlation-id',
    });
  });

  it('should accept non-checksummed addresses and normalize them', async () => {
    // Setup mocks
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          data: '0xabcdef',
          value: '0x0',
        },
      ],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    // Test with lowercase non-checksummed address
    const payment = await pay({
      amount: '10.50',
      to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51', // lowercase
      testnet: false,
    });

    expect(payment).toEqual({
      success: true,
      id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51', // checksummed
      payerInfoResponses: undefined,
    });

    expect(validation.normalizeAddress).toHaveBeenCalledWith(
      '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51'
    );
    expect(translatePayment.translatePaymentToSendCalls).toHaveBeenCalledWith(
      '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51', // checksummed address passed to translate
      '10.50',
      false,
      undefined,
      undefined
    );
  });

  it('should accept amounts with up to 6 decimal places', async () => {
    // Setup mocks
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          data: '0xabcdef',
          value: '0x0',
        },
      ],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    // Test with 6 decimal places
    const payment = await pay({
      amount: '10.123456',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      testnet: false,
    });

    expect(payment).toEqual({
      success: true,
      id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      amount: '10.123456',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      payerInfoResponses: undefined,
    });

    expect(validation.validateStringAmount).toHaveBeenCalledWith('10.123456', 6);
  });

  it('should handle validation errors', async () => {
    vi.mocked(validation.validateStringAmount).mockImplementation(() => {
      throw new Error('Invalid amount: must be greater than 0');
    });

    await expect(
      pay({
        amount: '0',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      })
    ).rejects.toThrow('Invalid amount: must be greater than 0');

    // Verify telemetry events
    const { logPaymentStarted, logPaymentError } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStarted).toHaveBeenCalledWith({
      amount: '0',
      testnet: false,
      correlationId: 'mock-correlation-id',
    });
    expect(logPaymentError).toHaveBeenCalledWith({
      amount: '0',
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'Invalid amount: must be greater than 0',
    });
  });

  it('should reject invalid dataSuffix format', async () => {
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);

    await expect(
      pay({
        amount: '10.50',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
        dataSuffix: 'not-hex' as any,
      })
    ).rejects.toThrow('Invalid dataSuffix: expected a 0x-prefixed hex string');
  });

  it('should handle SDK execution errors', async () => {
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockRejectedValue(
      new Error('User rejected the request')
    );

    await expect(
      pay({
        amount: '10.50',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      })
    ).rejects.toThrow('User rejected the request');
  });

  it('should not log telemetry when telemetry is disabled', async () => {
    // Setup mocks
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          data: '0xabcdef',
          value: '0x0',
        },
      ],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    const payment = await pay({
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      testnet: false,
      telemetry: false,
    });

    expect(payment.success).toBe(true);

    // Verify telemetry events were NOT called
    const { logPaymentStarted, logPaymentCompleted, logPaymentError } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStarted).not.toHaveBeenCalled();
    expect(logPaymentCompleted).not.toHaveBeenCalled();
    expect(logPaymentError).not.toHaveBeenCalled();
  });

  it('should log telemetry by default when telemetry is not specified', async () => {
    // Setup mocks
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          data: '0xabcdef',
          value: '0x0',
        },
      ],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    const payment = await pay({
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      testnet: false,
      // telemetry not specified - should default to true
    });

    expect(payment.success).toBe(true);

    // Verify telemetry events WERE called
    const { logPaymentStarted, logPaymentCompleted } = await import(
      ':core/telemetry/events/payment.js'
    );
    expect(logPaymentStarted).toHaveBeenCalled();
    expect(logPaymentCompleted).toHaveBeenCalled();
  });

  it('should not log telemetry error when telemetry is disabled and payment fails', async () => {
    vi.mocked(validation.validateStringAmount).mockImplementation(() => {
      throw new Error('Invalid amount: must be greater than 0');
    });

    await expect(
      pay({
        amount: '0',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
        telemetry: false,
      })
    ).rejects.toThrow('Invalid amount: must be greater than 0');

    // Verify telemetry error was NOT called
    const { logPaymentError } = await import(':core/telemetry/events/payment.js');
    expect(logPaymentError).not.toHaveBeenCalled();
  });

  it('should pass telemetry preference to SDK manager', async () => {
    // Setup mocks
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    await pay({
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      telemetry: false,
    });

    // Verify SDK manager was called with telemetry = false
    expect(sdkManager.executePaymentWithSDK).toHaveBeenCalledWith(
      expect.any(Object),
      false,
      undefined,
      false,
      undefined
    );
  });

  it('should support testnet with paymaster', async () => {
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 84532,
      calls: [
        {
          to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          data: '0xabcdef',
          value: '0x0',
        },
      ],
      capabilities: {
        paymasterService: {
          url: 'https://api.developer.coinbase.com/rpc/v1/base-sepolia/S-fOd2n2Oi4fl4e1Crm83XeDXZ7tkg8O',
        },
      },
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    const payment = await pay({
      amount: '5.00',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      testnet: true,
    });

    expect(payment.success).toBe(true);
    expect(translatePayment.translatePaymentToSendCalls).toHaveBeenCalledWith(
      '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      '5.00',
      true,
      undefined,
      undefined
    );
    expect(sdkManager.executePaymentWithSDK).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: 84532,
        capabilities: expect.objectContaining({
          paymasterService: expect.any(Object),
        }),
      }),
      true,
      undefined,
      true,
      undefined
    );
  });

  it('should successfully process a payment with payerInfo', async () => {
    const payerInfo = {
      requests: [{ type: 'email' }, { type: 'physicalAddress', optional: true }],
      callbackURL: 'https://example.com/callback',
    };

    const payerInfoResponses = {
      email: 'test@example.com',
      physicalAddress: {
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        countryCode: 'US',
      },
    };

    // Setup mocks
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          data: '0xabcdef',
          value: '0x0',
        },
      ],
      capabilities: {
        dataCallback: {
          requests: [
            { type: 'email', optional: false },
            { type: 'physicalAddress', optional: true },
          ],
          callbackURL: 'https://example.com/callback',
        },
      },
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      payerInfoResponses,
    });

    const payment = await pay({
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      testnet: false,
      payerInfo,
    });

    expect(payment).toEqual({
      success: true,
      id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      payerInfoResponses: payerInfoResponses,
    });

    expect(validation.validateStringAmount).toHaveBeenCalledWith('10.50', 6);
    expect(validation.normalizeAddress).toHaveBeenCalledWith(
      '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51'
    );
    expect(translatePayment.translatePaymentToSendCalls).toHaveBeenCalledWith(
      '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      '10.50',
      false,
      payerInfo,
      undefined
    );
  });

  it('should pass dataSuffix through to SDK manager', async () => {
    vi.mocked(validation.validateStringAmount).mockReturnValue(undefined);
    vi.mocked(translatePayment.translatePaymentToSendCalls).mockReturnValue({
      version: '2.0.0',
      chainId: 8453,
      calls: [],
      capabilities: {},
    });
    vi.mocked(sdkManager.executePaymentWithSDK).mockResolvedValue({
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    await pay({
      amount: '10.50',
      to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      dataSuffix: '0xabc123',
    });

    expect(translatePayment.translatePaymentToSendCalls).toHaveBeenCalledWith(
      '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      '10.50',
      false,
      undefined,
      '0xabc123'
    );

    expect(sdkManager.executePaymentWithSDK).toHaveBeenCalledWith(
      expect.any(Object),
      false,
      undefined,
      true,
      '0xabc123'
    );
  });

  it('should handle different error types and normalize them', async () => {
    // Test with string error
    vi.mocked(validation.validateStringAmount).mockImplementation(() => {
      throw 'String error message';
    });

    await expect(
      pay({
        amount: '10.50',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      })
    ).rejects.toThrowError();

    // Verify the telemetry was called with the correct error message
    const { logPaymentError } = await import(':core/telemetry/events/payment.js');
    expect(logPaymentError).toHaveBeenCalledWith({
      amount: '10.50',
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'String error message',
    });

    // Clear mocks for next test
    vi.clearAllMocks();

    // Test with error object with nested error message
    vi.mocked(validation.validateStringAmount).mockImplementation(() => {
      throw { error: { message: 'Nested error message' } };
    });

    await expect(
      pay({
        amount: '10.50',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      })
    ).rejects.toThrowError();

    expect(logPaymentError).toHaveBeenCalledWith({
      amount: '10.50',
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'Nested error message',
    });

    // Clear mocks for next test
    vi.clearAllMocks();

    // Test with error object with reason
    vi.mocked(validation.validateStringAmount).mockImplementation(() => {
      throw { reason: 'Error reason' };
    });

    await expect(
      pay({
        amount: '10.50',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      })
    ).rejects.toThrowError();

    expect(logPaymentError).toHaveBeenCalledWith({
      amount: '10.50',
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'Error reason',
    });

    // Clear mocks for next test
    vi.clearAllMocks();

    // Test with unknown error type
    vi.mocked(validation.validateStringAmount).mockImplementation(() => {
      throw { unknownField: 'some value' };
    });

    await expect(
      pay({
        amount: '10.50',
        to: '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51',
      })
    ).rejects.toThrowError();

    expect(logPaymentError).toHaveBeenCalledWith({
      amount: '10.50',
      testnet: false,
      correlationId: 'mock-correlation-id',
      errorMessage: 'Unknown error occurred',
    });
  });
});
