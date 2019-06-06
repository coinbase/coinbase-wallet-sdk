// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"

const css = require("./WalletLinkNotification.css").default

const containerElId = "_WalletLinkNotifications"
const elClassName = "_WalletLinkNotification"
const elShowClassName = "_WalletLinkNotificationShow"
const cancelElClassName = "_WalletLinkNotificationCancel"
const helpElClassName = "_WalletLinkNotificationHelp"
const dismissElClassName = "_WalletLinkNotificationDismiss"

export class WalletLinkNotification {
  public static injectContainer(): void {
    if (document.querySelector(`#${containerElId}`)) {
      return
    }

    const containerEl = document.createElement("div")
    containerEl.id = containerElId

    const styleEl = document.createElement("style")
    styleEl.innerHTML = css

    containerEl.appendChild(styleEl)
    document.documentElement.appendChild(containerEl)
  }

  private readonly message: string
  private readonly cancelLabel: string
  private readonly helpLabel: string
  private readonly dismissLabel: string

  private readonly onClickCancel: (() => void) | null
  private readonly onClickHelp: (() => void) | null
  private readonly onClickDismiss: (() => void) | null

  private el: HTMLElement | null = null

  constructor(params: {
    message?: string
    cancelLabel?: string
    helpLabel?: string
    dismissLabel?: string
    onClickCancel?: () => void
    onClickHelp?: () => void
    onClickDismiss?: () => void
  }) {
    const {
      message,
      cancelLabel,
      helpLabel,
      dismissLabel,
      onClickCancel,
      onClickHelp,
      onClickDismiss
    } = params
    this.message = message || "Notification"
    this.cancelLabel = cancelLabel || "Cancel"
    this.helpLabel = helpLabel || "Help"
    this.dismissLabel = dismissLabel || "Dismiss"
    this.onClickCancel = onClickCancel || null
    this.onClickHelp = onClickHelp || null
    this.onClickDismiss = onClickDismiss || null
  }

  public show() {
    const { cancelLabel, helpLabel, dismissLabel } = this

    if (!this.el) {
      this.el = document.createElement("div")
      this.el.className = elClassName
      let html = `<p>${this.message}<span>`

      if (this.onClickCancel) {
        html += `<a class="${cancelElClassName}" href="#">${cancelLabel}</a>`
      }
      if (this.onClickHelp) {
        html += `<a class="${helpElClassName}" href="#">${helpLabel}</a>`
      }
      if (this.onClickDismiss) {
        html += `<a class="${dismissElClassName}" href="#">${dismissLabel}</a>`
      }

      html += `</p></span>`
      this.el.innerHTML = html
    }

    const containerEl = document.querySelector(`#${containerElId}`)
    if (!containerEl) {
      return
    }

    containerEl.appendChild(this.el)

    const cancelEl = this.$(`.${cancelElClassName}`)
    if (cancelEl) {
      cancelEl.addEventListener("click", this.handleClickCancel, false)
    }

    const helpEl = this.$(`.${helpElClassName}`)
    if (helpEl) {
      helpEl.addEventListener("click", this.handleClickHelp, false)
    }

    const dismissEl = this.$(`.${dismissElClassName}`)
    if (dismissEl) {
      dismissEl.addEventListener("click", this.handleClickDismiss, false)
    }

    window.setTimeout(() => {
      if (this.el) {
        this.el.className += " " + elShowClassName
      }
    }, 0)
  }

  public hide() {
    if (!this.el) {
      return
    }

    const { parentNode } = this.el
    if (parentNode) {
      parentNode.removeChild(this.el)
    }

    const cancelEl = this.$(`.${cancelElClassName}`)
    if (cancelEl) {
      cancelEl.removeEventListener("click", this.handleClickCancel, false)
    }

    const helpEl = this.$(`.${helpElClassName}`)
    if (helpEl) {
      helpEl.removeEventListener("click", this.handleClickHelp, false)
    }

    const dismissEl = this.$(`.${dismissElClassName}`)
    if (dismissEl) {
      dismissEl.removeEventListener("click", this.handleClickDismiss, false)
    }

    this.el = null
  }

  private $(selector: string): HTMLElement | null {
    if (!this.el) {
      return null
    }
    return this.el.querySelector(selector)
  }

  @bind
  private handleClickCancel(evt: MouseEvent): void {
    evt.preventDefault()
    if (this.onClickCancel) {
      this.onClickCancel()
    }
    this.hide()
  }

  @bind
  private handleClickHelp(evt: MouseEvent): void {
    evt.preventDefault()
    if (this.onClickHelp) {
      this.onClickHelp()
    }
  }

  @bind
  private handleClickDismiss(evt: MouseEvent): void {
    evt.preventDefault()
    if (this.onClickDismiss) {
      this.onClickDismiss()
    }
    this.hide()
  }
}
