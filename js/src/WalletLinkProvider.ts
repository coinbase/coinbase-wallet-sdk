// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import BN from "bn.js"
import "whatwg-fetch"
import { FilterPolyfill } from "./FilterPolyfill"
import * as relay from "./relay"
import {
  AddressString,
  Callback,
  IdNumber,
  IntNumber,
  JSONRPCMethod,
  JSONRPCRequest,
  JSONRPCResponse,
  Web3Provider
} from "./types"
import {
  ensureAddressString,
  ensureBN,
  ensureBuffer,
  ensureHexString,
  ensureIntNumber,
  ensureRegExpString
} from "./util"

export interface WalletLinkProviderOptions {
  appName?: string
  jsonRpcUrl: string
  chainId?: number
}

interface Web3CallResponse {
  id: IdNumber
  errorMessage?: string | null
  result?: unknown
}

type Web3Callback = (response: Web3CallResponse) => void

const DEFAULT_APP_NAME = "DApp"

export class WalletLinkProvider implements Web3Provider {
  private static readonly _callbacks = new Map<IdNumber, Web3Callback>()
  private static _nextId = 0

  private readonly _filterPolyfill = new FilterPolyfill(this)

  private readonly _appName: string
  private readonly _jsonRpcUrl: string
  private readonly _chainId: IntNumber
  private _address: AddressString | null = null

  constructor(options: WalletLinkProviderOptions) {
    if (!options.jsonRpcUrl) {
      throw new Error("jsonRpcUrl must be provided")
    }
    this._appName = options.appName || DEFAULT_APP_NAME
    this._chainId = ensureIntNumber(options.chainId || 1)
    this._jsonRpcUrl = options.jsonRpcUrl
  }

  public static respond(response: Web3CallResponse): void {
    const callback = this._callbacks.get(response.id)
    if (callback) {
      callback(response)
    }
    this._callbacks.delete(response.id)
  }

  public get selectedAddress(): AddressString | undefined {
    return this._address || undefined
  }

  public get networkVersion(): string {
    return this._chainId.toString(10)
  }

  public get isWalletLink(): boolean {
    return true
  }

  public isConnected(): boolean {
    return true
  }

  public async enable(): Promise<AddressString[]> {
    if (this._address) {
      return [this._address]
    }

    let response: JSONRPCResponse<string[]> | null = null
    let errorMessage: string | null = null
    let address: AddressString | null = null

    try {
      response = await this.send(JSONRPCMethod.eth_requestAccounts)
      errorMessage = (response.error && response.error.message) || null
    } catch (err) {
      errorMessage = err.message || String(err)
    }

    if (
      response &&
      Array.isArray(response.result) &&
      typeof response.result[0] === "string"
    ) {
      this._address = address = ensureAddressString(response.result[0])
    }

    if (errorMessage || !address) {
      throw new Error(
        errorMessage
          ? `User rejected provider access ${errorMessage}`
          : "Response did not contain a valid address"
      )
    }

    return [address]
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
  public send(method: string, params?: any[] | any): Promise<JSONRPCResponse>
  public send(
    requestOrMethod: JSONRPCRequest | JSONRPCRequest[] | string,
    callbackOrParams?:
      | Callback<JSONRPCResponse>
      | Callback<JSONRPCResponse[]>
      | any[]
      | any
  ): JSONRPCResponse | JSONRPCResponse[] | void | Promise<JSONRPCResponse> {
    // send(method, params): Promise<JSONRPCResponse>
    if (typeof requestOrMethod === "string") {
      const method = requestOrMethod
      const params = Array.isArray(callbackOrParams)
        ? callbackOrParams
        : callbackOrParams !== undefined
        ? [callbackOrParams]
        : []
      const request: JSONRPCRequest = { jsonrpc: "2.0", id: 1, method, params }
      return this._sendRequestAsync(request)
    }

    // send(JSONRPCRequest | JSONRPCRequest[], callback): void
    if (typeof callbackOrParams == "function") {
      const request = requestOrMethod as any
      const callback = callbackOrParams as any
      return this.sendAsync(request, callback)
    }

    // send(JSONRPCRequest[]): JSONRPCResponse[]
    if (Array.isArray(requestOrMethod)) {
      const requests = requestOrMethod
      return requests.map(r => this._sendRequest(r))
    }

    // send(JSONRPCRequest): JSONRPCResponse
    const request = requestOrMethod
    return this._sendRequest(request)
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
      const cb = callback as Callback<JSONRPCResponse[]>
      this._sendMultipleRequestsAsync(request)
        .then(responses => cb(null, responses))
        .catch(err => cb(err, null))
      return
    }

    // send(JSONRPCRequest, callback): void
    const cb = callback as Callback<JSONRPCResponse>
    this._sendRequestAsync(request)
      .then(response => cb(null, response))
      .catch(err => cb(err, null))
  }

  public async scanQRCode(match?: RegExp): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const id = WalletLinkProvider._makeId()

      try {
        relay.scanQRCode(id, ensureRegExpString(match))
      } catch (err) {
        return reject(err)
      }

      WalletLinkProvider._callbacks.set(id, ({ errorMessage, result }) => {
        if (errorMessage != null) {
          return reject(new Error(errorMessage))
        } else if (typeof result !== "string") {
          return reject(new Error(`scan result is not a string: ${result}`))
        }
        resolve(result)
      })
    })
  }

  private static _makeId(): IdNumber {
    // max nextId == max int32 for compatibility with mobile
    this._nextId = (this._nextId + 1) % 0x7fffffff
    const id = IdNumber(this._nextId)
    // unlikely that this will ever be an issue, but just to be safe
    const callback = this._callbacks.get(id)
    if (callback) {
      callback({ id, errorMessage: "callback expired" })
      this._callbacks.delete(id)
    }
    return id
  }

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
      } catch (err) {
        return reject(err)
      }

      const id = WalletLinkProvider._makeId()

      try {
        this._handleAsynchronousMethods(id, request)
      } catch (err) {
        return reject(err)
      }

      WalletLinkProvider._callbacks.set(id, ({ errorMessage, result }) => {
        if (errorMessage != null) {
          return reject(new Error(errorMessage))
        }

        resolve({
          jsonrpc: "2.0",
          id: request.id,
          result
        })
      })
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

      default:
        return undefined
    }
  }

  private _handleAsynchronousMethods(
    id: IdNumber,
    request: JSONRPCRequest
  ): void {
    const { method } = request
    const params = request.params || []

    switch (method) {
      case JSONRPCMethod.eth_requestAccounts:
        return this._eth_requestAccounts(id)

      case JSONRPCMethod.eth_sign:
        return this._eth_sign(id, params)

      case JSONRPCMethod.eth_ecRecover:
        return this._eth_ecRecover(id, params)

      case JSONRPCMethod.personal_sign:
        return this._personal_sign(id, params)

      case JSONRPCMethod.personal_ecRecover:
        return this._personal_ecRecover(id, params)

      case JSONRPCMethod.eth_signTransaction:
        return this._eth_signTransaction(id, params)

      case JSONRPCMethod.eth_sendRawTransaction:
        return this._eth_sendRawTransaction(id, params)

      case JSONRPCMethod.eth_sendTransaction:
        return this._eth_sendTransaction(id, params)

      default:
        window
          .fetch(this._jsonRpcUrl, {
            method: "POST",
            body: JSON.stringify(request),
            mode: "cors",
            headers: { "Content-Type": "application/json" }
          })
          .then(res => res.json())
          .then(json => {
            WalletLinkProvider.respond({ id, result: json })
          })
          .catch(err => {
            WalletLinkProvider.respond({ id, errorMessage: String(err) })
          })
    }
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

  private _prepareTransactionParams(
    id: IdNumber,
    tx: {
      from?: unknown
      to?: unknown
      gasPrice?: unknown
      gas?: unknown
      value?: unknown
      data?: unknown
      nonce?: unknown
    }
  ): relay.EthereumTransactionParams {
    const fromAddress = tx.from ? ensureAddressString(tx.from) : this._address
    if (fromAddress === null) {
      throw new Error("Ethereum address is unavailable")
    }
    if (fromAddress !== this._address) {
      throw new Error("Unknown Ethereum address")
    }
    const toAddress = tx.to ? ensureAddressString(tx.to) : null
    const weiValue = tx.value != null ? ensureBN(tx.value) : new BN(0)
    const data = tx.data ? ensureBuffer(tx.data) : Buffer.alloc(0)
    const nonce = tx.nonce != null ? ensureIntNumber(tx.nonce) : null
    const gasPriceInWei = tx.gasPrice != null ? ensureBN(tx.gasPrice) : null
    const gasLimit = tx.gas != null ? ensureBN(tx.gas) : null
    const chainId = this._chainId

    return {
      id,
      fromAddress,
      toAddress,
      weiValue,
      data,
      nonce,
      gasPriceInWei,
      gasLimit,
      chainId
    }
  }

  private _eth_accounts(): string[] {
    return this._address ? [this._address] : []
  }

  private _eth_coinbase(): string | null {
    return this._address || null
  }

  private _net_version(): string {
    return this._chainId.toString(10)
  }

  private _eth_requestAccounts(id: IdNumber): void {
    relay.getEthereumAddress(id, this._appName, this._chainId)
  }

  private _eth_sign(id: IdNumber, params: Array<unknown>): void {
    const message = ensureBuffer(params[1])
    const address = ensureAddressString(params[0])
    relay.signEthereumMessage(id, message, address, false)
  }

  private _eth_ecRecover(id: IdNumber, params: Array<unknown>): void {
    const message = ensureBuffer(params[0])
    const signature = ensureBuffer(params[1])
    relay.ethereumAddressFromSignedMessage(id, message, signature, false)
  }

  private _personal_sign(id: IdNumber, params: Array<unknown>): void {
    const message = ensureBuffer(params[0])
    const address = ensureAddressString(params[1])
    relay.signEthereumMessage(id, message, address, true)
  }

  private _personal_ecRecover(id: IdNumber, params: Array<unknown>): void {
    const message = ensureBuffer(params[0])
    const signature = ensureBuffer(params[1])
    relay.ethereumAddressFromSignedMessage(id, message, signature, true)
  }

  private _eth_signTransaction(id: IdNumber, params: Array<unknown>): void {
    const tx = this._prepareTransactionParams(id, (params[0] as any) || {})
    relay.signEthereumTransaction(tx)
  }

  private _eth_sendRawTransaction(id: IdNumber, params: Array<unknown>): void {
    const signedTransaction = ensureBuffer(params[0])
    relay.submitEthereumTransaction(id, signedTransaction, this._chainId)
  }

  private _eth_sendTransaction(id: IdNumber, params: Array<unknown>): void {
    const tx = this._prepareTransactionParams(id, (params[0] as any) || {})
    relay.signAndSubmitEthereumTransaction(tx)
  }

  private _eth_uninstallFilter(params: Array<unknown>): boolean {
    const filterId = ensureHexString(params[0])
    return this._filterPolyfill.uninstallFilter(filterId)
  }

  private async _eth_newFilter(
    params: Array<unknown>
  ): Promise<JSONRPCResponse> {
    const param = params[0] as any // TODO: un-any this
    const filterId = await this._filterPolyfill.newFilter(param)
    return { jsonrpc: "2.0", result: filterId, id: 0 }
  }

  private async _eth_newBlockFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newBlockFilter()
    return { jsonrpc: "2.0", result: filterId, id: 0 }
  }

  private async _eth_newPendingTransactionFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newPendingTransactionFilter()
    return { jsonrpc: "2.0", result: filterId, id: 0 }
  }

  private _eth_getFilterChanges(
    params: Array<unknown>
  ): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0])
    return this._filterPolyfill.getFilterChanges(filterId)
  }

  private _eth_getFilterLogs(params: Array<unknown>): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0])
    return this._filterPolyfill.getFilterLogs(filterId)
  }
}
