import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent';

type Provider = 'extension' | 'walletlink';

export function logProviderReturned(provider: Provider) {
  logEvent(
    'commerce.sdk.provider_returned',
    {
      action: ActionType.measurement,
      componentType: ComponentType.unknown,
      provider,
    },
    AnalyticsEventImportance.high
  );
}

