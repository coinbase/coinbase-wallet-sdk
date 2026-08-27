import { standardErrorCodes } from ':core/error/constants.js';
import { defaultStoreInstance } from ':store/store.js';
import { assertEphemeralMethod, createEphemeralStore } from './ephemeral.js';

describe('createEphemeralStore', () => {
  it('is a separate in-memory instance from the persisted SDK store', () => {
    const ephemeral = createEphemeralStore();
    expect(ephemeral).not.toBe(defaultStoreInstance);
    expect('persist' in ephemeral).toBe(false);
  });
});

describe('assertEphemeralMethod', () => {
  it.each([
    'wallet_sendCalls',
    'wallet_sign',
    'experimental_requestInfo',
    'wallet_getCallsStatus',
    'eth_accounts',
  ])('allows %s', (method) => {
    expect(() => assertEphemeralMethod(method)).not.toThrow();
  });

  it('rejects pairing', () => {
    try {
      assertEphemeralMethod('eth_requestAccounts');
      throw new Error('expected unauthorized');
    } catch (error) {
      expect(error).toMatchObject({
        code: standardErrorCodes.provider.unauthorized,
        message: expect.stringContaining('not supported by ephemeral provider'),
      });
    }
  });
});
