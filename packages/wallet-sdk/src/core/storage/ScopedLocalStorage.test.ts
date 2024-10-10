import { ScopedLocalStorage } from './ScopedLocalStorage.js';

describe('ScopedLocalStorage', () => {
  describe('public methods', () => {
    afterEach(() => localStorage.clear());

    const scopedLocalStorage = new ScopedLocalStorage('CBWSDK', 'testing');
    test('@setItem', () => {
      scopedLocalStorage.setItem('foo', 'bar');

      expect(localStorage.getItem('-CBWSDK:testing:foo')).toEqual('bar');
      expect(localStorage.length).toEqual(1);
    });

    test('@getItem', () => {
      scopedLocalStorage.setItem('foo', 'bar');
      const getVal = scopedLocalStorage.getItem('foo');

      expect(getVal).toEqual('bar');
    });

    test('@removeItem', () => {
      scopedLocalStorage.removeItem('foo');

      expect(localStorage.length).toEqual(0);
    });

    test('@clear', () => {
      scopedLocalStorage.setItem('foo1', 'bar1');
      scopedLocalStorage.setItem('foo2', 'bar2');
      scopedLocalStorage.setItem('foo3', 'bar3');
      expect(localStorage.length).toEqual(3);

      scopedLocalStorage.clear();
      expect(localStorage.length).toEqual(0);
    });
  });
});
