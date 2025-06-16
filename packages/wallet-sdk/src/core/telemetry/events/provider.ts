import { SignerType } from ':core/message/ConfigMessage.js';
import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logSignerLoadedFromStorage = (signerType: SignerType) => {
  logEvent(
    'provider.signer.loaded_from_storage',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      signerType,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestStarted = (method: string, correlationId: string) => {
  logEvent(
    'provider.request.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestError = (
  method: string,
  correlationId: string,
  signerType: SignerType | undefined,
  errorMessage: string
) => {
  logEvent(
    'provider.request.error',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      signerType,
      correlationId,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestResponded = (
  method: string,
  signerType: SignerType | undefined,
  correlationId: string
) => {
  logEvent(
    'provider.request.responded',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      signerType,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};
