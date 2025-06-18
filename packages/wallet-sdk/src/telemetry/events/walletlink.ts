import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent';

export const logWalletLinkConnectionConnectionFailed = () => {
  logEvent(
    'commerce.walletlink_connection.connection_failed',
    {
      action: ActionType.measurement,
      componentType: ComponentType.unknown,
    },
    AnalyticsEventImportance.high
  );
};

export const logWalletLinkConnectionFetchUnseenEventsFailed = () => {
  logEvent(
    'commerce.walletlink_connection.fetch_unseen_events_failed',
    {
      action: ActionType.measurement,
      componentType: ComponentType.unknown,
    },
    AnalyticsEventImportance.high
  );
};