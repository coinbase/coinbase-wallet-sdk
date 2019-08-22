// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import resetCss from "./resetCss"

export default `
#_WalletLinkBlockedDialog,
#_WalletLinkBlockedDialog * {
  ${resetCss}
}

#_WalletLinkBlockedDialog * {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
    Arial, sans-serif;
  box-sizing: border-box;
}

#_WalletLinkBlockedDialog {
  position: fixed;
  z-index: 2147483647;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, .8);
  display: flex;
  align-items: center;
  justify-content: center;
}

#_WalletLinkBlockedDialog style {
  display: none;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogBox {
  position: relative;
  width: 320px;
  background: white;
  color: #050f19;
  padding: 24px;
  text-align: center;
  border-radius: 16px;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogClose {
  position: absolute;
  top: 22px;
  left: 22px;
  transition: opacity 0.25s;
  cursor: pointer;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogClose:active {
  opacity: 0.6;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogImage {
  margin-top: 32px;
  margin-bottom: 32px;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogTitle {
  display: block;
  margin-bottom: 16px;
  font-size: 20px;
  font-weight: bold;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogText {
  display: block;
  font-size: 13px;
  margin-bottom: 16px;
  opacity: .8;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogButton {
  display: block;
  width: 100%;
  margin-top: 24px;
  padding: 16px;
  background-color: #050f19;
  border-radius: 16px;
  color: white !important;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.25s;
  -webkit-appearance: none;
  -webkit-text-fill-color: white;
}

#_WalletLinkBlockedDialog ._WalletLinkBlockedDialogButton:active {
  opacity: 0.6;
}
`
