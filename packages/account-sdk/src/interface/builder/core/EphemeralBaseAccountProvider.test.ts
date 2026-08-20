import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import type { Popup } from ':core/popup/index.js';
import { RequestArguments } from ':core/provider/interface.js';
import * as providerUtil from ':util/provider.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EphemeralBaseAccountProvider } from './EphemeralBaseAccountProvider.js';

const mockHandshake = vi.fn();
const mockSend = vi.fn();
const mockCleanup = vi.fn();
const mockFetchRPCRequest = vi.fn();

function mockRuntime(): Popup {
  return {
    helpers: {} as Popup['helpers'],
    chainId: () => 1,
    handshake: mockHandshake,
    send: mockSend,
    transport: { kind: 'popup', send: mockSend },
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: mockCleanup,
  };
}

function createProvider() {
  return new EphemeralBaseAccountProvider(
    {
      metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      preference: { telemetry: false },
    },
    mockRuntime()
  );
}

let provider: EphemeralBaseAccountProvider;

beforeEach(() => {
  vi.resetAllMocks();
  mockHandshake.mockResolvedValue(undefined);
  mockSend.mockResolvedValue('0xok');
  mockCleanup.mockResolvedValue(undefined);
  vi.spyOn(providerUtil, 'fetchRPCRequest').mockImplementation(mockFetchRPCRequest);
  provider = createProvider();
});

describe('EphemeralBaseAccountProvider', () => {
  it('emits disconnect event on user initiated disconnection', async () => {
    const disconnectListener = vi.fn();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(mockCleanup).toHaveBeenCalled();
    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  it('forwards wallet_getCallsStatus to wallet rpc url', async () => {
    const args = { method: 'wallet_getCallsStatus' };
    await provider.request(args);
    expect(mockFetchRPCRequest).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
  });

  it.each(['wallet_sendCalls', 'wallet_sign'])(
    'performs handshake, send, and cleanup for %s',
    async (method) => {
      const args = { method, params: ['0xdeadbeef'] } as RequestArguments;
      await expect(provider.request(args)).resolves.toBe('0xok');
      expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
      expect(mockSend).toHaveBeenCalledWith(args);
      expect(mockCleanup).toHaveBeenCalled();
    }
  );

  it('disconnects when an unsupported method is requested', async () => {
    const disconnectSpy = vi.spyOn(provider, 'disconnect');

    await expect(
      provider.request({ method: 'eth_requestAccounts' } as RequestArguments)
    ).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
    });

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
