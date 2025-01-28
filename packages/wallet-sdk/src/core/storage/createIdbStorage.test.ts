import { createIdbStorage } from './createIdbStorage.js';

describe('createIdbStorage', () => {
  it('should create an indexedDB storage', () => {
    const storage = createIdbStorage('test', 'test');
    expect(storage).toBeDefined();
  });

  it('getItem', async () => {
    const storage = createIdbStorage('test', 'test');
    await storage.setItem('foo', 'bar');
    expect(await storage.getItem('foo')).toEqual('bar');
  });

  it('setItem', async () => {
    const storage = createIdbStorage('test', 'test');
    await storage.setItem('foo', 'bar');
    expect(await storage.getItem('foo')).toEqual('bar');
  });

  it('removeItem', async () => {
    const storage = createIdbStorage('test', 'test');
    await storage.setItem('foo', 'bar');
    await storage.removeItem('foo');
    expect(await storage.getItem('foo')).toEqual(null);
  });
});
