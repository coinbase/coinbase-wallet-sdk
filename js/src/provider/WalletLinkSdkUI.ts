import {WalletLinkUI, WalletLinkUIOptions} from "./WalletLinkUI"
import {injectCssReset} from "../lib/cssReset"
import {LinkFlow} from "../components/LinkFlow"
import {Snackbar, SnackbarInstanceProps} from "../components/Snackbar"

export class WalletLinkSdkUI extends WalletLinkUI {
  private readonly linkFlow: LinkFlow
  private readonly snackbar: Snackbar
  private attached = false

  constructor(options: Readonly<WalletLinkUIOptions>) {
    super(options)
    this.snackbar = new Snackbar({
      darkMode: options.darkMode
    })

    this.linkFlow = new LinkFlow({
      darkMode: options.darkMode,
      version: options.version,
      sessionId: options.session.id,
      sessionSecret: options.session.secret,
      walletLinkUrl: options.walletLinkUrl,
      connected$: options.connected$,
      isParentConnection: false
    })
  }

  attach(): void {
    if (this.attached) {
      throw new Error("WalletLinkUI is already attached")
    }
    const el = document.documentElement
    const container = document.createElement("div")
    container.className = "-walletlink-css-reset"
    el.appendChild(container)

    this.linkFlow.attach(container)
    this.snackbar.attach(container)
    this.attached = true

    injectCssReset()
  }

  setConnectDisabled(connectDisabled: boolean) {
    this.linkFlow.setConnectDisabled(connectDisabled)
  }

  requestEthereumAccounts(options: { onCancel: () => void }): void {
    this.linkFlow.open({ onCancel: options.onCancel })
  }

  hideRequestEthereumAccounts(): void {
    this.linkFlow.close()
  }

  showConnecting(options: {
    onCancel: () => void
    onResetConnection: () => void
  }): () => void {
    const snackbarProps: SnackbarInstanceProps = {
      message: "Confirm on phone",
      menuItems: [
        {
          isRed: true,
          info: "Cancel transaction",
          svgWidth: "11",
          svgHeight: "11",
          path: "M10.3711 1.52346L9.21775 0.370117L5.37109 4.21022L1.52444 0.370117L0.371094 1.52346L4.2112 5.37012L0.371094 9.21677L1.52444 10.3701L5.37109 6.53001L9.21775 10.3701L10.3711 9.21677L6.53099 5.37012L10.3711 1.52346Z",
          defaultFillRule: "inherit",
          defaultClipRule: "inherit",
          onClick: options.onCancel
        },
        {
          isRed: false,
          info: "Reset connection",
          svgWidth: "10",
          svgHeight: "11",
          path: "M5.00008 0.96875C6.73133 0.96875 8.23758 1.94375 9.00008 3.375L10.0001 2.375V5.5H9.53133H7.96883H6.87508L7.80633 4.56875C7.41258 3.3875 6.31258 2.53125 5.00008 2.53125C3.76258 2.53125 2.70633 3.2875 2.25633 4.36875L0.812576 3.76875C1.50008 2.125 3.11258 0.96875 5.00008 0.96875ZM2.19375 6.43125C2.5875 7.6125 3.6875 8.46875 5 8.46875C6.2375 8.46875 7.29375 7.7125 7.74375 6.63125L9.1875 7.23125C8.5 8.875 6.8875 10.0312 5 10.0312C3.26875 10.0312 1.7625 9.05625 1 7.625L0 8.625V5.5H0.46875H2.03125H3.125L2.19375 6.43125Z",
          defaultFillRule: "evenodd",
          defaultClipRule: "evenodd",
          onClick: options.onResetConnection
        }
      ]
    }

    return this.snackbar.presentItem(snackbarProps)
  }

  reloadUI(): void {
    document.location.reload()
  }

  inlineAccountsResponse(): boolean { 
    return false
  }
}
