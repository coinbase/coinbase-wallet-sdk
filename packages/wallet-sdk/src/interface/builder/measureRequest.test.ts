import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import { measureRequest } from './measureRequest.js';

const logEvent = vi.fn();

function transport() {
  return {
    handshake: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockResolvedValue('0xok'),
    readSession: vi.fn(),
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  } satisfies WalletTransport;
}

function logged(name: string) {
  return logEvent.mock.calls.find(([eventName]) => eventName === name)?.[1];
}

beforeEach(() => {
  logEvent.mockReset();
  window.ClientAnalytics = { logEvent } as unknown as typeof window.ClientAnalytics;
});

afterEach(() => {
  window.ClientAnalytics = undefined;
});

describe('measureRequest', () => {
  it('sends the logged correlation id with every wallet message the request causes', async () => {
    const rt = transport();

    await measureRequest({ surface: 'evm', method: 'personal_sign', transport: rt }, async (t) => {
      await t.handshake({ method: 'handshake' });
      return t.request({ method: 'wallet_invokeMethod' });
    });

    const started = logged('provider.request.started');
    expect(started).toMatchObject({ surface: 'evm', method: 'personal_sign' });
    expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' }, started.correlationId);
    expect(rt.request).toHaveBeenCalledWith(
      { method: 'wallet_invokeMethod' },
      started.correlationId
    );
    expect(logged('provider.request.responded')).toMatchObject({
      surface: 'evm',
      method: 'personal_sign',
      correlationId: started.correlationId,
    });
  });

  it('gives each request its own correlation id', async () => {
    const rt = transport();
    const send = (t: WalletTransport) => t.request({ method: 'wallet_invokeMethod' });

    await measureRequest({ surface: 'solana', method: 'solana_signMessage', transport: rt }, send);
    await measureRequest({ surface: 'solana', method: 'solana_signMessage', transport: rt }, send);

    const [first, second] = rt.request.mock.calls.map(([, correlationId]) => correlationId);
    expect(first).toEqual(expect.any(String));
    expect(second).not.toBe(first);
  });

  it('logs the error code and message, then rethrows', async () => {
    const error = standardErrors.provider.userRejectedRequest('User rejected the request.');

    await expect(
      measureRequest({ surface: 'connect', method: 'connect', transport: transport() }, () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(logged('provider.request.error')).toMatchObject({
      surface: 'connect',
      method: 'connect',
      errorCode: 4001,
      errorMessage: 'User rejected the request.',
    });
    expect(logged('provider.request.responded')).toBeUndefined();
  });

  it('leaves session reads and cleanup to the original transport', async () => {
    const rt = transport();

    await measureRequest({ surface: 'evm', method: 'eth_accounts', transport: rt }, async (t) => {
      t.readSession();
      await t.cleanup();
    });

    expect(rt.readSession).toHaveBeenCalledOnce();
    expect(rt.cleanup).toHaveBeenCalledOnce();
  });
});
