import type { Session } from ':core/session/types.js';
import { getCapabilities, projectCapabilities } from './capabilities.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const OTHER = '0x0000000000000000000000000000000000000001' as const;

const STORED = {
  '0x1': {
    atomicBatch: { supported: true },
    paymasterService: { supported: true },
  },
  '0x5': {
    atomicBatch: { supported: false },
  },
  '0xa': {
    paymasterService: { supported: true },
  },
};

describe('projectCapabilities', () => {
  it('returns every chain when there is no filter', () => {
    expect(projectCapabilities(STORED)).toEqual(STORED);
  });

  it('reports only what the wallet granted, adding nothing of its own', () => {
    expect(projectCapabilities({})).toEqual({});
  });

  it('keeps the wallet 0x0 entry through a filter', () => {
    const withWildcard = { ...STORED, '0x0': { gasLimitOverride: { supported: true } } };

    expect(projectCapabilities(withWildcard, ['0x1', '0xa'])).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      '0x1': STORED['0x1'],
      '0xa': STORED['0xa'],
    });
  });

  it('filters by chain id', () => {
    expect(projectCapabilities(STORED, ['0x1', '0xa'])).toEqual({
      '0x1': STORED['0x1'],
      '0xa': STORED['0xa'],
    });
  });

  it('matches padded hex filters to stored keys', () => {
    expect(projectCapabilities(STORED, ['0x01', '0x05'])).toEqual({
      '0x1': STORED['0x1'],
      '0x5': STORED['0x5'],
    });
  });

  it('returns nothing when the filter matches no chains', () => {
    expect(projectCapabilities(STORED, ['0x99', '0x100'])).toEqual({});
  });

  it('treats an empty filter as no filter', () => {
    expect(projectCapabilities(STORED, [])).toEqual(STORED);
  });

  it('drops non-hex keys when filtering', () => {
    expect(
      projectCapabilities(
        { '0x1': { atomicBatch: { supported: true } }, 'invalid-key': { someFeature: true } },
        ['0x1']
      )
    ).toEqual({
      '0x1': { atomicBatch: { supported: true } },
    });
  });
});

describe('getCapabilities', () => {
  // The wallet's chain catalog is where capabilities that genuinely differ per chain
  // are reported, alongside the namespace-wide `eip155` authorization.
  const session: Session = {
    namespaces: {
      eip155: {
        accounts: [ADDRESS],
        methods: [],
        // The grant's own capabilities hold on every chain, so they land under `0x0`.
        capabilities: { gasLimitOverride: { supported: true } },
      },
    },
    properties: {
      chainMetadata: {
        'eip155:1': { capabilities: STORED['0x1'] },
        'eip155:5': { capabilities: STORED['0x5'] },
        'eip155:10': { capabilities: STORED['0xa'] },
        'eip155:8453': {},
      },
    },
  };

  it('returns the projected map for a connected account', () => {
    expect(
      getCapabilities({ method: 'wallet_getCapabilities', params: [ADDRESS] }, session)
    ).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      ...STORED,
    });
  });

  it('reports no all-chains entry when the wallet granted none', () => {
    const withoutWildcard: Session = {
      ...session,
      namespaces: { eip155: { accounts: [ADDRESS], methods: [] } },
    };

    expect(
      getCapabilities({ method: 'wallet_getCapabilities', params: [ADDRESS] }, withoutWildcard)
    ).toEqual(STORED);
  });

  it('throws when the account is not in the session', () => {
    expect(() =>
      getCapabilities({ method: 'wallet_getCapabilities', params: [OTHER] }, session)
    ).toThrow('no active account found when getting capabilities');
  });

  it('throws when params are missing or invalid', () => {
    expect(() => getCapabilities({ method: 'wallet_getCapabilities' }, session)).toThrow();
    expect(() =>
      getCapabilities({ method: 'wallet_getCapabilities', params: ['invalid-address'] }, session)
    ).toThrow();
    expect(() =>
      getCapabilities(
        { method: 'wallet_getCapabilities', params: [ADDRESS, ['0x1', 'invalid-hex']] },
        session
      )
    ).toThrow();
  });
});
