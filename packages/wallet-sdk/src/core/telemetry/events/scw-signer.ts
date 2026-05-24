import { store } from ':store/store.js';
import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logHandshakeStarted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_signer.handshake.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      enableAutoSubAccounts: store.subAccountsConfig.get()?.enableAutoSubAccounts,
    },
    AnalyticsEventImportance.high
  );
};

export const logHandshakeError = ({
  method,
  correlationId,
  errorMessage,
}: {
  method: string;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'scw_signer.handshake.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      errorMessage,
      enableAutoSubAccounts: store.subAccountsConfig.get()?.enableAutoSubAccounts,
    },
    AnalyticsEventImportance.high
  );
};

export const logHandshakeCompleted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_signer.handshake.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      enableAutoSubAccounts: store.subAccountsConfig.get()?.enableAutoSubAccounts,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestStarted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_signer.request.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      enableAutoSubAccounts: store.subAccountsConfig.get()?.enableAutoSubAccounts,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestError = ({
  method,
  correlationId,
  errorMessage,
}: {
  method: string;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'scw_signer.request.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      errorMessage,
      enableAutoSubAccounts: store.subAccountsConfig.get()?.enableAutoSubAccounts,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestCompleted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_signer.request.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      enableAutoSubAccounts: store.subAccountsConfig.get()?.enableAutoSubAccounts,
    },
    AnalyticsEventImportance.high
  );
};
