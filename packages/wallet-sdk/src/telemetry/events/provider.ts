import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent';

export function logRequestStarted({ method }: { method: string }) {
  logEvent(
    'commerce.sdk.request_started',
    {
      action: ActionType.measurement,
      componentType: ComponentType.unknown,
      method,
    },
    AnalyticsEventImportance.high
  );
}

export function logRequestError({
  method,
  errorMessage,
}: {
  method: string;
  errorMessage: string;
}) {
  logEvent(
    'commerce.sdk.request_error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
}

export function logRequestCompleted({ method }: { method: string }) {
  logEvent(
    'commerce.sdk.request_completed',
    {
      action: ActionType.measurement,
      componentType: ComponentType.unknown,
      method,
    },
    AnalyticsEventImportance.high
  );
}
