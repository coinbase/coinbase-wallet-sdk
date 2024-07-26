import { ScopedAsyncStorage } from './ScopedAsyncStorage';

describe('ScopedAsyncStorage', () => {
  describe('public methods', () => {
    afterEach(() => localStorage.clear());

    const scopedAsyncStorage = new ScopedAsyncStorage('CBWSDK', 'testing');
    test('@setItem', async () => {
      await scopedAsyncStorage.setItem('foo', 'bar');

      expect(localStorage.getItem('-CBWSDK:testing:foo')).toEqual('bar');
      expect(localStorage.length).toEqual(1);
    });

    test('@getItem', async () => {
      await scopedAsyncStorage.setItem('foo', 'bar');
      const getVal = await scopedAsyncStorage.getItem('foo');

      expect(getVal).toEqual('bar');
    });

    test('@removeItem', async () => {
      await scopedAsyncStorage.removeItem('foo');

      expect(localStorage.length).toEqual(0);
    });

    test('@clear', async () => {
      await scopedAsyncStorage.setItem('foo1', 'bar1');
      await scopedAsyncStorage.setItem('foo2', 'bar2');
      await scopedAsyncStorage.setItem('foo3', 'bar3');
      expect(localStorage.length).toEqual(3);

      await scopedAsyncStorage.clear();
      expect(localStorage.length).toEqual(0);
    });
  });
});
