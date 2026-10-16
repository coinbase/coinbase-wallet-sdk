import { FONT_FACE_CSS } from './fontFaceCSS.js';

const FONT_NAME = 'CoinbaseSans-Regular';

export function injectFontStyle() {
  const existing = document.head.querySelector(`style[cbw-sdk-font="${FONT_NAME}"]`);
  if (existing) return;

  const style = document.createElement('style');
  style.setAttribute('cbw-sdk-font', FONT_NAME);
  style.textContent = FONT_FACE_CSS;
  document.head.appendChild(style);
}
