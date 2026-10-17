import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logPaymentStarted = ({
  amount,
  testnet,
  correlationId,
}: {
  amount: string;
  testnet: boolean;
  correlationId: string | undefined;
}) => {
  logEvent(
    'payment.pay.started',
    {
      action: ActionType.process,
      componentType: ComponentType.unknown,
      method: 'pay',
      correlationId,
      signerType: 'base-account',
      amount,
      testnet,
    },
    AnalyticsEventImportance.high
  );
};

export const logPaymentError = ({
  amount,
  testnet,
  correlationId,
  errorMessage,
}: {
  amount: string;
  testnet: boolean;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'payment.pay.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method: 'pay',
      correlationId,
      signerType: 'base-account',
      amount,
      testnet,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};

export const logPaymentCompleted = ({
  amount,
  testnet,
  correlationId,
}: {
  amount: string;
  testnet: boolean;
  correlationId: string | undefined;
}) => {
  logEvent(
    'payment.pay.completed',
    {
      action: ActionType.process,
      componentType: ComponentType.unknown,
      method: 'pay',
      correlationId,
      signerType: 'base-account',
      amount,
      testnet,
    },
    AnalyticsEventImportance.high
  );
};

export const logPaymentStatusCheckStarted = ({
  testnet,
  correlationId,
}: {
  testnet: boolean;
  correlationId: string | undefined;
}) => {
  logEvent(
    'payment.status_check.started',
    {
      action: ActionType.process,
      componentType: ComponentType.unknown,
      method: 'getPaymentStatus',
      correlationId,
      signerType: 'base-account',
      testnet,
    },
    AnalyticsEventImportance.low
  );
};

export const logPaymentStatusCheckCompleted = ({
  testnet,
  status,
  correlationId,
}: {
  testnet: boolean;
  status: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'payment.status_check.completed',
    {
      action: ActionType.process,
      componentType: ComponentType.unknown,
      method: 'getPaymentStatus',
      correlationId,
      signerType: 'base-account',
      testnet,
      status,
    },
    AnalyticsEventImportance.low
  );
};

export const logPaymentStatusCheckError = ({
  testnet,
  correlationId,
  errorMessage,
}: {
  testnet: boolean;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'payment.status_check.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method: 'getPaymentStatus',
      correlationId,
      errorMessage,
      signerType: 'base-account',
      testnet,
    },
    AnalyticsEventImportance.low
  );
};
