import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logPopupSetupStarted = () => {
  logEvent(
    'communicator.popup_setup.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
    },
    AnalyticsEventImportance.high
  );
};

export const logPopupSetupCompleted = () => {
  logEvent(
    'communicator.popup_setup.completed',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
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
