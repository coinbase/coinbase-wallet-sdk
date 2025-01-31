import { createStorage } from './storage.js';

describe('createStorage', () => {
  it('should create an indexedDB storage', () => {
    const storage = createStorage('test', 'test');
    expect(storage).toBeDefined();
  });

  it('getItem', async () => {
    const storage = createStorage('test', 'test');
    await storage.setItem('foo', 'bar');
    expect(await storage.getItem('foo')).toEqual('bar');
  });

  it('setItem', async () => {
    const storage = createStorage('test', 'test');
    await storage.setItem('foo', 'bar');
    expect(await storage.getItem('foo')).toEqual('bar');
  });

  it('removeItem', async () => {
    const storage = createStorage('test', 'test');
    await storage.setItem('foo', 'bar');
    await storage.removeItem('foo');
    expect(await storage.getItem('foo')).toEqual(null);
  });
});
