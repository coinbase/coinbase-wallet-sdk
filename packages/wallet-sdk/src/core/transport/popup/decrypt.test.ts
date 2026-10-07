import { decrypt } from ':core/transport/crypto/index.js';
import { decryptPopup } from './decrypt.js';
import type { PopupWire } from './types.js';

vi.mock(':core/transport/crypto/index.js', () => ({
  decrypt: vi.fn(),
}));

const decryptMock = vi.mocked(decrypt);
const RESPONSE_ID = '00000000-0000-4000-8000-000000000001';
const REQUEST_ID = '00000000-0000-4000-8000-000000000002';

describe('decryptPopup', () => {
  const wire = {
    keys: {},
  } as unknown as PopupWire;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decrypts ciphertext without projecting namespace state', async () => {
    const encrypted = { iv: new Uint8Array(), cipherText: new ArrayBuffer(0) };
    const response = { result: { value: 'ok' }, data: { chains: { 1: 'https://x' } } };
    decryptMock.mockResolvedValue(response);

    await expect(
      decryptPopup(wire, {
        id: RESPONSE_ID,
        requestId: REQUEST_ID,
        correlationId: undefined,
        sender: 'peer',
        timestamp: new Date(),
        content: { encrypted },
      })
    ).resolves.toEqual(response);
    expect(decryptMock).toHaveBeenCalledWith(wire.keys, encrypted);
  });

  it('throws a failure payload without decrypting', async () => {
    const failure = { code: 4001, message: 'rejected' };
    await expect(
      decryptPopup(wire, {
        id: RESPONSE_ID,
        requestId: REQUEST_ID,
        correlationId: undefined,
        sender: 'peer',
        timestamp: new Date(),
        content: { failure },
      })
    ).rejects.toEqual(failure);
    expect(decryptMock).not.toHaveBeenCalled();
  });
});
