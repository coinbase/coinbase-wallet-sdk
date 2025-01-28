import {
  ACTIVE_SUB_ACCOUNT_ID_KEY,
  getSubAccountFromStorage,
  SCWStateManager,
  SUB_ACCOUNTS_KEY,
} from './SCWStateManager.js';

describe('SCWStateManager', () => {
  it('should set and get items', () => {
    SCWStateManager.setItem('foo', 'bar');
    expect(SCWStateManager.getItem('foo')).toEqual('bar');
  });
});

describe('getSubAccountFromStorage', () => {
  it('should return null if no active sub account id is set', () => {
    expect(getSubAccountFromStorage()).toEqual(null);
  });

  it('should return the sub account if the active sub account id is set', () => {
    SCWStateManager.setItem(ACTIVE_SUB_ACCOUNT_ID_KEY, '0x123');
    SCWStateManager.storeObject(SUB_ACCOUNTS_KEY, { '0x123': { address: '0x123' } });
    expect(getSubAccountFromStorage()).toEqual({ address: '0x123' });
  });
});
