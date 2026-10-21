import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

/**
 * `coop` is the page's Cross-Origin-Opener-Policy. `same-origin` blocks the popup's messages, so a
 * setup that starts and never completes usually shows it.
 */
type PopupSetup = { coop: string };

export const logPopupSetupStarted = ({ coop }: PopupSetup) => {
  logEvent(
    'communicator.popup_setup.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      coop,
    },
    AnalyticsEventImportance.high
  );
};

export const logPopupSetupCompleted = ({ coop }: PopupSetup) => {
  logEvent(
    'communicator.popup_setup.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      coop,
    },
    AnalyticsEventImportance.high
  );
};

export const logPopupUnloadReceived = () => {
  logEvent(
    'communicator.popup_unload.received',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
    },
    AnalyticsEventImportance.high
  );
};
