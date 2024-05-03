import { fetchSignerType } from './SignHandler';
import { Communicator } from ':core/communicator/Communicator';

const communicator = new Communicator();
const mockPostMessage = jest.fn();
communicator.postMessage = mockPostMessage;

describe('SignerConfigurator', () => {
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
});
