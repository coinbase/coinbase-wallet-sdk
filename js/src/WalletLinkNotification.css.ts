// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export default `#_WalletLinkNotifications,
#_WalletLinkNotifications * {
  animation: none;
  animation-delay: 0;
  animation-direction: normal;
  animation-duration: 0;
  animation-fill-mode: none;
  animation-iteration-count: 1;
  animation-name: none;
  animation-play-state: running;
  animation-timing-function: ease;
  backface-visibility: visible;
  background: 0;
  background-attachment: scroll;
  background-clip: border-box;
  background-color: transparent;
  background-image: none;
  background-origin: padding-box;
  background-position: 0 0;
  background-position-x: 0;
  background-position-y: 0;
  background-repeat: repeat;
  background-size: auto auto;
  border: 0;
  border-style: none;
  border-width: medium;
  border-color: inherit;
  border-bottom: 0;
  border-bottom-color: inherit;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-style: none;
  border-bottom-width: medium;
  border-collapse: separate;
  border-image: none;
  border-left: 0;
  border-left-color: inherit;
  border-left-style: none;
  border-left-width: medium;
  border-radius: 0;
  border-right: 0;
  border-right-color: inherit;
  border-right-style: none;
  border-right-width: medium;
  border-spacing: 0;
  border-top: 0;
  border-top-color: inherit;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top-style: none;
  border-top-width: medium;
  bottom: auto;
  box-shadow: none;
  box-sizing: border-box;
  caption-side: top;
  clear: none;
  clip: auto;
  color: inherit;
  columns: auto;
  column-count: auto;
  column-fill: balance;
  column-gap: normal;
  column-rule: medium none currentColor;
  column-rule-color: currentColor;
  column-rule-style: none;
  column-rule-width: none;
  column-span: 1;
  column-width: auto;
  content: normal;
  counter-increment: none;
  counter-reset: none;
  cursor: auto;
  direction: ltr;
  display: inline;
  empty-cells: show;
  float: none;
  font: normal;
  font-family: sans-serif;
  font-size: medium;
  font-style: normal;
  font-variant: normal;
  font-weight: normal;
  height: auto;
  hyphens: none;
  left: auto;
  letter-spacing: normal;
  line-height: normal;
  list-style: none;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: disc;
  margin: 0;
  margin-bottom: 0;
  margin-left: 0;
  margin-right: 0;
  margin-top: 0;
  max-height: none;
  max-width: none;
  min-height: 0;
  min-width: 0;
  opacity: 1;
  orphans: 0;
  outline: 0;
  outline-color: invert;
  outline-style: none;
  outline-width: medium;
  overflow: visible;
  overflow-x: visible;
  overflow-y: visible;
  padding: 0;
  padding-bottom: 0;
  padding-left: 0;
  padding-right: 0;
  padding-top: 0;
  page-break-after: auto;
  page-break-before: auto;
  page-break-inside: auto;
  perspective: none;
  perspective-origin: 50% 50%;
  pointer-events: auto;
  position: static;
  quotes: "\\201C""\\201D""\\2018""\\2019";
  right: auto;
  tab-size: 8;
  table-layout: auto;
  text-align: inherit;
  text-align-last: auto;
  text-decoration: none;
  text-decoration-color: inherit;
  text-decoration-line: none;
  text-decoration-style: solid;
  text-indent: 0;
  text-shadow: none;
  text-transform: none;
  top: auto;
  transform: none;
  transform-style: flat;
  transition: none;
  transition-delay: 0s;
  transition-duration: 0s;
  transition-property: none;
  transition-timing-function: ease;
  unicode-bidi: normal;
  vertical-align: baseline;
  visibility: visible;
  white-space: normal;
  widows: 0;
  width: auto;
  word-spacing: normal;
  z-index: auto;
  all: initial;
  all: unset;
}

#_WalletLinkNotifications {
  position: fixed;
  top: 0;
  right: 0;
  text-align: right;
  z-index: 2147483647;
}

#_WalletLinkNotifications style {
  display: none;
}

#_WalletLinkNotifications ._WalletLinkNotification {
  display: block;
  margin: 8px 16px 0 16px;
}

#_WalletLinkNotifications ._WalletLinkNotificationBox {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  color: black;
  margin: 0;
  font-size: 14px;
  font-family: sans-serif;
  box-shadow: 0px 16px 24px rgba(0, 0, 0, 0.06), 0px 0px 8px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  transition: opacity 0.25s, transform 0.25s;
  opacity: 0;
  transform: translateX(25%);
  text-align: left;
}

#_WalletLinkNotifications
  ._WalletLinkNotificationShow
  ._WalletLinkNotificationBox {
  opacity: 1;
  transform: translateX(0);
}

#_WalletLinkNotifications ._WalletLinkNotificationContent {
  display: flex;
  flex-direction: row;
  padding: 8px 16px;
  align-items: center;
  user-select: none;
  cursor: pointer;
}

#_WalletLinkNotifications ._WalletLinkNotificationIconContainer {
  display: block;
  position: relative;
  width: 34px;
  height: 34px;
  margin-right: 12px;
}

#_WalletLinkNotifications ._WalletLinkNotificationIcon {
  display: block;
  width: 32px;
  height: 32px;
  background-size: cover;
  border-radius: 16px;
  margin: 2px;
}

#_WalletLinkNotifications ._WalletLinkNotificationSpinner {
  display: block;
  position: absolute;
  width: 36px;
  height: 36px;
  top: 0;
  left: 0;
  animation-name: WalletLinkNotificationIconSpin;
  animation-duration: 1s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

#_WalletLinkNotifications ._WalletLinkNotificationMessage {
  display: block;
  color: black;
  line-height: 1.5;
}

#_WalletLinkNotifications ._WalletLinkNotificationChevron {
  display: block;
  margin-left: 8px;
  transition: transform 0.05s;
}

#_WalletLinkNotifications
  ._WalletLinkNotificationExpand
  ._WalletLinkNotificationChevron {
  transform: rotateZ(180deg);
}

#_WalletLinkNotifications ._WalletLinkNotificationActions {
  display: none;
  flex-direction: column;
  border-top: 1px solid #f5f7f8;
  padding: 8px 16px;
}

#_WalletLinkNotifications
  ._WalletLinkNotificationExpand
  ._WalletLinkNotificationActions {
  display: flex;
}

#_WalletLinkNotifications ._WalletLinkNotificationAction {
  color: #888;
  margin: 8px 0;
}

#_WalletLinkNotifications ._WalletLinkNotificationButtonInfo {
  margin: 0 8px 0 0;
}

#_WalletLinkNotifications ._WalletLinkNotificationButton {
  color: #1652f0;
  cursor: pointer;
  display: inline;
  margin: 0;
  padding: 0;
  -webkit-appearance: none;
  transition: opacity 0.25s;
}

#_WalletLinkNotifications ._WalletLinkNotificationButton:active {
  opacity: 0.6;
}

@keyframes WalletLinkNotificationIconSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}`
