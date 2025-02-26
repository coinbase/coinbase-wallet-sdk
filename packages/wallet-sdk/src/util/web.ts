import { NAME, VERSION } from '../sdk-info.js';
import { getCrossOriginOpenerPolicy } from './checkCrossOriginOpenerPolicy.js';
import { standardErrors } from ':core/error/errors.js';
import { Snackbar } from ':sign/walletlink/relay/ui/components/Snackbar/Snackbar.js';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

const RETRY_BUTTON = {
  isRed: false,
  info: 'Retry',
  svgWidth: '10',
  svgHeight: '11',
  path: 'M5.00008 0.96875C6.73133 0.96875 8.23758 1.94375 9.00008 3.375L10.0001 2.375V5.5H9.53133H7.96883H6.87508L7.80633 4.56875C7.41258 3.3875 6.31258 2.53125 5.00008 2.53125C3.76258 2.53125 2.70633 3.2875 2.25633 4.36875L0.812576 3.76875C1.50008 2.125 3.11258 0.96875 5.00008 0.96875ZM2.19375 6.43125C2.5875 7.6125 3.6875 8.46875 5 8.46875C6.2375 8.46875 7.29375 7.7125 7.74375 6.63125L9.1875 7.23125C8.5 8.875 6.8875 10.0312 5 10.0312C3.26875 10.0312 1.7625 9.05625 1 7.625L0 8.625V5.5H0.46875H2.03125H3.125L2.19375 6.43125Z',
  defaultFillRule: 'evenodd',
  defaultClipRule: 'evenodd',
} as const;

const POPUP_BLOCKED_MESSAGE = 'Popup was blocked. Try again.';

let snackbar: Snackbar | null = null;

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

  let popup = tryOpenPopup();

  // If the popup was blocked, show a snackbar with a retry button
  if (!popup) {
    const sb = initSnackbar();
    return new Promise<Window>((resolve, reject) => {
      sb.presentItem({
        autoExpand: true,
        message: POPUP_BLOCKED_MESSAGE,
        menuItems: [
          {
            ...RETRY_BUTTON,
            onClick: () => {
              popup = tryOpenPopup();
              if (popup) {
                resolve(popup);
              } else {
                reject(standardErrors.rpc.internal('Popup window was blocked'));
              }
              sb.clear();
            },
          },
        ],
      });
    });
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
    sdkName: NAME,
    sdkVersion: VERSION,
    origin: window.location.origin,
    coop: getCrossOriginOpenerPolicy(),
  };

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value.toString());
  }
}

function initSnackbar() {
  if (!snackbar) {
    const root = document.createElement('div');
    root.className = '-cbwsdk-css-reset';
    document.body.appendChild(root);
    snackbar = new Snackbar();
    snackbar.attach(root);
  }
  return snackbar;
}
