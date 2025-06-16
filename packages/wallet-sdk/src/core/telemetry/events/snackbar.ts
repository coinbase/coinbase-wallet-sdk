import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

type SnackbarContext =
  | 'popup_blocked'
  | 'sub_account_add_owner'
  | 'sub_account_insufficient_balance';

export const logSnackbarShown = ({ snackbarContext }: { snackbarContext: SnackbarContext }) => {
  logEvent(
    `snackbar.${snackbarContext}.shown`,
    {
      action: ActionType.render,
      componentType: ComponentType.modal,
      snackbarContext,
    },
    AnalyticsEventImportance.high
  );
};

type GenericSnackbarAction = 'confirm' | 'cancel';
type SubAccountInsufficientBalanceSnackbarAction = 'create_permission' | 'continue_in_popup';

export const logSnackbarActionClicked = ({
  snackbarContext,
  snackbarAction,
}: {
  snackbarContext: SnackbarContext;
  snackbarAction: GenericSnackbarAction | SubAccountInsufficientBalanceSnackbarAction;
}) => {
  logEvent(
    `snackbar.${snackbarContext}.action_clicked`,
    {
      action: ActionType.click,
      componentType: ComponentType.button,
      snackbarContext,
      snackbarAction,
    },
    AnalyticsEventImportance.high
  );
};
