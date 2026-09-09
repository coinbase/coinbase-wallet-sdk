import {
  logDialogActionClicked,
  logDialogDismissed,
  logDialogShown,
} from ':core/telemetry/events/dialog.js';
import { store } from ':store/store.js';
import { initDialog } from ':ui/Dialog/index.js';

export async function presentAddOwnerDialog() {
  const appName = store.config.get().metadata?.appName ?? 'App';
  const dialog = initDialog();
  return new Promise<'authenticate' | 'cancel'>((resolve) => {
    logDialogShown({ dialogContext: 'sub_account_add_owner' });
    dialog.presentItem({
      title: `Re-authorize ${appName}`,
      message: `${appName} has lost access to your account. Please sign at the next step to re-authorize ${appName}`,
      onClose: () => {
        logDialogDismissed({ dialogContext: 'sub_account_add_owner' });
        resolve('cancel');
      },
      actionItems: [
        {
          text: 'Continue',
          variant: 'primary',
          onClick: () => {
            logDialogActionClicked({
              dialogContext: 'sub_account_add_owner',
              dialogAction: 'confirm',
            });
            dialog.clear();
            resolve('authenticate');
          },
        },
        {
          text: 'Not now',
          variant: 'secondary',
          onClick: () => {
            logDialogActionClicked({
              dialogContext: 'sub_account_add_owner',
              dialogAction: 'cancel',
            });
            dialog.clear();
            resolve('cancel');
          },
        },
      ],
    });
  });
}
