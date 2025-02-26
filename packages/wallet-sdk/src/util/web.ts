import { NAME, VERSION } from '../sdk-info.js';
import { getCrossOriginOpenerPolicy } from './checkCrossOriginOpenerPolicy.js';
import { standardErrors } from ':core/error/errors.js';
import { Snackbar } from ':sign/walletlink/relay/ui/components/Snackbar/Snackbar.js';
import { RETRY_SVG_PATH } from ':sign/walletlink/relay/ui/WalletLinkRelayUI.js';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

const RETRY_BUTTON = {
  isRed: false,
  info: 'Retry',
  svgWidth: '10',
  svgHeight: '11',
  path: RETRY_SVG_PATH,
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
