import { KeyManager } from ':core/transport/crypto/index.js';
import { bindStore, createStoreInstance } from ':store/store.js';
import { decryptPopup } from './decrypt.js';
import { handshake } from './handshake.js';
import { postPopup } from './post.js';
import type { PopupWire } from './types.js';

vi.mock('./post.js', () => ({ postPopup: vi.fn() }));
vi.mock('./decrypt.js', () => ({ decryptPopup: vi.fn() }));

const postPopupMock = vi.mocked(postPopup);
const decryptPopupMock = vi.mocked(decryptPopup);
const RESPONSE_ID = '00000000-0000-4000-8000-000000000001';
const REQUEST_ID = '00000000-0000-4000-8000-000000000002';

function wire(): PopupWire {
  return {
    communicator: {
      postRequestAndWaitForResponse: vi.fn(),
      waitForPopupLoaded: vi.fn().mockResolvedValue(undefined),
    },
    keys: new KeyManager(bindStore(createStoreInstance({ persist: false })).keys),
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
      id: RESPONSE_ID,
      requestId: REQUEST_ID,
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
      id: RESPONSE_ID,
      requestId: REQUEST_ID,
      correlationId: undefined,
      sender: 'peer-hex',
      timestamp: new Date(),
      content: { failure },
    });

    await expect(handshake(w)).rejects.toEqual(failure);
    expect(decryptPopupMock).not.toHaveBeenCalled();
  });
});
