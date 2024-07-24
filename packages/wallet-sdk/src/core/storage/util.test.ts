import { ScopedAsyncStorage } from './ScopedAsyncStorage';
import { clearAllStorage } from './util';

describe.skip('Storage - util', () => {
  beforeEach(() => localStorage.clear());

  it('@clearAllStorage should clear local storage', async () => {
    const cbwSdkStorage = new ScopedAsyncStorage('CBWSDK', 'testing');
    const wlStorage = new ScopedAsyncStorage('walletlink', 'testing');

    await cbwSdkStorage.setItem('foo', 'bar');
    await wlStorage.setItem('bar', 'foo');

    expect(localStorage.length).toBe(2);

    await clearAllStorage();

    expect(localStorage.length).toBe(0);
  });
});
