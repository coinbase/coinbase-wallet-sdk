import { createSubAccountSigner } from './createSubAccountSigner.js';
import { idb } from './cryptokeys/storage.js';
import { AddAddressResponse } from './types.js';
import { ACTIVE_SUB_ACCOUNT_ID_KEY, SCWStateManager } from ':sign/scw/SCWStateManager.js';

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

vi.mock(':features/clients/utils.js', () => ({
  getBundlerClient: vi.fn().mockResolvedValue('0x1'),
  getClient: vi.fn().mockResolvedValue('0x1'),
}));

describe('createSubAccountSigner', () => {
  it('should create a signer', async () => {
    SCWStateManager.setItem(ACTIVE_SUB_ACCOUNT_ID_KEY, '0x1');
    idb.setItem('0x1', { keypair: { privateKey: '0x', publicKey: '0x' } });
    const signer = await createSubAccountSigner(params);
    expect(signer.request).toBeDefined();
  });
});
