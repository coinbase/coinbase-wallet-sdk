import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logRequestStarted = ({
  method,
  correlationId,
  isEphemeral = false,
}: {
  method: string;
  correlationId: string | undefined;
  isEphemeral?: boolean;
}) => {
  logEvent(
    'provider.request.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      signerType: 'base-account',
      correlationId,
      isEphemeral,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestError = ({
  method,
  correlationId,
  errorMessage,
  isEphemeral = false,
}: {
  method: string;
  correlationId: string | undefined;
  errorMessage: string;
  isEphemeral?: boolean;
}) => {
  logEvent(
    'provider.request.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method,
      signerType: 'base-account',
      correlationId,
      errorMessage,
      isEphemeral,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestResponded = ({
  method,
  correlationId,
  isEphemeral = false,
}: {
  method: string;
  correlationId: string | undefined;
  isEphemeral?: boolean;
}) => {
  logEvent(
    'provider.request.responded',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      signerType: 'base-account',
      correlationId,
      isEphemeral,
    },
    AnalyticsEventImportance.high
  );
};

export const logGetInjectedProviderError = ({
  errorMessage,
}: {
  errorMessage: string;
}) => {
  logEvent(
    'provider.getInjectedProvider.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method: 'getInjectedProvider',
      signerType: 'base-account',
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};
