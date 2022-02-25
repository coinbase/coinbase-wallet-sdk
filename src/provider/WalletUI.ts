import { Observable } from "rxjs"
import { Session } from "../relay/Session"
import {
  EthereumAddressFromSignedMessageRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest
} from "../relay/Web3Request"
import {
  EthereumAddressFromSignedMessageResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse
} from "../relay/Web3Response"
import { AddressString } from "../types"

export interface WalletUIOptions {
  linkAPIUrl: string
  version: string
  darkMode: boolean
  session: Session
  connected$: Observable<boolean>
}

export abstract class WalletUI {
  constructor(_: Readonly<WalletUIOptions>) {}
  abstract attach(): void

  /**
   * Opens a qr code or auth page to connect with Coinbase Wallet mobile app
   * @param options onCancel callback
   *
   */
  abstract requestEthereumAccounts(options: {
    onCancel: () => void
    onAccounts?: (accounts: [AddressString]) => void
  }): void

  abstract addEthereumChain(options: {
    onCancel: () => void
    onApprove: (rpcUrl: string) => void
    chainId: string
    rpcUrls: string[]
    blockExplorerUrls?: string[]
    chainName?: string
    iconUrls?: string[]
    nativeCurrency?: {
      name: string
      symbol: string
      decimals: number
    }
  }): void

  abstract watchAsset(options: {
    onCancel: () => void
    onApprove: () => void
    type: string
    address: string
    symbol?: string
    decimals?: number
    image?: string
  }): void

  abstract switchEthereumChain(options: {
    onCancel: () => void
    onApprove: (rpcUrl: string) => void
    chainId: string
  }): void

  abstract signEthereumMessage(options: {
    request: SignEthereumMessageRequest
    onSuccess: (response: SignEthereumMessageResponse) => void
    onCancel: () => void
  }): void

  abstract signEthereumTransaction(options: {
    request: SignEthereumTransactionRequest
    onSuccess: (response: SignEthereumTransactionResponse) => void
    onCancel: () => void
  }): void

  abstract submitEthereumTransaction(options: {
    request: SubmitEthereumTransactionRequest
    onSuccess: (response: SubmitEthereumTransactionResponse) => void
    onCancel: () => void
  }): void

  abstract ethereumAddressFromSignedMessage(options: {
    request: EthereumAddressFromSignedMessageRequest
    onSuccess: (response: EthereumAddressFromSignedMessageResponse) => void
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
    isUnlinkedErrorState?: boolean
    onCancel: () => void
    onResetConnection: () => void
  }): () => void

  /**
   * Reload document ui
   */
  abstract reloadUI(): void

  /**
   * In some cases, we get the accounts response inline. This means the extension can handle
   * returning the accounts resposne.
   * (i.e. don't need to call a websocket api to get the accounts response)
   */
  abstract inlineAccountsResponse(): boolean

  /**
   * If the extension is available, it can handle the add ethereum chain request without
   * having to send a request to Coinbase Wallet mobile app
   */
  abstract inlineAddEthereumChain(chainId: string): boolean

  /**
   * If the extension is available, it can handle the watch asset request without
   * having to send a request to Coinbase Wallet mobile app
   */
  abstract inlineWatchAsset(): boolean

  /**
   * If the extension is available, it can handle the switch ethereum chain request without
   * having to send a request to Coinbase Wallet mobile app
   */
  abstract inlineSwitchEthereumChain(): boolean

  /**
   * If the extension is in standalone mode, it can handle signing locally
   */
  abstract isStandalone(): boolean

  /**
   * We want to disable showing the qr code for in-page connection if the dapp hasn't provided a json rpc url
   */
  setConnectDisabled(_: boolean) {}
}
