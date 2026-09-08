import type { Store } from ':store/store.js';
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

function state(opts?: { subAccount?: `0x${string}` }): Store['eip155'] {
  return {
    subAccounts: {
      get: () => (opts?.subAccount ? { address: opts.subAccount } : undefined),
      set: vi.fn(),
      clear: vi.fn(),
    },
    subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
}

describe('projectCapabilities', () => {
  it('merges gasLimitOverride onto 0x0 and returns all chains', () => {
    expect(projectCapabilities(STORED)).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      ...STORED,
    });
  });

  it('preserves stored 0x0 keys next to gasLimitOverride', () => {
    expect(
      projectCapabilities({
        '0x0': { atomicBatch: { supported: true } },
        '0x14a34': { paymasterService: { supported: true } },
      })
    ).toEqual({
      '0x0': {
        atomicBatch: { supported: true },
        gasLimitOverride: { supported: true },
      },
      '0x14a34': { paymasterService: { supported: true } },
    });
  });

  it('filters by chain id and always keeps 0x0', () => {
    expect(projectCapabilities(STORED, ['0x1', '0xa'])).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      '0x1': STORED['0x1'],
      '0xa': STORED['0xa'],
    });
  });

  it('matches padded hex filters to stored keys', () => {
    expect(projectCapabilities(STORED, ['0x01', '0x05'])).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      '0x1': STORED['0x1'],
      '0x5': STORED['0x5'],
    });
  });

  it('returns only 0x0 when the filter matches no chains', () => {
    expect(projectCapabilities(STORED, ['0x99', '0x100'])).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
    });
  });

  it('treats an empty filter as no filter', () => {
    expect(projectCapabilities(STORED, [])).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      ...STORED,
    });
  });

  it('drops non-hex keys when filtering', () => {
    expect(
      projectCapabilities(
        { '0x1': { atomicBatch: { supported: true } }, 'invalid-key': { someFeature: true } },
        ['0x1']
      )
    ).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      '0x1': { atomicBatch: { supported: true } },
    });
  });

  it('still reports 0x0 when stored capabilities are empty', () => {
    expect(projectCapabilities({})).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
    });
  });
});

describe('getCapabilities', () => {
  const session: Session = {
    scopes: {
      'eip155:1': {
        accounts: [`eip155:1:${ADDRESS}`],
        methods: [],
        capabilities: STORED['0x1'],
      },
      'eip155:5': {
        accounts: [`eip155:5:${ADDRESS}`],
        methods: [],
        capabilities: STORED['0x5'],
      },
      'eip155:10': {
        accounts: [`eip155:10:${ADDRESS}`],
        methods: [],
        capabilities: STORED['0xa'],
      },
      'eip155:8453': {
        accounts: [`eip155:8453:${ADDRESS}`],
        methods: [],
      },
    },
  };

  it('returns the projected map for a connected account', () => {
    expect(
      getCapabilities(
        state(),
        { method: 'wallet_getCapabilities', params: [ADDRESS] },
        session,
        8453
      )
    ).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      ...STORED,
    });
  });

  it('accepts a cached sub-account as the requested account', () => {
    const sub = '0x1111111111111111111111111111111111111111' as const;
    expect(
      getCapabilities(
        state({ subAccount: sub }),
        { method: 'wallet_getCapabilities', params: [sub] },
        session,
        8453
      )
    ).toEqual({
      '0x0': { gasLimitOverride: { supported: true } },
      ...STORED,
    });
  });

  it('throws when the account is not in the session', () => {
    expect(() =>
      getCapabilities(state(), { method: 'wallet_getCapabilities', params: [OTHER] }, session, 8453)
    ).toThrow('no active account found when getting capabilities');
  });

  it('throws when params are missing or invalid', () => {
    expect(() =>
      getCapabilities(state(), { method: 'wallet_getCapabilities' }, session, 8453)
    ).toThrow();
    expect(() =>
      getCapabilities(
        state(),
        { method: 'wallet_getCapabilities', params: ['invalid-address'] },
        session,
        8453
      )
    ).toThrow();
    expect(() =>
      getCapabilities(
        state(),
        { method: 'wallet_getCapabilities', params: [ADDRESS, ['0x1', 'invalid-hex']] },
        session,
        8453
      )
    ).toThrow();
  });
});
