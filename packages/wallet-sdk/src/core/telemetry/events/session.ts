import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

/**
 * The dapp disconnected, or a 4100 cleared the saved session. The 4100 comes from the wallet or
 * from this SDK's own grant checks; `wallet.request.error` tells the two apart.
 */
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
