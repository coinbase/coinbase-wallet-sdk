import { standardErrorCodes } from ':core/error/constants.js';
import type { Address } from ':core/type/index.js';
import { sessionFromAccounts } from '../session/eip155.js';
import type { Envelope } from '../session/types.js';
import { getNamespaceTranslator } from './registry.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;

describe('getNamespaceTranslator', () => {
  it('dispatches eip155 request and response handling to the registered translator', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const envelope: Envelope = {
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    };

    const translator = getNamespaceTranslator('eip155');

    expect(translator.namespace).toBe('eip155');
    expect(translator.qualify(session, envelope)).toBe(envelope);
    expect(
      translator.unwrapResponse(
        {
          chainId: envelope.chainId,
          result: { method: envelope.request.method, result: '0xsig' },
        },
        envelope
      )
    ).toBe('0xsig');
  });

  it.each(['solana', 'bip122', 'cosmos'] as const)(
    'rejects an unregistered %s namespace with the unsupported-method error',
    (namespace) => {
      expect.assertions(2);
      try {
        getNamespaceTranslator(namespace);
      } catch (error) {
        expect(error).toHaveProperty('code', standardErrorCodes.provider.unsupportedMethod);
        expect(error).toHaveProperty(
          'message',
          `Namespace '${namespace}' is not enabled in this SDK version`
        );
      }
    }
  );
});
