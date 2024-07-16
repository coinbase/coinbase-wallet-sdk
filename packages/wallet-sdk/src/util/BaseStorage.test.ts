import { browserStorageAdapter } from './BaseStorage';

describe('BaseStorage', () => {
  describe('browser storage adapter', () => {
    const storage = browserStorageAdapter(localStorage);

    afterEach(() => localStorage.clear());

    test('get', () => {
      localStorage.setItem('foo', 'bar');

      const value = storage.get('foo');
      expect(value).toBe('bar');
    });

    test('set', () => {
      storage.set('foo1', 'bar1');

      expect(localStorage.getItem('foo1')).toBe('bar1');
    });

    test('delete', () => {
      localStorage.setItem('foo2', 'bar2');

      storage.delete('foo2');
      expect(storage.get('foo2')).toBe(null);
    });

    test('getAllKeys', () => {
      localStorage.setItem('foo3', 'bar3');
      localStorage.setItem('foo4', 'bar4');
      localStorage.setItem('foo5', 'bar5');

      const value = storage.getAllKeys();
      expect(value).toStrictEqual(['foo3', 'foo4', 'foo5']);
    });
  });
});
