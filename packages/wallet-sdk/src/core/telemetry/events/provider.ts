import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

/**
 * The interface a dapp request came through: the EIP-1193 provider, the Wallet Standard wallet,
 * or `sdk.connect()`.
 */
export type Surface = 'eip1193_provider' | 'wallet_standard' | 'sdk_connect';

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
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};
