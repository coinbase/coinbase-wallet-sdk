// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import SafeEventEmitter from "@metamask/safe-event-emitter"
import BN from "bn.js"
import { ethErrors } from "eth-rpc-errors"

import { WalletLinkAnalytics } from "../connection/WalletLinkAnalytics"
import { EthereumChain } from "../EthereumChain"
import { EVENTS, WalletLinkAnalyticsAbstract } from "../init"
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage"
import { EthereumTransactionParams } from "../relay/EthereumTransactionParams"
import { Session } from "../relay/Session"
import {
  LOCAL_STORAGE_ADDRESSES_KEY,
  WalletLinkRelayAbstract
} from "../relay/WalletLinkRelayAbstract"
import { WalletLinkRelayEventManager } from "../relay/WalletLinkRelayEventManager"
import {
  ErrorResponse,
  RequestEthereumAccountsResponse,
  SwitchResponse
} from "../relay/Web3Response"
import { AddressString, Callback, IntNumber } from "../types"
import {
  ensureAddressString,
  ensureBN,
  ensureBuffer,
  ensureHexString,
  ensureIntNumber,
  ensureParsedJSONObject,
  ensureRegExpString,
  hexStringFromIntNumber,
  prepend0x
} from "../util"
import eip712 from "../vendor-js/eth-eip712-util"
import { FilterPolyfill } from "./FilterPolyfill"
import { JSONRPCMethod, JSONRPCRequest, JSONRPCResponse } from "./JSONRPC"
import {
  SubscriptionManager,
  SubscriptionNotification,
  SubscriptionResult
} from "./SubscriptionManager"
import { RequestArguments, Web3Provider } from "./Web3Provider"

const DEFAULT_CHAIN_ID_KEY = "DefaultChainId"
const DEFAULT_JSON_RPC_URL = "DefaultJsonRpcUrl"
// Indicates chain has been switched by switchEthereumChain or addEthereumChain request
const HAS_CHAIN_BEEN_SWITCHED_KEY = "HasChainBeenSwitched"
const HAS_CHAIN_OVERRIDDEN_FROM_RELAY = "HasChainOverriddenFromRelay"

export interface WalletLinkProviderOptions {
  chainId?: number
  jsonRpcUrl: string
  overrideIsCoinbaseWallet?: boolean
  overrideIsMetaMask: boolean
  relayEventManager: WalletLinkRelayEventManager
  relayProvider: () => Promise<WalletLinkRelayAbstract>
  storage: ScopedLocalStorage
  walletLinkAnalytics?: WalletLinkAnalyticsAbstract
}

export class WalletLinkProvider
  extends SafeEventEmitter
  implements Web3Provider
{
  // So dapps can easily identify Coinbase Wallet for enabling features like 3085 network switcher menus
  public readonly isCoinbaseWallet: boolean

  private readonly _filterPolyfill = new FilterPolyfill(this)
  private readonly _subscriptionManager = new SubscriptionManager(this)

  private readonly _relayProvider: () => Promise<WalletLinkRelayAbstract>
  private _relay: WalletLinkRelayAbstract | null = null
  private readonly _storage: ScopedLocalStorage
  private readonly _relayEventManager: WalletLinkRelayEventManager
  private readonly _walletLinkAnalytics: WalletLinkAnalyticsAbstract

  private _jsonRpcUrlFromOpts: string
  private readonly _overrideIsMetaMask: boolean

  private _addresses: AddressString[] = []

  private hasMadeFirstChainChangedEmission = false

  constructor(options: Readonly<WalletLinkProviderOptions>) {
    super()

    this.setProviderInfo = this.setProviderInfo.bind(this)
    this.updateProviderInfo = this.updateProviderInfo.bind(this)
    this.getChainId = this.getChainId.bind(this)
    this.setAppInfo = this.setAppInfo.bind(this)
    this.enable = this.enable.bind(this)
    this.close = this.close.bind(this)
    this.send = this.send.bind(this)
    this.sendAsync = this.sendAsync.bind(this)
    this.request = this.request.bind(this)
    this._setAddresses = this._setAddresses.bind(this)
    this.scanQRCode = this.scanQRCode.bind(this)
    this.genericRequest = this.genericRequest.bind(this)

    this._jsonRpcUrlFromOpts = options.jsonRpcUrl
    this._overrideIsMetaMask = options.overrideIsMetaMask
    this._relayProvider = options.relayProvider
    this._storage = options.storage
    this._relayEventManager = options.relayEventManager
    this._walletLinkAnalytics = options.walletLinkAnalytics
      ? options.walletLinkAnalytics
      : new WalletLinkAnalytics()

    this.isCoinbaseWallet = options.overrideIsCoinbaseWallet ?? true

    const chainId = this.getChainId()
    const chainIdStr = prepend0x(chainId.toString(16))
    // indicate that we've connected, for EIP-1193 compliance
    this.emit("connect", { chainIdStr })

    const cachedAddresses = this._storage.getItem(LOCAL_STORAGE_ADDRESSES_KEY)
    if (cachedAddresses) {
      const addresses = cachedAddresses.split(" ") as AddressString[]
      if (addresses[0] !== "") {
        this._addresses = addresses
        this.emit("accountsChanged", addresses)
      }
    }

    this._subscriptionManager.events.on(
      "notification",
      (notification: SubscriptionNotification) => {
        this.emit("message", {
          type: notification.method,
          data: notification.params
        })
      }
    )

    if (this._addresses.length > 0) {
      void this.initializeRelay()
    }

    window.addEventListener("message", event => {
      if (event.data.type !== "walletLinkMessage") return

      if (event.data.data.action === "defaultChainChanged") {
        const _chainId = event.data.data.chainId
        const jsonRpcUrl = event.data.data.jsonRpcUrl ?? this.jsonRpcUrl
        this.updateProviderInfo(jsonRpcUrl, Number(_chainId), true)
      }
    })
  }

  public get selectedAddress(): AddressString | undefined {
    return this._addresses[0] || undefined
  }

  public get networkVersion(): string {
    return this.getChainId().toString(10)
  }

  public get chainId(): string {
    return prepend0x(this.getChainId().toString(16))
  }

  public get isWalletLink(): boolean {
    return true
  }

  /**
   * Some DApps (i.e. Alpha Homora) seem to require the window.ethereum object return
   * true for this method.
   */
  public get isMetaMask(): boolean {
    return this._overrideIsMetaMask
  }

  public get host(): string {
    return this.jsonRpcUrl
  }

  public get connected(): boolean {
    return true
  }

  public isConnected(): boolean {
    return true
  }

  private get jsonRpcUrl(): string {
    return (
      this._storage.getItem(DEFAULT_JSON_RPC_URL) ?? this._jsonRpcUrlFromOpts
    )
  }

  private set jsonRpcUrl(value: string) {
    this._storage.setItem(DEFAULT_JSON_RPC_URL, value)
  }

  private get isChainOverridden(): boolean {
    return this._storage.getItem(HAS_CHAIN_OVERRIDDEN_FROM_RELAY) === "true"
  }

  private set isChainOverridden(value: boolean) {
    this._storage.setItem(HAS_CHAIN_OVERRIDDEN_FROM_RELAY, value.toString())
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public setProviderInfo(jsonRpcUrl: string, chainId: number) {
    if (this.isChainOverridden) return
    this.updateProviderInfo(jsonRpcUrl, this.getChainId(), false)
  }

  private updateProviderInfo(
    jsonRpcUrl: string,
    chainId: number,
    fromRelay: boolean
  ) {
    const hasChainSwitched =
      this._storage.getItem(HAS_CHAIN_BEEN_SWITCHED_KEY) === "true"
    if (hasChainSwitched && fromRelay) return
    if (fromRelay) {
      this.isChainOverridden = true
    }

    this.jsonRpcUrl = jsonRpcUrl

    // emit chainChanged event if necessary
    const originalChainId = this.getChainId()
    this._storage.setItem(DEFAULT_CHAIN_ID_KEY, chainId.toString(10))
    const chainChanged = ensureIntNumber(chainId) !== originalChainId
    if (chainChanged || !this.hasMadeFirstChainChangedEmission) {
      this.emit("chainChanged", this.getChainId())
      this.hasMadeFirstChainChangedEmission = true
    }
  }

  private async addEthereumChain(
    chainId: number,
    rpcUrls: string[],
    blockExplorerUrls: string[],
    chainName: string,
    iconUrls: string[],
    nativeCurrency: {
      name: string
      symbol: string
      decimals: number
    }
  ): Promise<boolean> {
    if (ensureIntNumber(chainId) === this.getChainId()) {
      return false
    }

    const relay = await this.initializeRelay()
    const res = await relay.addEthereumChain(
      chainId.toString(),
      rpcUrls,
      iconUrls,
      blockExplorerUrls,
      chainName,
      nativeCurrency
    ).promise

    if (typeof res.result === "boolean") {
      // legacy handling. to be deprecated in february 2022
      if (res.result === true) {
        this._storage.setItem(HAS_CHAIN_BEEN_SWITCHED_KEY, "true")
        this.updateProviderInfo(rpcUrls[0], chainId, false)
      }

      return res.result === true
    }

    if (res.result?.isApproved === true) {
      this._storage.setItem(HAS_CHAIN_BEEN_SWITCHED_KEY, "true")
      this.updateProviderInfo(rpcUrls[0], chainId, false)
    }

    return res.result?.isApproved === true
  }

  private async switchEthereumChain(chainId: number) {
    if (ensureIntNumber(chainId) === this.getChainId()) {
      return
    }

    const relay = await this.initializeRelay()
    const res = await relay.switchEthereumChain(chainId.toString(10)).promise

    if ((res as ErrorResponse).errorCode) {
      throw ethErrors.provider.custom({
        code: (res as ErrorResponse).errorCode!
      })
    }

    if (typeof res.result !== "boolean") {
      const switchResponse = res.result as SwitchResponse
      if (switchResponse.isApproved && switchResponse.rpcUrl.length > 0) {
        this._storage.setItem(HAS_CHAIN_BEEN_SWITCHED_KEY, "true")
        this.updateProviderInfo(switchResponse.rpcUrl, chainId, false)
      }
    } else {
      // this is for legacy clients that return a boolean as result. can deprecate below in February 2022
      if (res.result) {
        this._storage.setItem(HAS_CHAIN_BEEN_SWITCHED_KEY, "true")
        const ethereumChain = EthereumChain.fromChainId(BigInt(chainId))!
        const rpcUrl = EthereumChain.rpcUrl(ethereumChain) ?? ""
        this.updateProviderInfo(rpcUrl, chainId, false)
      }
    }
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    void this.initializeRelay().then(relay =>
      relay.setAppInfo(appName, appLogoUrl)
    )
  }

  public async enable(): Promise<AddressString[]> {
    this._walletLinkAnalytics.sendEvent(EVENTS.ETH_ACCOUNTS_STATE, {
      method: "provider::enable",
      addresses_length: this._addresses.length,
      sessionIdHash: this._relay ? Session.hash(this._relay.session.id) : null
    })
    if (this._addresses.length > 0) {
      return this._addresses
    }

    return await this._send<AddressString[]>(JSONRPCMethod.eth_requestAccounts)
  }

  public close() {
    void this.initializeRelay().then(relay => relay.resetAndReload())
  }

  public send(request: JSONRPCRequest): JSONRPCResponse
  public send(request: JSONRPCRequest[]): JSONRPCResponse[]
  public send(
    request: JSONRPCRequest,
    callback: Callback<JSONRPCResponse>
  ): void
  public send(
    request: JSONRPCRequest[],
    callback: Callback<JSONRPCResponse[]>
  ): void
  public send<T = any>(method: string, params?: any[] | any): Promise<T>
  public send(
    requestOrMethod: JSONRPCRequest | JSONRPCRequest[] | string,
    callbackOrParams?:
      | Callback<JSONRPCResponse>
      | Callback<JSONRPCResponse[]>
      | any[]
      | any
  ): JSONRPCResponse | JSONRPCResponse[] | void | Promise<any> {
    // send<T>(method, params): Promise<T>
    if (typeof requestOrMethod === "string") {
      const method = requestOrMethod
      const params = Array.isArray(callbackOrParams)
        ? callbackOrParams
        : callbackOrParams !== undefined
        ? [callbackOrParams]
        : []
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 0,
        method,
        params
      }
      return this._sendRequestAsync(request).then(res => res.result)
    }

    // send(JSONRPCRequest | JSONRPCRequest[], callback): void
    if (typeof callbackOrParams === "function") {
      const request = requestOrMethod as any
      const callback = callbackOrParams
      return this._sendAsync(request, callback)
    }

    // send(JSONRPCRequest[]): JSONRPCResponse[]
    if (Array.isArray(requestOrMethod)) {
      const requests = requestOrMethod
      return requests.map(r => this._sendRequest(r))
    }

    // send(JSONRPCRequest): JSONRPCResponse
    const req: JSONRPCRequest = requestOrMethod
    return this._sendRequest(req)
  }

  public sendAsync(
    request: JSONRPCRequest,
    callback: Callback<JSONRPCResponse>
  ): void
  public sendAsync(
    request: JSONRPCRequest[],
    callback: Callback<JSONRPCResponse[]>
  ): void
  public sendAsync(
    request: JSONRPCRequest | JSONRPCRequest[],
    callback: Callback<JSONRPCResponse> | Callback<JSONRPCResponse[]>
  ): void {
    if (typeof callback !== "function") {
      throw new Error("callback is required")
    }

    // send(JSONRPCRequest[], callback): void
    if (Array.isArray(request)) {
      const arrayCb = callback as Callback<JSONRPCResponse[]>
      this._sendMultipleRequestsAsync(request)
        .then(responses => arrayCb(null, responses))
        .catch(err => arrayCb(err, null))
      return
    }

    // send(JSONRPCRequest, callback): void
    const cb = callback as Callback<JSONRPCResponse>
    this._sendRequestAsync(request)
      .then(response => cb(null, response))
      .catch(err => cb(err, null))
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw ethErrors.rpc.invalidRequest({
        message: "Expected a single, non-array, object argument.",
        data: args
      })
    }

    const { method, params } = args

    if (typeof method !== "string" || method.length === 0) {
      throw ethErrors.rpc.invalidRequest({
        message: "'args.method' must be a non-empty string.",
        data: args
      })
    }

    if (
      params !== undefined &&
      !Array.isArray(params) &&
      (typeof params !== "object" || params === null)
    ) {
      throw ethErrors.rpc.invalidRequest({
        message: "'args.params' must be an object or array if provided.",
        data: args
      })
    }

    const newParams = params === undefined ? [] : params

    // WalletLink Requests
    const id = this._relayEventManager.makeRequestId()
    const result = await this._sendRequestAsync({
      method,
      params: newParams,
      jsonrpc: "2.0",
      id
    })

    return result.result as T
  }

  public async scanQRCode(match?: RegExp): Promise<string> {
    const relay = await this.initializeRelay()
    const res = await relay.scanQRCode(ensureRegExpString(match)).promise
    if (typeof res.result !== "string") {
      throw new Error("result was not a string")
    }
    return res.result
  }

  public async genericRequest(data: object, action: string): Promise<string> {
    const relay = await this.initializeRelay()
    const res = await relay.genericRequest(data, action).promise
    if (typeof res.result !== "string") {
      throw new Error("result was not a string")
    }
    return res.result
  }

  public supportsSubscriptions(): boolean {
    return false
  }

  public subscribe(): void {
    throw new Error("Subscriptions are not supported")
  }

  public unsubscribe(): void {
    throw new Error("Subscriptions are not supported")
  }

  public disconnect(): boolean {
    return true
  }

  private _send = this.send.bind(this)
  private _sendAsync = this.sendAsync.bind(this)

  private _sendRequest(request: JSONRPCRequest): JSONRPCResponse {
    const response: JSONRPCResponse = {
      jsonrpc: "2.0",
      id: request.id
    }
    const { method } = request

    response.result = this._handleSynchronousMethods(request)

    if (response.result === undefined) {
      throw new Error(
        `WalletLink does not support calling ${method} synchronously without ` +
          `a callback. Please provide a callback parameter to call ${method} ` +
          `asynchronously.`
      )
    }

    return response
  }

  private _setAddresses(addresses: string[]): void {
    if (!Array.isArray(addresses)) {
      throw new Error("addresses is not an array")
    }

    const newAddresses = addresses.map(address => ensureAddressString(address))

    if (JSON.stringify(newAddresses) === JSON.stringify(this._addresses)) {
      return
    }

    this._addresses = newAddresses
    this.emit("accountsChanged", this._addresses)
    this._storage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, newAddresses.join(" "))
    window.dispatchEvent(
      new CustomEvent("walletlink:addresses", { detail: this._addresses })
    )
  }

  private _sendRequestAsync(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise<JSONRPCResponse>((resolve, reject) => {
      try {
        const syncResult = this._handleSynchronousMethods(request)
        if (syncResult !== undefined) {
          return resolve({
            jsonrpc: "2.0",
            id: request.id,
            result: syncResult
          })
        }

        const filterPromise = this._handleAsynchronousFilterMethods(request)
        if (filterPromise !== undefined) {
          filterPromise
            .then(res => resolve({ ...res, id: request.id }))
            .catch(err => reject(err))
          return
        }

        const subscriptionPromise = this._handleSubscriptionMethods(request)
        if (subscriptionPromise !== undefined) {
          subscriptionPromise
            .then(res =>
              resolve({
                jsonrpc: "2.0",
                id: request.id,
                result: res.result
              })
            )
            .catch(err => reject(err))
          return
        }
      } catch (err: any) {
        return reject(err)
      }

      this._handleAsynchronousMethods(request)
        .then(res => res && resolve({ ...res, id: request.id }))
        .catch(err => reject(err))
    })
  }

  private _sendMultipleRequestsAsync(
    requests: JSONRPCRequest[]
  ): Promise<JSONRPCResponse[]> {
    return Promise.all(requests.map(r => this._sendRequestAsync(r)))
  }

  private _handleSynchronousMethods(request: JSONRPCRequest) {
    const { method } = request
    const params = request.params || []

    switch (method) {
      case JSONRPCMethod.eth_accounts:
        return this._eth_accounts()

      case JSONRPCMethod.eth_coinbase:
        return this._eth_coinbase()

      case JSONRPCMethod.eth_uninstallFilter:
        return this._eth_uninstallFilter(params)

      case JSONRPCMethod.net_version:
        return this._net_version()

      case JSONRPCMethod.eth_chainId:
        return this._eth_chainId()

      default:
        return undefined
    }
  }

  private async _handleAsynchronousMethods(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse | void> {
    const { method } = request
    const params = request.params || []

    switch (method) {
      case JSONRPCMethod.eth_requestAccounts:
        return this._eth_requestAccounts()

      case JSONRPCMethod.eth_sign:
        return this._eth_sign(params)

      case JSONRPCMethod.eth_ecRecover:
        return this._eth_ecRecover(params)

      case JSONRPCMethod.personal_sign:
        return this._personal_sign(params)

      case JSONRPCMethod.personal_ecRecover:
        return this._personal_ecRecover(params)

      case JSONRPCMethod.eth_signTransaction:
        return this._eth_signTransaction(params)

      case JSONRPCMethod.eth_sendRawTransaction:
        return this._eth_sendRawTransaction(params)

      case JSONRPCMethod.eth_sendTransaction:
        return this._eth_sendTransaction(params)

      case JSONRPCMethod.eth_signTypedData_v1:
        return this._eth_signTypedData_v1(params)

      case JSONRPCMethod.eth_signTypedData_v2:
        return this._throwUnsupportedMethodError()

      case JSONRPCMethod.eth_signTypedData_v3:
        return this._eth_signTypedData_v3(params)

      case JSONRPCMethod.eth_signTypedData_v4:
      case JSONRPCMethod.eth_signTypedData:
        return this._eth_signTypedData_v4(params)

      case JSONRPCMethod.walletlink_arbitrary:
        return this._walletlink_arbitrary(params)

      case JSONRPCMethod.wallet_addEthereumChain:
        return this._wallet_addEthereumChain(params)

      case JSONRPCMethod.wallet_switchEthereumChain:
        return this._wallet_switchEthereumChain(params)
    }

    const relay = await this.initializeRelay()
    return relay.makeEthereumJSONRPCRequest(request, this.jsonRpcUrl)
  }

  private _handleAsynchronousFilterMethods(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> | undefined {
    const { method } = request
    const params = request.params || []

    switch (method) {
      case JSONRPCMethod.eth_newFilter:
        return this._eth_newFilter(params)

      case JSONRPCMethod.eth_newBlockFilter:
        return this._eth_newBlockFilter()

      case JSONRPCMethod.eth_newPendingTransactionFilter:
        return this._eth_newPendingTransactionFilter()

      case JSONRPCMethod.eth_getFilterChanges:
        return this._eth_getFilterChanges(params)

      case JSONRPCMethod.eth_getFilterLogs:
        return this._eth_getFilterLogs(params)
    }

    return undefined
  }

  private _handleSubscriptionMethods(
    request: JSONRPCRequest
  ): Promise<SubscriptionResult> | undefined {
    switch (request.method) {
      case JSONRPCMethod.eth_subscribe:
      case JSONRPCMethod.eth_unsubscribe:
        return this._subscriptionManager.handleRequest(request)
    }

    return undefined
  }

  private _isKnownAddress(addressString: string): boolean {
    try {
      const address = ensureAddressString(addressString)
      return this._addresses.includes(address)
    } catch {}
    return false
  }

  private _ensureKnownAddress(addressString: string): void {
    if (!this._isKnownAddress(addressString)) {
      throw new Error("Unknown Ethereum address")
    }
  }

  private _prepareTransactionParams(tx: {
    from?: unknown
    to?: unknown
    gasPrice?: unknown
    maxFeePerGas?: unknown
    maxPriorityFeePerGas?: unknown
    gas?: unknown
    value?: unknown
    data?: unknown
    nonce?: unknown
  }): EthereumTransactionParams {
    const fromAddress = tx.from
      ? ensureAddressString(tx.from)
      : this.selectedAddress
    if (!fromAddress) {
      throw new Error("Ethereum address is unavailable")
    }

    this._ensureKnownAddress(fromAddress)

    const toAddress = tx.to ? ensureAddressString(tx.to) : null
    const weiValue = tx.value != null ? ensureBN(tx.value) : new BN(0)
    const data = tx.data ? ensureBuffer(tx.data) : Buffer.alloc(0)
    const nonce = tx.nonce != null ? ensureIntNumber(tx.nonce) : null
    const gasPriceInWei = tx.gasPrice != null ? ensureBN(tx.gasPrice) : null
    const maxFeePerGas =
      tx.maxFeePerGas != null ? ensureBN(tx.maxFeePerGas) : null
    const maxPriorityFeePerGas =
      tx.maxPriorityFeePerGas != null ? ensureBN(tx.maxPriorityFeePerGas) : null
    const gasLimit = tx.gas != null ? ensureBN(tx.gas) : null
    const chainId = this.getChainId()

    return {
      fromAddress,
      toAddress,
      weiValue,
      data,
      nonce,
      gasPriceInWei,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit,
      chainId
    }
  }

  private _requireAuthorization(): void {
    if (this._addresses.length === 0) {
      throw ethErrors.provider.unauthorized({})
    }
  }

  private _throwUnsupportedMethodError(): Promise<JSONRPCResponse> {
    throw ethErrors.provider.unsupportedMethod({})
  }

  private async _signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ): Promise<JSONRPCResponse> {
    this._ensureKnownAddress(address)

    try {
      const relay = await this.initializeRelay()
      const res = await relay.signEthereumMessage(
        message,
        address,
        addPrefix,
        typedDataJson
      ).promise
      return { jsonrpc: "2.0", id: 0, result: res.result }
    } catch (err: any) {
      if (
        typeof err.message === "string" &&
        err.message.match(/(denied|rejected)/i)
      ) {
        throw ethErrors.provider.userRejectedRequest(
          "User denied message signature"
        )
      }
      throw err
    }
  }

  private async _ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean
  ): Promise<JSONRPCResponse> {
    const relay = await this.initializeRelay()
    const res = await relay.ethereumAddressFromSignedMessage(
      message,
      signature,
      addPrefix
    ).promise
    return { jsonrpc: "2.0", id: 0, result: res.result }
  }

  private _eth_accounts(): string[] {
    return this._addresses
  }

  private _eth_coinbase(): string | null {
    return this.selectedAddress || null
  }

  private _net_version(): string {
    return this.getChainId().toString(10)
  }

  private _eth_chainId(): string {
    return hexStringFromIntNumber(this.getChainId())
  }

  private getChainId(): IntNumber {
    const chainIdStr = this._storage.getItem(DEFAULT_CHAIN_ID_KEY) || "1"
    const chainId = parseInt(chainIdStr, 10)
    return ensureIntNumber(chainId)
  }

  private async _eth_requestAccounts(): Promise<JSONRPCResponse> {
    this._walletLinkAnalytics.sendEvent(EVENTS.ETH_ACCOUNTS_STATE, {
      method: "provider::_eth_requestAccounts",
      addresses_length: this._addresses.length,
      sessionIdHash: this._relay ? Session.hash(this._relay.session.id) : null
    })
    if (this._addresses.length > 0) {
      return Promise.resolve({
        jsonrpc: "2.0",
        id: 0,
        result: this._addresses
      })
    }

    let res: RequestEthereumAccountsResponse
    try {
      const relay = await this.initializeRelay()
      res = await relay.requestEthereumAccounts().promise
    } catch (err: any) {
      if (
        typeof err.message === "string" &&
        err.message.match(/(denied|rejected)/i)
      ) {
        throw ethErrors.provider.userRejectedRequest(
          "User denied account authorization"
        )
      }
      throw err
    }

    if (!res.result) {
      throw new Error("accounts received is empty")
    }

    this._setAddresses(res.result)
    return { jsonrpc: "2.0", id: 0, result: this._addresses }
  }

  private _eth_sign(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization()
    const address = ensureAddressString(params[0])
    const message = ensureBuffer(params[1])

    return this._signEthereumMessage(message, address, false)
  }

  private _eth_ecRecover(params: unknown[]): Promise<JSONRPCResponse> {
    const message = ensureBuffer(params[0])
    const signature = ensureBuffer(params[1])
    return this._ethereumAddressFromSignedMessage(message, signature, false)
  }

  private _personal_sign(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization()
    const message = ensureBuffer(params[0])
    const address = ensureAddressString(params[1])

    return this._signEthereumMessage(message, address, true)
  }

  private _personal_ecRecover(params: unknown[]): Promise<JSONRPCResponse> {
    const message = ensureBuffer(params[0])
    const signature = ensureBuffer(params[1])

    return this._ethereumAddressFromSignedMessage(message, signature, true)
  }

  private async _eth_signTransaction(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    this._requireAuthorization()
    const tx = this._prepareTransactionParams((params[0] as any) || {})
    try {
      const relay = await this.initializeRelay()
      const res = await relay.signEthereumTransaction(tx).promise
      return { jsonrpc: "2.0", id: 0, result: res.result }
    } catch (err: any) {
      if (
        typeof err.message === "string" &&
        err.message.match(/(denied|rejected)/i)
      ) {
        throw ethErrors.provider.userRejectedRequest(
          "User denied transaction signature"
        )
      }
      throw err
    }
  }

  private async _eth_sendRawTransaction(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    const signedTransaction = ensureBuffer(params[0])
    const relay = await this.initializeRelay()
    const res = await relay.submitEthereumTransaction(
      signedTransaction,
      this.getChainId()
    ).promise
    return { jsonrpc: "2.0", id: 0, result: res.result }
  }

  private async _eth_sendTransaction(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    this._requireAuthorization()
    const tx = this._prepareTransactionParams((params[0] as any) || {})
    try {
      const relay = await this.initializeRelay()
      const res = await relay.signAndSubmitEthereumTransaction(tx).promise
      return { jsonrpc: "2.0", id: 0, result: res.result }
    } catch (err: any) {
      if (
        typeof err.message === "string" &&
        err.message.match(/(denied|rejected)/i)
      ) {
        throw ethErrors.provider.userRejectedRequest(
          "User denied transaction signature"
        )
      }
      throw err
    }
  }

  private async _eth_signTypedData_v1(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    this._requireAuthorization()
    const typedData = ensureParsedJSONObject(params[0])
    const address = ensureAddressString(params[1])

    this._ensureKnownAddress(address)

    const message = eip712.hashForSignTypedDataLegacy({ data: typedData })
    const typedDataJSON = JSON.stringify(typedData, null, 2)

    return this._signEthereumMessage(message, address, false, typedDataJSON)
  }

  private async _eth_signTypedData_v3(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    this._requireAuthorization()
    const address = ensureAddressString(params[0])
    const typedData = ensureParsedJSONObject(params[1])

    this._ensureKnownAddress(address)

    const message = eip712.hashForSignTypedData_v3({ data: typedData })
    const typedDataJSON = JSON.stringify(typedData, null, 2)

    return this._signEthereumMessage(message, address, false, typedDataJSON)
  }

  private async _eth_signTypedData_v4(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    this._requireAuthorization()
    const address = ensureAddressString(params[0])
    const typedData = ensureParsedJSONObject(params[1])

    this._ensureKnownAddress(address)

    const message = eip712.hashForSignTypedData_v4({ data: typedData })
    const typedDataJSON = JSON.stringify(typedData, null, 2)

    return this._signEthereumMessage(message, address, false, typedDataJSON)
  }

  private async _walletlink_arbitrary(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    const action = params[0]
    const data = params[1]
    if (typeof data !== "string") {
      throw new Error("parameter must be a string")
    }

    if (typeof action !== "object" || action === null) {
      throw new Error("parameter must be an object")
    }

    const result = await this.genericRequest(action, data)
    return { jsonrpc: "2.0", id: 0, result }
  }

  private async _wallet_addEthereumChain(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    const request = params[0] as AddEthereumChainParams

    if (request.rpcUrls?.length === 0) {
      return {
        jsonrpc: "2.0",
        id: 0,
        error: { code: 2, message: `please pass in at least 1 rpcUrl` }
      }
    }

    if (!request.chainName || request.chainName.trim() === "") {
      throw ethErrors.provider.custom({
        code: 0,
        message: "chainName is a required field"
      })
    }

    if (!request.nativeCurrency) {
      throw ethErrors.provider.custom({
        code: 0,
        message: "nativeCurrency is a required field"
      })
    }

    const chainIdNumber = parseInt(request.chainId, 16)
    const success = await this.addEthereumChain(
      chainIdNumber,
      request.rpcUrls ?? [],
      request.blockExplorerUrls ?? [],
      request.chainName,
      request.iconUrls ?? [],
      request.nativeCurrency
    )
    if (success) {
      return { jsonrpc: "2.0", id: 0, result: null }
    } else {
      return {
        jsonrpc: "2.0",
        id: 0,
        error: { code: 2, message: `unable to add ethereum chain` }
      }
    }
  }

  private async _wallet_switchEthereumChain(
    params: unknown[]
  ): Promise<JSONRPCResponse> {
    const request = params[0] as SwitchEthereumChainParams
    await this.switchEthereumChain(parseInt(request.chainId, 16))
    return { jsonrpc: "2.0", id: 0, result: null }
  }

  private _eth_uninstallFilter(params: unknown[]): boolean {
    const filterId = ensureHexString(params[0])
    return this._filterPolyfill.uninstallFilter(filterId)
  }

  private async _eth_newFilter(params: unknown[]): Promise<JSONRPCResponse> {
    const param = params[0] as any
    const filterId = await this._filterPolyfill.newFilter(param)
    return { jsonrpc: "2.0", id: 0, result: filterId }
  }

  private async _eth_newBlockFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newBlockFilter()
    return { jsonrpc: "2.0", id: 0, result: filterId }
  }

  private async _eth_newPendingTransactionFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newPendingTransactionFilter()
    return { jsonrpc: "2.0", id: 0, result: filterId }
  }

  private _eth_getFilterChanges(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0])
    return this._filterPolyfill.getFilterChanges(filterId)
  }

  private _eth_getFilterLogs(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0])
    return this._filterPolyfill.getFilterLogs(filterId)
  }

  private initializeRelay(): Promise<WalletLinkRelayAbstract> {
    if (this._relay) {
      return Promise.resolve(this._relay)
    }

    return this._relayProvider().then(relay => {
      relay.setAccountsCallback(accounts => this._setAddresses(accounts))
      relay.setChainCallback((chainId, jsonRpcUrl) => {
        this.updateProviderInfo(jsonRpcUrl, parseInt(chainId, 10), true)
      })
      this._relay = relay
      return relay
    })
  }
}

interface AddEthereumChainParams {
  chainId: string
  blockExplorerUrls?: string[]
  chainName?: string
  iconUrls?: string[]
  rpcUrls?: string[]
  nativeCurrency?: {
    name: string
    symbol: string
    decimals: number
  }
}

interface SwitchEthereumChainParams {
  chainId: string
}
