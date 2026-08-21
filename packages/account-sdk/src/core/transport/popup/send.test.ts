import { encrypt } from ':core/transport/crypto/index.js';
import { decryptPopup } from './decrypt.js';
import { postPopup } from './post.js';
import { send } from './send.js';
import type { PopupWire } from './types.js';

vi.mock(':core/transport/crypto/index.js', () => ({
  encrypt: vi.fn(),
}));
vi.mock('./post.js', () => ({ postPopup: vi.fn() }));
vi.mock('./decrypt.js', () => ({ decryptPopup: vi.fn() }));

const encryptMock = vi.mocked(encrypt);
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
    keys: {} as PopupWire['keys'],
    store: {} as PopupWire['store'],
    chainId: () => 8453,
  };
}

describe('send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts v1 { action, chainId }, posts, and returns the decrypted value', async () => {
    const w = wire();
    const request = { method: 'personal_sign', params: ['0x01'] };
    const encrypted = { iv: new Uint8Array([1]), cipherText: new ArrayBuffer(0) };
    encryptMock.mockResolvedValue(encrypted);
    postPopupMock.mockResolvedValue({
      id: RESPONSE_ID,
      requestId: REQUEST_ID,
      correlationId: undefined,
      sender: 'peer',
      timestamp: new Date(),
      content: { encrypted },
    });
    decryptPopupMock.mockResolvedValue({ result: { value: '0xsig' } });

    await expect(send(w, request)).resolves.toBe('0xsig');
    expect(encryptMock).toHaveBeenCalledWith(w.keys, { action: request, chainId: 8453 });
    expect(postPopupMock).toHaveBeenCalledWith(w, { encrypted }, undefined);
  });

  it('throws a decrypted RPC error', async () => {
    const w = wire();
    encryptMock.mockResolvedValue({ iv: new Uint8Array(), cipherText: new ArrayBuffer(0) });
    postPopupMock.mockResolvedValue({
      id: RESPONSE_ID,
      requestId: REQUEST_ID,
      correlationId: undefined,
      sender: 'peer',
      timestamp: new Date(),
      content: { encrypted: { iv: new Uint8Array(), cipherText: new ArrayBuffer(0) } },
    });
    decryptPopupMock.mockResolvedValue({
      result: { error: { code: -32000, message: 'fail' } },
    });

    await expect(send(w, { method: 'eth_accounts' })).rejects.toEqual({
      code: -32000,
      message: 'fail',
    });
  });
});
