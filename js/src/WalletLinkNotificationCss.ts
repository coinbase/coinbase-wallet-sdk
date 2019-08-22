// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import resetCss from "./resetCss"

export default `
#_WalletLinkNotifications,
#_WalletLinkNotifications * {
  ${resetCss}
}

#_WalletLinkNotifications * {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
    Arial, sans-serif;
  box-sizing: border-box;
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
  box-shadow:
    0px 16px 24px rgba(0, 0, 0, 0.06),
    0px 0px 8px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  transition: opacity 0.25s, transform 0.25s;
  opacity: 0;
  transform: translateX(25%);
  text-align: left;
  overflow: hidden;
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
  padding: 8px 8px 8px 16px;
  align-items: center;
  user-select: none;
  cursor: pointer;
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

#_WalletLinkNotifications ._WalletLinkNotificationProgressBar {
  display: block;
  height: 2px;
  position: relative;
}

#_WalletLinkNotifications ._WalletLinkNotificationProgressBar::before {
  display: block;
  position: absolute;
  content: "";
  left: -100%;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
    to right,
    rgba(22, 82, 240, 0) 0%,
    rgba(22, 82, 240, 1) 100%
  );
  animation: WalletLinkNotificationProgressBar 2s linear infinite;
}

@keyframes WalletLinkNotificationProgressBar {
  0% {
    left: 0;
    width: 0%;
    background-image: linear-gradient(
      to right,
      rgba(22, 82, 240, 0) 0%,
      rgba(22, 82, 240, 1) 100%
    );
  }
  25% {
    left: 0;
    width: 100%;
  }
  50% {
    left: 100%;
    width: 0%;
    background-image: linear-gradient(
      to right,
      rgba(22, 82, 240, 0) 0%,
      rgba(22, 82, 240, 1) 100%
    );
  }
  50.01% {
    background-image: linear-gradient(
      to left,
      rgba(22, 82, 240, 0) 0%,
      rgba(22, 82, 240, 1) 100%
    );
  }
  75% {
    left: 0;
    width: 100%;
  }
  100% {
    left: 0;
    width: 0%;
    background-image: linear-gradient(
      to left,
      rgba(22, 82, 240, 0) 0%,
      rgba(22, 82, 240, 1) 100%
    );
  }
}

#_WalletLinkNotifications
  ._WalletLinkNotificationExpand
  ._WalletLinkNotificationProgressBar {
  margin-bottom: -1px;
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
  -webkit-text-fill-color: #1652f0;
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
`
