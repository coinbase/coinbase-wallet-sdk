import type { RequestArguments } from ':core/provider/interface.js';
import type { Envelope } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import { sessionFromAccounts } from '../session.fixtures.js';
import { createActiveChain } from './activeChain.js';
import { handleConnected } from './connected.js';
import type { Eip1193Context } from './context.js';
import { handleDisconnected } from './disconnected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function context(send: (envelope: Envelope) => Promise<unknown>): Eip1193Context {
  const transport: WalletTransport = {
    handshake: vi.fn(),
    request: async (request: RequestArguments) => {
      const envelope = request.params as Envelope;
      return {
        chainId: envelope.chainId,
        result: {
          method: envelope.request.method,
          result: await send(envelope),
        },
      };
    },
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
  return {
    transport,
    emit: vi.fn(),
    chain: createActiveChain({ onChange: vi.fn() }),
  };
}

describe('wallet_invokeMethod', () => {
  const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });

  it('invokes the inner wallet method with a CAIP-27 envelope', async () => {
    const send = vi.fn().mockResolvedValue('0xsig');
    const result = await handleConnected(
      context(send),
      {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
        },
      },
      session
    );

    expect(result).toBe('0xsig');
    expect(send).toHaveBeenCalledWith({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    });
  });

  it('keeps direct wallet_invokeMethod on the CAIP-27 transport', async () => {
    const send = vi.fn().mockResolvedValue([ADDRESS]);
    const accounts = await handleConnected(
      context(send),
      {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method: 'eth_accounts', params: [] },
        },
      },
      session
    );

    expect(accounts).toEqual([ADDRESS]);
    expect(send).toHaveBeenCalledWith({
      chainId: 'eip155:8453',
      request: { method: 'eth_accounts', params: [] },
    });
  });

  it('strictly rejects malformed direct invoke before pairing', async () => {
    await expect(
      handleDisconnected(context(vi.fn()), {
        method: 'wallet_invokeMethod',
        params: { chainId: 'eip155:1', request: { method: 'personal_sign' } },
      })
    ).rejects.toMatchObject({ code: -32602 });
  });
});
