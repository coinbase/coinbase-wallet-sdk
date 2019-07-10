// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { HexString, IntNumber } from "./types/common"
import { JSONRPCRequest, JSONRPCResponse } from "./types/JSONRPC"
import { Web3Provider } from "./types/Web3Provider"
import {
  ensureHexString,
  hexStringFromIntNumber,
  intNumberFromHexString,
  isHexString,
  range
} from "./util"

const TIMEOUT = 5 * 60 * 1000 // 5 minutes
const JSONRPC_TEMPLATE: { jsonrpc: "2.0"; id: number } = {
  jsonrpc: "2.0",
  id: 0
}

type RawHexBlockHeight = HexString | "earliest" | "latest" | "pending"
type HexBlockHeight = HexString | "latest"
type IntBlockHeight = IntNumber | "latest"

export interface FilterParam {
  fromBlock: RawHexBlockHeight | undefined
  toBlock: RawHexBlockHeight | undefined
  address?: string | string[]
  topics?: Array<string | string[]>
}

export interface Filter {
  fromBlock: IntBlockHeight
  toBlock: IntBlockHeight
  addresses: string[] | null
  topics: Array<string | string[]>
}

export class FilterPolyfill {
  private readonly provider: Web3Provider
  private readonly logFilters = new Map<IntNumber, Filter>() // <id, filter>
  private readonly blockFilters = new Set<IntNumber>() // <id>
  private readonly pendingTransactionFilters = new Set<IntNumber>() // <id, true>
  private readonly cursors = new Map<IntNumber, IntNumber>() // <id, cursor>
  private readonly timeouts = new Map<IntNumber, number>() // <id, setTimeout id>
  private nextFilterId = IntNumber(1)

  constructor(provider: Web3Provider) {
    this.provider = provider
  }

  public async newFilter(param: FilterParam): Promise<HexString> {
    const filter = filterFromParam(param)
    const id = this.makeFilterId()
    const cursor = await this.setInitialCursorPosition(id, filter.fromBlock)
    console.log(
      `Installing new log filter(${id}):`,
      filter,
      "initial cursor position:",
      cursor
    )
    this.logFilters.set(id, filter)
    this.setFilterTimeout(id)
    return hexStringFromIntNumber(id)
  }

  public async newBlockFilter(): Promise<HexString> {
    const id = this.makeFilterId()
    const cursor = await this.setInitialCursorPosition(id, "latest")
    console.log(
      `Installing new block filter (${id}) with initial cursor position:`,
      cursor
    )
    this.blockFilters.add(id)
    this.setFilterTimeout(id)
    return hexStringFromIntNumber(id)
  }

  public async newPendingTransactionFilter(): Promise<HexString> {
    const id = this.makeFilterId()
    const cursor = await this.setInitialCursorPosition(id, "latest")
    console.log(
      `Installing new block filter (${id}) with initial cursor position:`,
      cursor
    )
    this.pendingTransactionFilters.add(id)
    this.setFilterTimeout(id)
    return hexStringFromIntNumber(id)
  }

  public uninstallFilter(filterId: HexString): boolean {
    const id = intNumberFromHexString(filterId)
    console.log(`Uninstalling filter (${id})`)
    this.deleteFilter(id)
    return true
  }

  public getFilterChanges(filterId: HexString): Promise<JSONRPCResponse> {
    const id = intNumberFromHexString(filterId)
    if (this.timeouts.has(id)) {
      // extend timeout
      this.setFilterTimeout(id)
    }
    if (this.logFilters.has(id)) {
      return this.getLogFilterChanges(id)
    } else if (this.blockFilters.has(id)) {
      return this.getBlockFilterChanges(id)
    } else if (this.pendingTransactionFilters.has(id)) {
      return this.getPendingTransactionFilterChanges(id)
    }
    return Promise.resolve(filterNotFoundError())
  }

  public async getFilterLogs(filterId: HexString): Promise<JSONRPCResponse> {
    const id = intNumberFromHexString(filterId)
    const filter = this.logFilters.get(id)
    if (!filter) {
      return filterNotFoundError()
    }
    return this.sendAsyncPromise({
      ...JSONRPC_TEMPLATE,
      method: "eth_getLogs",
      params: [paramFromFilter(filter)]
    })
  }

  private makeFilterId(): IntNumber {
    return IntNumber(++this.nextFilterId)
  }

  private sendAsyncPromise(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      this.provider.sendAsync(request, (err, response) => {
        if (err) {
          return reject(err)
        }
        if (Array.isArray(response) || response == null) {
          return reject(
            new Error(
              `unexpected response received: ${JSON.stringify(response)}`
            )
          )
        }
        resolve(response)
      })
    })
  }

  private deleteFilter(id: IntNumber): void {
    console.log(`Deleting filter (${id})`)
    this.logFilters.delete(id)
    this.blockFilters.delete(id)
    this.pendingTransactionFilters.delete(id)
    this.cursors.delete(id)
    this.timeouts.delete(id)
  }

  private async getLogFilterChanges(id: IntNumber): Promise<JSONRPCResponse> {
    const filter = this.logFilters.get(id)
    const cursorPosition = this.cursors.get(id)
    if (!cursorPosition || !filter) {
      return filterNotFoundError()
    }
    const currentBlockHeight = await this.getCurrentBlockHeight()
    const toBlock =
      filter.toBlock === "latest" ? currentBlockHeight : filter.toBlock

    if (cursorPosition > currentBlockHeight) {
      return emptyResult()
    }
    if (cursorPosition > filter.toBlock) {
      return emptyResult()
    }

    console.log(
      `Fetching logs from ${cursorPosition} to ${toBlock} for filter ${id}`
    )

    const response = await this.sendAsyncPromise({
      ...JSONRPC_TEMPLATE,
      method: "eth_getLogs",
      params: [
        paramFromFilter({
          ...filter,
          fromBlock: cursorPosition,
          toBlock
        })
      ]
    })

    if (Array.isArray(response.result)) {
      const blocks = response.result.map(log =>
        intNumberFromHexString(log.blockNumber || "0x0")
      )
      const highestBlock = Math.max(...blocks)
      if (highestBlock && highestBlock > cursorPosition) {
        const newCursorPosition = IntNumber(highestBlock + 1)
        console.log(
          `Moving cursor position for filter (${id}) from ${cursorPosition} to ${newCursorPosition}`
        )
        this.cursors.set(id, newCursorPosition)
      }
    }
    return response
  }

  private async getBlockFilterChanges(id: IntNumber): Promise<JSONRPCResponse> {
    const cursorPosition = this.cursors.get(id)
    if (!cursorPosition) {
      return filterNotFoundError()
    }
    const currentBlockHeight = await this.getCurrentBlockHeight()
    if (cursorPosition > currentBlockHeight) {
      return emptyResult()
    }

    console.log(
      `Fetching blocks from ${cursorPosition} to ${currentBlockHeight} for filter (${id})`
    )
    const blocks = (await Promise.all(
      range(cursorPosition, currentBlockHeight + 1).map(i =>
        this.getBlockHashByNumber(IntNumber(i))
      )
    )).filter(hash => !!hash)

    const newCursorPosition = IntNumber(cursorPosition + blocks.length)
    console.log(
      `Moving cursor position for filter (${id}) from ${cursorPosition} to ${newCursorPosition}`
    )
    this.cursors.set(id, newCursorPosition)
    return { ...JSONRPC_TEMPLATE, result: blocks }
  }

  private async getPendingTransactionFilterChanges(
    _id: IntNumber
  ): Promise<JSONRPCResponse> {
    // pending transaction filters are not supported
    return Promise.resolve(emptyResult())
  }

  private async setInitialCursorPosition(
    id: IntNumber,
    startBlock: IntBlockHeight
  ): Promise<number> {
    const currentBlockHeight = await this.getCurrentBlockHeight()
    const initialCursorPosition =
      typeof startBlock === "number" && startBlock > currentBlockHeight
        ? startBlock
        : currentBlockHeight
    this.cursors.set(id, initialCursorPosition)
    return initialCursorPosition
  }

  private setFilterTimeout(id: IntNumber): void {
    const existing = this.timeouts.get(id)
    if (existing) {
      window.clearTimeout(existing)
    }
    const timeout = window.setTimeout(() => {
      console.log(`Filter (${id}) timed out`)
      this.deleteFilter(id)
    }, TIMEOUT)
    this.timeouts.set(id, timeout)
  }

  private async getCurrentBlockHeight(): Promise<IntNumber> {
    const { result } = await this.sendAsyncPromise({
      ...JSONRPC_TEMPLATE,
      method: "eth_blockNumber",
      params: []
    })
    return intNumberFromHexString(ensureHexString(result))
  }

  private async getBlockHashByNumber(
    blockNumber: IntNumber
  ): Promise<HexString | null> {
    const response = await this.sendAsyncPromise({
      ...JSONRPC_TEMPLATE,
      method: "eth_getBlockByNumber",
      params: [hexStringFromIntNumber(blockNumber), false]
    })
    if (response.result && typeof response.result.hash === "string") {
      return ensureHexString(response.result.hash)
    }
    return null
  }
}

export function filterFromParam(param: FilterParam): Filter {
  return {
    fromBlock: intBlockHeightFromHexBlockHeight(param.fromBlock),
    toBlock: intBlockHeightFromHexBlockHeight(param.toBlock),
    addresses:
      param.address === undefined
        ? null
        : Array.isArray(param.address)
        ? param.address
        : [param.address],
    topics: param.topics || []
  }
}

function paramFromFilter(filter: Filter): FilterParam {
  const param: FilterParam = {
    fromBlock: hexBlockHeightFromIntBlockHeight(filter.fromBlock),
    toBlock: hexBlockHeightFromIntBlockHeight(filter.toBlock),
    topics: filter.topics
  }
  if (filter.addresses !== null) {
    param.address = filter.addresses
  }
  return param
}

function intBlockHeightFromHexBlockHeight(
  value: RawHexBlockHeight | HexBlockHeight | undefined
): IntBlockHeight {
  if (value === undefined || value === "latest" || value === "pending") {
    return "latest"
  } else if (value === "earliest") {
    return IntNumber(0)
  } else if (isHexString(value)) {
    return intNumberFromHexString(value)
  }
  throw new Error(`Invalid block option: ${value}`)
}

function hexBlockHeightFromIntBlockHeight(
  value: IntBlockHeight
): HexBlockHeight {
  if (value === "latest") {
    return value
  }
  return hexStringFromIntNumber(value)
}

function filterNotFoundError(): JSONRPCResponse {
  return {
    ...JSONRPC_TEMPLATE,
    error: { code: -32000, message: "filter not found" }
  }
}

function emptyResult(): JSONRPCResponse {
  return { ...JSONRPC_TEMPLATE, result: [] }
}
