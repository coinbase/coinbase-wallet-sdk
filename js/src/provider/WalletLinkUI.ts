import { Session } from "../relay/Session"
import { Observable } from "rxjs"
import { AddressString } from "../types"

export interface WalletLinkUIOptions {
  walletLinkUrl: string
  version: string
  darkMode: boolean
  session: Session
  connected$: Observable<boolean>
}

export abstract class WalletLinkUI {
  constructor(_: Readonly<WalletLinkUIOptions>) {}
  abstract attach(): void

  /**
   * Opens a qr code or auth page to start a walletlink connection
   * @param options onCancel callback
   *
   */
  abstract requestEthereumAccounts(options: {
    onCancel: () => void
    onAccounts?: (accounts: [AddressString]) => void
  }): void

  /**
   * Hide the link flow
   */
  abstract hideRequestEthereumAccounts(): void

  /**
   *
   * @param options onCancel callback for user clicking cancel,
   *  onResetConnection user clicked reset connection
   *
   * @returns callback that call can call to hide the connecting ui
   */
  abstract showConnecting(options: {
    onCancel: () => void
    onResetConnection: () => void
  }): () => void

  /**
   * Reload document ui
   */
  abstract reloadUI(): void

  /**
   * In some cases, we get the accounts response inline
   * (i.e. don't need to call a websocket api to get the accounts response)
   */
  abstract inlineAccountsResponse(): boolean

  /**
   * We want to disable showing the qr code for in-page walletlink if the dapp hasn't provided a json rpc url
   */
  setConnectDisabled(_: boolean) {}
}
