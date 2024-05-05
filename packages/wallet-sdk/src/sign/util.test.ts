import { fetchSignerType } from './util';
import { Communicator } from ':core/communicator/Communicator';
import { Preference } from ':core/provider/interface';

const communicator = new Communicator();
const mockPostMessage = jest.fn();
communicator.postMessage = mockPostMessage;

describe('SignerConfigurator', () => {
  describe('handshake', () => {
    const metadata = { appName: 'Test App', appLogoUrl: null, appChainIds: [1] };
    const preference: Preference = { options: 'all' };

    it('should complete signerType selection correctly', async () => {
      mockPostMessage.mockResolvedValueOnce({
        data: 'scw',
      });
      const signerType = await fetchSignerType({
        communicator,
        preference,
        metadata,
      });
      expect(signerType).toEqual('scw');
    });
  });
});
