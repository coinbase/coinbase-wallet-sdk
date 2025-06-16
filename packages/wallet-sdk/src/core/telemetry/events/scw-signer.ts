import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logHandshakeStarted = (method: string, correlationId: string) => {
  logEvent(
    'scw_signer.handshake.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logHandshakeError = (method: string, correlationId: string, errorMessage: string) => {
  logEvent(
    'scw_signer.handshake.error',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};

export const logHandshakeCompleted = (method: string, correlationId: string) => {
  logEvent(
    'scw_signer.handshake.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestStarted = (method: string, correlationId: string) => {
  logEvent(
    'scw_signer.request.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestError = (method: string, correlationId: string, errorMessage: string) => {
  logEvent(
    'scw_signer.request.error',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestCompleted = (method: string, correlationId: string) => {
  logEvent(
    'scw_signer.request.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};
