import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

/** The public SDK surface a request came through: `sdk.evm`, `sdk.solana`, or `sdk.connect`. */
export type Surface = 'evm' | 'solana' | 'connect';

type RequestMeasurement = {
  surface: Surface;
  method: string;
  correlationId: string;
};

export const logRequestStarted = ({ surface, method, correlationId }: RequestMeasurement) => {
  logEvent(
    'provider.request.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      surface,
      method,
      signerType: 'base-account',
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestError = ({
  surface,
  method,
  correlationId,
  errorCode,
  errorMessage,
}: RequestMeasurement & {
  errorCode: number | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'provider.request.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      surface,
      method,
      signerType: 'base-account',
      correlationId,
      errorCode,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestResponded = ({ surface, method, correlationId }: RequestMeasurement) => {
  logEvent(
    'provider.request.responded',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      surface,
      method,
      signerType: 'base-account',
      correlationId,
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
