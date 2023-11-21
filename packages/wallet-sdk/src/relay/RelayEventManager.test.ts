import { RelayEventManager } from './RelayEventManager';

describe('WalletSDKRelayEventManager', () => {
  test('@makeRequestId', () => {
    const sdkRelayEventManager = new RelayEventManager();
    expect(sdkRelayEventManager.makeRequestId()).toEqual(1);
    expect(sdkRelayEventManager.makeRequestId()).toEqual(2);
    expect(sdkRelayEventManager.makeRequestId()).toEqual(3);
  });
});
