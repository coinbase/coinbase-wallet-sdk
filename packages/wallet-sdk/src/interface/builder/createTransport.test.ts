import { createPopupTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import type { OpenFn } from ':util/web.js';
import { createTransport } from './createTransport.js';

vi.mock(':core/transport/index.js', () => ({
  createPopupTransport: vi.fn(() => ({ transport: true })),
}));

const options = {
  metadata: { appName: 'Test', appLogoUrl: null, appChainIds: [8453] },
  preference: { telemetry: false },
};

describe('createTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes only key and session accessors to the popup transport', () => {
    const store = { keys: {}, session: {} } as Store;
    const transport = createTransport(options, store);
    const popupOptions = vi.mocked(createPopupTransport).mock.calls[0]?.[0];

    expect(transport).toEqual({ transport: true });
    expect(popupOptions).toEqual({
      ...options,
      openFn: undefined,
      keys: store.keys,
      session: store.session,
    });
    expect(popupOptions).not.toHaveProperty('store');
  });

  it('forwards the custom open function to the popup transport', () => {
    const store = { keys: {}, session: {} } as Store;
    const openFn: OpenFn = vi.fn();

    createTransport(options, store, openFn);

    expect(createPopupTransport).toHaveBeenCalledWith(expect.objectContaining({ openFn }));
  });
});
