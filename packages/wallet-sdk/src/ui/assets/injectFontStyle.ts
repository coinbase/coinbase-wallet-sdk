import { FONT_FACE_CSS } from './fontFaceCSS.js';

const FONT_NAME = 'BaseSans-Regular';

export function injectFontStyle() {
  const existing = document.head.querySelector(`style[base-sdk-font="${FONT_NAME}"]`);
  if (existing) return;

  const style = document.createElement('style');
  style.setAttribute('base-sdk-font', FONT_NAME);
  style.textContent = FONT_FACE_CSS;
  document.head.appendChild(style);
}
