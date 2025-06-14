import { UUID } from 'crypto';
import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logHandshakeStarted = (method: string, correlationId: UUID) => {
  logEvent(
    'scw-signer.handshake.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logHandshakeError = (method: string, correlationId: UUID, errorMessage: string) => {
  logEvent(
    'scw-signer.handshake.error',
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

export const logHandshakeCompleted = (method: string, correlationId: UUID) => {
  logEvent(
    'scw-signer.handshake.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestStarted = (method: string, correlationId: UUID) => {
  logEvent(
    'scw-signer.request.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestError = (method: string, correlationId: UUID, errorMessage: string) => {
  logEvent(
    'scw-signer.request.error',
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

export const logRequestCompleted = (method: string, correlationId: UUID) => {
  logEvent(
    'scw-signer.request.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};
