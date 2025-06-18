import { store } from ':store/store.js';
import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logSubAccountRequestStarted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_sub_account.request.started',
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

export const logSubAccountRequestCompleted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_sub_account.request.completed',
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

export const logSubAccountRequestError = ({
  method,
  correlationId,
  errorMessage,
}: {
  method: string;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'scw_sub_account.request.error',
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

export const logAddOwnerStarted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_sub_account.add_owner.started',
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

export const logAddOwnerCompleted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_sub_account.add_owner.completed',
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

export const logAddOwnerError = ({
  method,
  correlationId,
  errorMessage,
}: {
  method: string;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'scw_sub_account.add_owner.error',
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

export const logInsufficientBalanceErrorHandlingStarted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_sub_account.insufficient_balance.error_handling.started',
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

export const logInsufficientBalanceErrorHandlingCompleted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'scw_sub_account.insufficient_balance.error_handling.completed',
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

export const logInsufficientBalanceErrorHandlingError = ({
  method,
  correlationId,
  errorMessage,
}: {
  method: string;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'scw_sub_account.insufficient_balance.error_handling.error',
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
