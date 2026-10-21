import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import { withMeasurement } from './withMeasurement.js';

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
  return logEvent.mock.calls.filter(([eventName]) => eventName === name).map(([, data]) => data);
}

beforeEach(() => {
  logEvent.mockReset();
  window.ClientAnalytics = { logEvent } as unknown as typeof window.ClientAnalytics;
});

afterEach(() => {
  window.ClientAnalytics = undefined;
});

describe('withMeasurement', () => {
  it('sends the logged correlation id with every wallet message the request causes', async () => {
    const rt = transport();

    await withMeasurement(
      { surface: 'eip1193_provider', method: 'personal_sign', transport: rt },
      async (measuredTransport) => {
        await measuredTransport.handshake({ method: 'handshake' });
        return measuredTransport.request({ method: 'wallet_invokeMethod' });
      }
    );

    const [started] = logged('provider.request.started');
    expect(started).toMatchObject({ surface: 'eip1193_provider', method: 'personal_sign' });
    expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' }, started.correlationId);
    expect(rt.request).toHaveBeenCalledWith(
      { method: 'wallet_invokeMethod' },
      started.correlationId
    );
    expect(logged('provider.request.responded')).toEqual([
      expect.objectContaining({
        surface: 'eip1193_provider',
        method: 'personal_sign',
        correlationId: started.correlationId,
      }),
    ]);
  });

  it('gives each request its own correlation id', async () => {
    const rt = transport();
    const send = (measuredTransport: WalletTransport) =>
      measuredTransport.request({ method: 'wallet_invokeMethod' });

    await withMeasurement(
      { surface: 'wallet_standard', method: 'solana_signMessage', transport: rt },
      send
    );
    await withMeasurement(
      { surface: 'wallet_standard', method: 'solana_signMessage', transport: rt },
      send
    );

    const [first, second] = rt.request.mock.calls.map(([, correlationId]) => correlationId);
    expect(first).toEqual(expect.any(String));
    expect(second).not.toBe(first);
  });

  it('logs the error code and message of a failed request, then rethrows', async () => {
    const error = standardErrors.provider.userRejectedRequest('User rejected the request.');

    await expect(
      withMeasurement({ surface: 'sdk_connect', method: 'connect', transport: transport() }, () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(logged('provider.request.error')).toEqual([
      expect.objectContaining({
        surface: 'sdk_connect',
        method: 'connect',
        errorCode: 4001,
        errorMessage: 'User rejected the request.',
      }),
    ]);
    expect(logged('provider.request.responded')).toEqual([]);
  });

  it('leaves session reads and cleanup to the original transport', async () => {
    const rt = transport();

    await withMeasurement(
      { surface: 'eip1193_provider', method: 'eth_accounts', transport: rt },
      async (measuredTransport) => {
        measuredTransport.readSession();
        await measuredTransport.cleanup();
      }
    );

    expect(rt.readSession).toHaveBeenCalledOnce();
    expect(rt.cleanup).toHaveBeenCalledOnce();
  });
});
