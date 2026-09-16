import { PACKAGE_NAME, PACKAGE_VERSION } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { logDialogActionClicked, logDialogShown } from ':core/telemetry/events/dialog.js';
import { store } from ':store/store.js';
import { initDialog } from '../ui/Dialog/index.js';
import { getCrossOriginOpenerPolicy } from './checkCrossOriginOpenerPolicy.js';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 700;

const POPUP_BLOCKED_TITLE = '{app} wants to continue in Coinbase Wallet';
const POPUP_BLOCKED_MESSAGE = 'This action requires your permission to open a new window.';

export function openPopup(url: URL): Promise<Window> {
  const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
  const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;
  appendAppInfoQueryParams(url);

  function tryOpenPopup(): Window | null {
    const popupId = `wallet_${crypto.randomUUID()}`;
    const popup = window.open(
      url,
      popupId,
      `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
    );

    popup?.focus();

    if (!popup) {
      return null;
    }

    return popup;
  }

  const popup = tryOpenPopup();

  // If the popup was blocked, show a snackbar with a retry button
  if (!popup) {
    return openPopupWithDialog(tryOpenPopup);
  }

  return Promise.resolve(popup);
}

export function closePopup(popup: Window | null) {
  if (popup && !popup.closed) {
    popup.close();
  }
}

function appendAppInfoQueryParams(url: URL) {
  const params = {
    sdkName: PACKAGE_NAME,
    sdkVersion: PACKAGE_VERSION,
    origin: window.location.origin,
    coop: getCrossOriginOpenerPolicy(),
  };

  for (const [key, value] of Object.entries(params)) {
    if (!url.searchParams.has(key)) {
      url.searchParams.append(key, value.toString());
    }
  }
}

function openPopupWithDialog(tryOpenPopup: () => Window | null) {
  const dappName = store.config.get().metadata?.appName ?? 'App';
  const dialog = initDialog();
  return new Promise<Window>((resolve, reject) => {
    logDialogShown({ dialogContext: 'popup_blocked' });
    dialog.presentItem({
      title: POPUP_BLOCKED_TITLE.replace('{app}', dappName),
      message: POPUP_BLOCKED_MESSAGE,
      onClose: () => {
        logDialogActionClicked({
          dialogContext: 'popup_blocked',
          dialogAction: 'cancel',
        });
        reject(standardErrors.rpc.internal('Popup window was blocked'));
      },
      actionItems: [
        {
          text: 'Try again',
          variant: 'primary',
          onClick: () => {
            logDialogActionClicked({
              dialogContext: 'popup_blocked',
              dialogAction: 'confirm',
            });
            const popup = tryOpenPopup();
            if (popup) {
              resolve(popup);
            } else {
              reject(standardErrors.rpc.internal('Popup window was blocked'));
            }
            dialog.clear();
          },
        },
        {
          text: 'Cancel',
          variant: 'secondary',
          onClick: () => {
            logDialogActionClicked({
              dialogContext: 'popup_blocked',
              dialogAction: 'cancel',
            });
            reject(standardErrors.rpc.internal('Popup window was blocked'));
            dialog.clear();
          },
        },
      ],
    });
  });
}
