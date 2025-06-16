import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

type SnackbarContext = 'popup_blocked';

export const logSnackbarShown = ({ snackbarContext }: { snackbarContext: SnackbarContext }) => {
  logEvent(
    'snackbar.shown',
    {
      action: ActionType.render,
      componentType: ComponentType.modal,
      snackbarContext,
    },
    AnalyticsEventImportance.high
  );
};
