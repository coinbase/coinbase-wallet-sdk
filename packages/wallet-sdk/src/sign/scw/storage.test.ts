import { scwSignerStorage } from './storage.js';

describe('scwSignerStorage', () => {
  it('should set and get items', () => {
    scwSignerStorage.setItem('foo', 'bar');
    expect(scwSignerStorage.getItem('foo')).toEqual('bar');
  });
});
