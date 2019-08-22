// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import browserSvg from "./images/browserSvg"
import closeSvg from "./images/closeSvg"
import css from "./walletLinkBlockedDialogCss"

const SELECTOR_PREFIX = "_WalletLinkBlockedDialog"

const classNames = {
  backdrop: `${SELECTOR_PREFIX}Backdrop`,
  box: `${SELECTOR_PREFIX}Box`,
  close: `${SELECTOR_PREFIX}Close`,
  image: `${SELECTOR_PREFIX}Image`,
  title: `${SELECTOR_PREFIX}Title`,
  text: `${SELECTOR_PREFIX}Text`,
  button: `${SELECTOR_PREFIX}Button`
}

export function show(): void {
  if (document.querySelector(`#${SELECTOR_PREFIX}`)) {
    return
  }

  const wrapperEl = document.createElement("div")
  wrapperEl.id = SELECTOR_PREFIX

  const boxEl = document.createElement("div")
  boxEl.className = classNames.box
  wrapperEl.appendChild(boxEl)

  const styleEl = document.createElement("style")
  styleEl.type = "text/css"
  styleEl.appendChild(document.createTextNode(css))
  boxEl.appendChild(styleEl)

  const closeEl = document.createElement("button")
  closeEl.className = classNames.close
  const closeImageEl = document.createElement("img")
  closeImageEl.src = closeSvg
  closeImageEl.alt = "Close"
  closeEl.appendChild(closeImageEl)
  closeEl.addEventListener("click", handleClickClose, false)
  boxEl.appendChild(closeEl)

  const imgEl = document.createElement("img")
  imgEl.className = classNames.image
  imgEl.src = browserSvg
  imgEl.alt = ""
  boxEl.appendChild(imgEl)

  const h3El = document.createElement("h3")
  h3El.className = classNames.title
  h3El.appendChild(document.createTextNode("Change settings to connect"))
  boxEl.appendChild(h3El)

  const pEl = document.createElement("p")
  pEl.className = classNames.text
  pEl.appendChild(
    document.createTextNode(
      "Your browser setting is blocking the connection to your wallet."
    )
  )
  boxEl.appendChild(pEl)

  const pEl2 = document.createElement("p")
  pEl2.className = classNames.text
  pEl2.appendChild(
    document.createTextNode(
      "To connect to your wallet app, please follow our whitelisting " +
        "instructions. You only have to do this once."
    )
  )
  boxEl.appendChild(pEl2)

  const buttonEl = document.createElement("button")
  buttonEl.className = classNames.button
  buttonEl.appendChild(document.createTextNode("See instructions"))
  buttonEl.addEventListener("click", handleClickButton, false)
  boxEl.appendChild(buttonEl)

  document.documentElement.appendChild(wrapperEl)
}

export function hide(): void {
  const wrapperEl = document.querySelector(`#${SELECTOR_PREFIX}`)
  if (!wrapperEl) {
    return
  }

  const closeEl = document.querySelector(
    `#${SELECTOR_PREFIX} .${classNames.close}`
  )
  if (closeEl) {
    closeEl.removeEventListener("click", handleClickClose, false)
  }

  const buttonEl = document.querySelector(
    `#${SELECTOR_PREFIX} .${classNames.button}`
  )
  if (buttonEl) {
    buttonEl.removeEventListener("click", handleClickButton, false)
  }

  const { parentNode } = wrapperEl
  if (parentNode) {
    parentNode.removeChild(wrapperEl)
  }
}

function handleClickClose(evt: Event): void {
  evt.preventDefault()
  hide()
}

function handleClickButton(evt: Event): void {
  evt.preventDefault()
  window.open(
    "https://github.com/walletlink/walletlink/wiki/Browser-Troubleshooting",
    "_blank"
  )
}
