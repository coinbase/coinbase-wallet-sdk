import { Address } from ':core/type/index.js';
import {
  projectEthAccounts,
  sessionCovers,
  sessionFromAccounts,
  withEip155Chain,
} from './index.js';

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
    expect(sessionCovers(session, ['eip155:1'])).toBe(true);
  });

  it('rewrites the selected eip155 chain', () => {
    const session = withEip155Chain(sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 }), 8453);
    expect(session.selected.eip155).toBe(`eip155:8453:${ADDRESS}`);
  });
});
