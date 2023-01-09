import { WalletSDKRelayEventManager } from "./WalletSDKRelayEventManager";

describe("WalletSDKRelayEventManager", () => {
  test("@makeRequestId", () => {
    const sdkRelayEventManager = new WalletSDKRelayEventManager();
    expect(sdkRelayEventManager.makeRequestId()).toEqual(1);
    expect(sdkRelayEventManager.makeRequestId()).toEqual(2);
    expect(sdkRelayEventManager.makeRequestId()).toEqual(3);
  });
});
