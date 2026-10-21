import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

/**
 * One message to the wallet and its answer: the handshake, `wallet_createSession`, or
 * `wallet_invokeMethod`. `correlationId` is the dapp request's, also sent on the message.
 */
type WalletRequest = {
  method: string;
  correlationId: string;
};

export const logWalletRequestCompleted = ({ method, correlationId }: WalletRequest) => {
  logEvent(
    'wallet.request.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logWalletRequestError = ({
  method,
  correlationId,
  errorCode,
  errorMessage,
}: WalletRequest & {
  errorCode: number | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'wallet.request.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method,
      correlationId,
      errorCode,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};
