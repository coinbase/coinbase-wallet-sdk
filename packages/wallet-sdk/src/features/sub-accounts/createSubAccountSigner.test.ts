import { createSubAccountSigner } from './createSubAccountSigner.js';
import { ACTIVE_ID_KEY, subAccountStorage } from './storage.js';
import { AddAddressResponse } from './types.js';

const params: AddAddressResponse = {
  address: '0x',
  owners: [],
  chainId: 84532,
  root: '0x',
  initCode: {
    factory: '0x',
    factoryCalldata: '0x',
  },
};

vi.mock('./state.js', () => ({
  SubAccount: {
    getState: vi.fn().mockReturnValue({
      getSigner: vi.fn().mockResolvedValue('0x1'),
      getAddress: vi.fn().mockResolvedValue('0x1'),
      type: 'webAuthn',
    }),
  },
}));

vi.mock(':stores/chain-clients/utils.js', () => ({
  getBundlerClient: vi.fn().mockResolvedValue('0x1'),
  getClient: vi.fn().mockResolvedValue('0x1'),
}));

describe('createSubAccountSigner', () => {
  it('should create a signer', async () => {
    subAccountStorage.setItem(ACTIVE_ID_KEY, '0x1');
    const signer = await createSubAccountSigner(params);
    expect(signer.request).toBeDefined();
  });
});
