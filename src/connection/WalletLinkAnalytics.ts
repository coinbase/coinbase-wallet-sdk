import { WalletLinkAnalyticsAbstract } from "../init";

export class WalletLinkAnalytics implements WalletLinkAnalyticsAbstract {
    sendEvent(_eventType: string, _eventProperties?: any): void {
        // no-op
    }
}
