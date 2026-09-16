import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export type SpendPermissionUtilType =
  | 'fetchPermission'
  | 'fetchPermissions'
  | 'getHash'
  | 'getPermissionStatus'
  | 'prepareRevokeCallData'
  | 'prepareSpendCallData'
  | 'requestRevoke'
  | 'requestSpendPermission';

export const logSpendPermissionUtilStarted = (functionName: SpendPermissionUtilType) => {
  logEvent(
    `spend_permission_utils.${functionName}.started`,
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
    },
    AnalyticsEventImportance.high
  );
};

export const logSpendPermissionUtilCompleted = (functionName: SpendPermissionUtilType) => {
  logEvent(
    `spend_permission_utils.${functionName}.completed`,
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
    },
    AnalyticsEventImportance.high
  );
};

export const logSpendPermissionUtilError = (
  functionName: SpendPermissionUtilType,
  errorMessage: string
) => {
  logEvent(
    `spend_permission_utils.${functionName}.error`,
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};
