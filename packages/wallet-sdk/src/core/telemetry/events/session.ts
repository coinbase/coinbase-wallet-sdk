import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

/** The dapp disconnected, or a 4100 from the wallet or this SDK's own grant checks cleared it. */
type ClearReason = 'user_disconnect' | 'unauthorized';

export const logSessionCleared = ({ clearReason }: { clearReason: ClearReason }) => {
  logEvent(
    'session.cleared',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      clearReason,
    },
    AnalyticsEventImportance.high
  );
};
