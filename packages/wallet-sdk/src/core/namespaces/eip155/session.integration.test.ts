import { Address } from ':core/type/index.js';
import { sessionCovers } from ':core/session/grants.js';
import { projectEthAccounts } from './session.js';
import { sessionFromAccounts } from './session.fixtures.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
describe('session', () => {
  it('projects only eip155 accounts', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.namespaces.solana = {
      accounts: ['So11111111111111111111111111111111111111112'],
      methods: ['solana_signMessage'],
    };
    expect(projectEthAccounts(session)).toEqual([ADDRESS]);
    expect(sessionCovers(session, ['eip155:8453'])).toBe(true);
  });
});
