import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import { measureRequest, withMeasurement } from './measureRequest.js';

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

describe('measureRequest', () => {
  it('sends the logged correlation id with every wallet message the request causes', async () => {
    const rt = transport();

    await measureRequest(
      { surface: 'eip1193_provider', method: 'personal_sign', transport: rt },
      async (measured) => {
        await measured.handshake({ method: 'handshake' });
        return measured.request({ method: 'wallet_invokeMethod' });
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
    const send = (measured: WalletTransport) => measured.request({ method: 'wallet_invokeMethod' });

    await measureRequest(
      { surface: 'wallet_standard', method: 'solana_signMessage', transport: rt },
      send
    );
    await measureRequest(
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
      measureRequest({ surface: 'sdk_connect', method: 'connect', transport: transport() }, () =>
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

    await measureRequest(
      { surface: 'eip1193_provider', method: 'eth_accounts', transport: rt },
      async (measured) => {
        measured.readSession();
        await measured.cleanup();
      }
    );

    expect(rt.readSession).toHaveBeenCalledOnce();
    expect(rt.cleanup).toHaveBeenCalledOnce();
  });
});

describe('withMeasurement', () => {
  it("runs each call on a copy of the context whose transport carries that call's id", async () => {
    const rt = transport();
    const context = { transport: rt, label: 'evm' };
    const handler = vi.fn(async (callContext: typeof context, args: { method: string }) =>
      callContext.transport.request({ method: 'wallet_invokeMethod', params: [args.method] })
    );
    const request = withMeasurement({ surface: 'eip1193_provider', context }, handler);

    await request({ method: 'personal_sign' });
    await request({ method: 'eth_sendTransaction' });

    const ids = logged('provider.request.started').map(({ correlationId }) => correlationId);
    expect(rt.request.mock.calls.map(([, correlationId]) => correlationId)).toEqual(ids);
    expect(ids[0]).not.toBe(ids[1]);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ label: 'evm' }), {
      method: 'personal_sign',
    });
    expect(context.transport).toBe(rt);
  });
});
