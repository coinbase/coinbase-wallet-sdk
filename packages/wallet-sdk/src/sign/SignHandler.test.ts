import { fetchSignerType, loadSignerType } from './SignHandler';
import { Communicator } from ':core/communicator/Communicator';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const communicator = new Communicator();
const mockPostMessage = jest.fn();
communicator.postMessage = mockPostMessage;

describe('SignerConfigurator', () => {
  const testStorage = new ScopedLocalStorage('CBWSDK');

  afterEach(() => {
    testStorage.clear();
  });

  describe('handshake', () => {
    it('should complete signerType selection correctly', async () => {
      mockPostMessage.mockResolvedValueOnce({
        data: 'scw',
      });

      const signerType = await fetchSignerType({
        communicator,
        preference: { options: 'all' },
        metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      });
      expect(signerType).toEqual('scw');
    });
  });

  it('should load signer from storage when available', async () => {
    testStorage.setItem('SignerType', 'scw');
    const signerType = loadSignerType();
    expect(signerType).toEqual('scw');
  });

  it('should return null if signer is not stored', async () => {
    const signerType = loadSignerType();
    expect(signerType).toBeNull();
  });
});
