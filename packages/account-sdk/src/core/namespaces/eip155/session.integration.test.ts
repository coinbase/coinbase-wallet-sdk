import { Address } from ':core/type/index.js';
import { sessionCovers } from ':core/session/covers.js';
import { projectEthAccounts, sessionFromAccounts } from './session.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

describe('session', () => {
  it('projects only eip155 accounts', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.scopes[SOLANA] = {
      accounts: [`${SOLANA}:So11111111111111111111111111111111111111112`],
      methods: ['solana_signMessage'],
    };
    expect(projectEthAccounts(session)).toEqual([ADDRESS]);
    expect(sessionCovers(session, ['eip155:8453'])).toBe(true);
  });
});
