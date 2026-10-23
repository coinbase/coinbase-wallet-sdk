import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

type DialogContext = 'popup_blocked';

export const logDialogShown = ({ dialogContext }: { dialogContext: DialogContext }) => {
  logEvent(
    `dialog.${dialogContext}.shown`,
    {
      action: ActionType.render,
      componentType: ComponentType.modal,
      dialogContext,
    },
    AnalyticsEventImportance.high
  );
};

type DialogAction = 'confirm' | 'cancel';

export const logDialogActionClicked = ({
  dialogContext,
  dialogAction,
}: {
  dialogContext: DialogContext;
  dialogAction: DialogAction;
}) => {
  logEvent(
    `dialog.${dialogContext}.action_clicked`,
    {
      action: ActionType.click,
      componentType: ComponentType.button,
      dialogContext,
      dialogAction,
    },
    AnalyticsEventImportance.high
  );
};
