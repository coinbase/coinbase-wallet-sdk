import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent';

export function logRequestStarted({
  method,
  commerceCorrelationId,
}: {
  method: string;
  commerceCorrelationId: string | null;
}) {
  logEvent(
    'commerce.sdk.request_started',
    {
      action: ActionType.measurement,
      componentType: ComponentType.unknown,
      method,
      commerceCorrelationId: commerceCorrelationId ?? '',
    },
    AnalyticsEventImportance.high
  );
}

export function logRequestError({
  method,
  errorMessage,
  commerceCorrelationId,
}: {
  method: string;
  errorMessage: string;
  commerceCorrelationId: string | null;
}) {
  logEvent(
    'commerce.sdk.request_error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method,
      errorMessage,
      commerceCorrelationId: commerceCorrelationId ?? '',
    },
    AnalyticsEventImportance.high
  );
}

export function logRequestCompleted({
  method,
  commerceCorrelationId,
}: {
  method: string;
  commerceCorrelationId: string | null;
}) {
  logEvent(
    'commerce.sdk.request_completed',
    {
      action: ActionType.measurement,
      componentType: ComponentType.unknown,
      method,
      commerceCorrelationId: commerceCorrelationId ?? '',
    },
    AnalyticsEventImportance.high
  );
}
