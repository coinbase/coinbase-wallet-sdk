import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

describe('postPopup', () => {
  it('posts a message with sender, id, and content', async () => {
    const response = { id: 'resp' };
    const wire: PopupWire = {
      communicator: {
        postRequestAndWaitForResponse: vi.fn().mockResolvedValue(response),
        waitForPopupLoaded: vi.fn(),
      },
      keys: {
        exportOwnPublicKeyHex: vi.fn().mockResolvedValue('own-hex'),
      } as unknown as PopupWire['keys'],
      store: {} as PopupWire['store'],
      chainId: () => 1,
    };

    await expect(
      postPopup(wire, { handshake: { method: 'handshake', params: [] } }, 'corr')
    ).resolves.toBe(response);
    expect(wire.communicator.postRequestAndWaitForResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'corr',
        sender: 'own-hex',
        content: { handshake: { method: 'handshake', params: [] } },
      })
    );
  });
});
