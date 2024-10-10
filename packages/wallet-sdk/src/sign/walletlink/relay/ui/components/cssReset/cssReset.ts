// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import css from './cssReset-css.js';

export function injectCssReset(): void {
  const styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  styleEl.appendChild(document.createTextNode(css));
  document.documentElement.appendChild(styleEl);
}
