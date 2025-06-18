import { logSnackbarActionClicked, logSnackbarShown } from ':core/telemetry/events/snackbar.js';
import { initSnackbar } from ':util/web.js';

export async function presentAddOwnerDialog() {
  const snackbar = initSnackbar();
  return new Promise<'authenticate' | 'cancel'>((resolve) => {
    logSnackbarShown({ snackbarContext: 'sub_account_add_owner' });
    snackbar.presentItem({
      autoExpand: true,
      message: 'App requires a signer update',
      menuItems: [
        {
          isRed: false,
          info: 'Confirm',
          svgWidth: '10',
          svgHeight: '11',
          path: '',
          defaultFillRule: 'evenodd',
          defaultClipRule: 'evenodd',
          onClick: () => {
            logSnackbarActionClicked({
              snackbarContext: 'sub_account_add_owner',
              snackbarAction: 'confirm',
            });
            snackbar.clear();
            resolve('authenticate');
          },
        },
        {
          isRed: true,
          info: 'Cancel',
          svgWidth: '10',
          svgHeight: '11',
          path: '',
          defaultFillRule: 'evenodd',
          defaultClipRule: 'evenodd',
          onClick: () => {
            logSnackbarActionClicked({
              snackbarContext: 'sub_account_add_owner',
              snackbarAction: 'cancel',
            });
            snackbar.clear();
            resolve('cancel');
          },
        },
      ],
    });
  });
}
