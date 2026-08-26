import { Address } from ':core/type/index.js';
import { sessionCovers } from './covers.js';
import { sessionFromAccounts } from './eip155.js';
import type { Session } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

describe('sessionCovers', () => {
  it('is false when there is no session', () => {
    expect(sessionCovers(undefined, ['eip155:1'])).toBe(false);
  });

  it('treats empty required as any account on any chain', () => {
    const empty: Session = { scopes: {}, selected: {}, transportKind: 'popup' };
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    expect(sessionCovers(empty, [])).toBe(false);
    expect(sessionCovers(session, [])).toBe(true);
  });

  it('requires exact eip155 chains and granted methods', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    expect(sessionCovers(session, ['eip155:8453'])).toBe(false);
    expect(sessionCovers(session, [{ chainId: 'eip155:1', methods: ['personal_sign'] }])).toBe(
      true
    );
    expect(sessionCovers(session, [{ chainId: 'eip155:1', methods: ['eth_subscribe'] }])).toBe(
      false
    );
  });

  it('requires an exact CAIP-2 match for non-eip155', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    expect(sessionCovers(session, [SOLANA])).toBe(false);

    session.scopes[SOLANA] = {
      accounts: [`${SOLANA}:So11111111111111111111111111111111111111112`],
      methods: ['solana_signMessage'],
    };
    expect(sessionCovers(session, [SOLANA])).toBe(true);
  });
});
