import { sessionFromAccounts } from ':core/namespaces/eip155/session.js';
import { activeSession } from './activeSession.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';

describe('activeSession', () => {
  it('requires a wallet-issued id and at least one authorized account', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });

    expect(activeSession(undefined)).toBeUndefined();
    expect(activeSession({ scopes: {} })).toBeUndefined();
    expect(activeSession(session)).toBeUndefined();

    const active = { ...session, sessionId: 'session-1' };
    expect(activeSession(active)).toBe(active);
  });
});
