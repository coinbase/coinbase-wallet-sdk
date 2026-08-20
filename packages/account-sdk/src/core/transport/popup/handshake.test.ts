import { KeyManager } from ':core/transport/crypto/index.js';
import { createStoreInstance } from ':store/store.js';
import { decryptPopup } from './decrypt.js';
import { handshake } from './handshake.js';
import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

vi.mock('./post.js', () => ({ postPopup: vi.fn() }));
vi.mock('./decrypt.js', () => ({ decryptPopup: vi.fn() }));

const postPopupMock = vi.mocked(postPopup);
const decryptPopupMock = vi.mocked(decryptPopup);

function wire(): PopupWire {
  return {
    communicator: {
      postRequestAndWaitForResponse: vi.fn(),
      waitForPopupLoaded: vi.fn().mockResolvedValue(undefined),
    },
    keys: new KeyManager(createStoreInstance({ persist: false })),
    store: {} as PopupWire['store'],
    chainId: () => 1,
  };
}

describe('handshake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts a plaintext handshake then stores the peer key', async () => {
    const w = wire();
    const setPeer = vi.spyOn(w.keys, 'setPeerPublicKeyFromHex').mockResolvedValue(undefined);
    postPopupMock.mockResolvedValue({
      id: 'resp',
      requestId: 'req',
      correlationId: undefined,
      sender: 'peer-hex',
      timestamp: new Date(),
      content: { encrypted: { iv: new Uint8Array(), cipherText: new ArrayBuffer(0) } },
    });
    decryptPopupMock.mockResolvedValue({ result: { value: null } });

    await handshake(w, { method: 'handshake' });

    expect(w.communicator.waitForPopupLoaded).toHaveBeenCalled();
    expect(postPopupMock).toHaveBeenCalledWith(
      w,
      { handshake: { method: 'handshake', params: [] } },
      undefined
    );
    expect(setPeer).toHaveBeenCalledWith('peer-hex');
    expect(decryptPopupMock).toHaveBeenCalled();
  });

  it('throws a handshake failure without decrypting', async () => {
    const w = wire();
    const failure = { code: 4001, message: 'rejected' };
    postPopupMock.mockResolvedValue({
      id: 'resp',
      requestId: 'req',
      correlationId: undefined,
      sender: 'peer-hex',
      timestamp: new Date(),
      content: { failure },
    });

    await expect(handshake(w)).rejects.toEqual(failure);
    expect(decryptPopupMock).not.toHaveBeenCalled();
  });
});
