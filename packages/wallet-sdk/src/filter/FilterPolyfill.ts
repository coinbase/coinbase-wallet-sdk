// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { Callback, HexString, IntNumber } from ':core/type';
import { ProviderInterface, RequestArguments } from ':core/type/ProviderInterface';
import {
  ensureHexString,
  hexStringFromIntNumber,
  intNumberFromHexString,
  isHexString,
  range,
} from ':core/util';

const TIMEOUT = 5 * 60 * 1000; // 5 minutes

type RawHexBlockHeight = HexString | 'earliest' | 'latest' | 'pending';
type HexBlockHeight = HexString | 'latest';
type IntBlockHeight = IntNumber | 'latest';

export interface FilterParam {
  fromBlock: RawHexBlockHeight | undefined;
  toBlock: RawHexBlockHeight | undefined;
  address?: string | string[];
  topics?: (string | string[])[];
}

export interface Filter {
  fromBlock: IntBlockHeight;
  toBlock: IntBlockHeight;
  addresses: string[] | null;
  topics: (string | string[])[];
}

export class FilterPolyfill {
  private readonly provider: ProviderInterface;
  private readonly logFilters = new Map<IntNumber, Filter>(); // <id, filter>
  private readonly blockFilters = new Set<IntNumber>(); // <id>
  private readonly pendingTransactionFilters = new Set<IntNumber>(); // <id, true>
  private readonly cursors = new Map<IntNumber, IntNumber>(); // <id, cursor>
  private readonly timeouts = new Map<IntNumber, number>(); // <id, setTimeout id>
  private nextFilterId = IntNumber(1);

  constructor(provider: ProviderInterface) {
    this.provider = provider;
  }

  public async newFilter(param: FilterParam): Promise<HexString> {
    const filter = filterFromParam(param);
    const id = this.makeFilterId();
    const cursor = await this.setInitialCursorPosition(id, filter.fromBlock);
    console.info(`Installing new log filter(${id}):`, filter, 'initial cursor position:', cursor);
    this.logFilters.set(id, filter);
    this.setFilterTimeout(id);
    return hexStringFromIntNumber(id);
  }

  public async newBlockFilter(): Promise<HexString> {
    const id = this.makeFilterId();
    const cursor = await this.setInitialCursorPosition(id, 'latest');
    console.info(`Installing new block filter (${id}) with initial cursor position:`, cursor);
    this.blockFilters.add(id);
    this.setFilterTimeout(id);
    return hexStringFromIntNumber(id);
  }

  public async newPendingTransactionFilter(): Promise<HexString> {
    const id = this.makeFilterId();
    const cursor = await this.setInitialCursorPosition(id, 'latest');
    console.info(`Installing new block filter (${id}) with initial cursor position:`, cursor);
    this.pendingTransactionFilters.add(id);
    this.setFilterTimeout(id);
    return hexStringFromIntNumber(id);
  }

  public uninstallFilter(filterId: HexString): boolean {
    const id = intNumberFromHexString(filterId);
    console.info(`Uninstalling filter (${id})`);
    this.deleteFilter(id);
    return true;
  }

  public getFilterChanges(filterId: HexString) {
    const id = intNumberFromHexString(filterId);
    if (this.timeouts.has(id)) {
      // extend timeout
      this.setFilterTimeout(id);
    }
    if (this.logFilters.has(id)) {
      return this.getLogFilterChanges(id);
    } else if (this.blockFilters.has(id)) {
      return this.getBlockFilterChanges(id);
    } else if (this.pendingTransactionFilters.has(id)) {
      return this.getPendingTransactionFilterChanges(id);
    }
    return Promise.resolve(filterNotFoundError());
  }

  public async getFilterLogs(filterId: HexString) {
    const id = intNumberFromHexString(filterId);
    const filter = this.logFilters.get(id);
    if (!filter) {
      return filterNotFoundError();
    }
    return this.sendAsyncPromise({
      method: 'eth_getLogs',
      params: [paramFromFilter(filter)],
    });
  }

  private makeFilterId(): IntNumber {
    return IntNumber(++this.nextFilterId);
  }

  // to mimic the legacy provider's behavior
  private async legacySendAsync(
    request: RequestArguments,
    callback: Callback<{
      result: unknown;
    }>
  ) {
    try {
      const result = await this.provider.request(request);
      const response = {
        result,
      };
      callback(null, response);
    } catch (err) {
      callback(err as Error, null);
    }
  }

  private sendAsyncPromise(request: RequestArguments): Promise<{ result: unknown }> {
    return new Promise((resolve, reject) => {
      this.legacySendAsync(request, (err, response) => {
        if (err) {
          return reject(err);
        }
        if (Array.isArray(response) || response == null) {
          return reject(new Error(`unexpected response received: ${JSON.stringify(response)}`));
        }
        resolve(response);
      });
    });
  }

  private deleteFilter(id: IntNumber): void {
    console.info(`Deleting filter (${id})`);
    this.logFilters.delete(id);
    this.blockFilters.delete(id);
    this.pendingTransactionFilters.delete(id);
    this.cursors.delete(id);
    this.timeouts.delete(id);
  }

  private async getLogFilterChanges(id: IntNumber) {
    const filter = this.logFilters.get(id);
    const cursorPosition = this.cursors.get(id);
    if (!cursorPosition || !filter) {
      return filterNotFoundError();
    }
    const currentBlockHeight = await this.getCurrentBlockHeight();
    const toBlock = filter.toBlock === 'latest' ? currentBlockHeight : filter.toBlock;

    if (cursorPosition > currentBlockHeight) {
      return emptyResult();
    }
    if (cursorPosition > Number(filter.toBlock)) {
      return emptyResult();
    }

    console.info(`Fetching logs from ${cursorPosition} to ${toBlock} for filter ${id}`);

    const response = await this.sendAsyncPromise({
      method: 'eth_getLogs',
      params: [
        paramFromFilter({
          ...filter,
          fromBlock: cursorPosition,
          toBlock,
        }),
      ],
    });

    if (Array.isArray(response.result)) {
      const blocks = response.result.map((log) => intNumberFromHexString(log.blockNumber || '0x0'));
      const highestBlock = Math.max(...blocks);
      if (highestBlock && highestBlock > cursorPosition) {
        const newCursorPosition = IntNumber(highestBlock + 1);
        console.info(
          `Moving cursor position for filter (${id}) from ${cursorPosition} to ${newCursorPosition}`
        );
        this.cursors.set(id, newCursorPosition);
      }
    }
    return response;
  }

  private async getBlockFilterChanges(id: IntNumber) {
    const cursorPosition = this.cursors.get(id);
    if (!cursorPosition) {
      return filterNotFoundError();
    }
    const currentBlockHeight = await this.getCurrentBlockHeight();
    if (cursorPosition > currentBlockHeight) {
      return emptyResult();
    }

    console.info(
      `Fetching blocks from ${cursorPosition} to ${currentBlockHeight} for filter (${id})`
    );
    const blocks = (
      await Promise.all(
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        range(cursorPosition, currentBlockHeight + 1).map((i) =>
          this.getBlockHashByNumber(IntNumber(i))
        )
      )
    ).filter((hash) => !!hash);

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    const newCursorPosition = IntNumber(cursorPosition + blocks.length);
    console.info(
      `Moving cursor position for filter (${id}) from ${cursorPosition} to ${newCursorPosition}`
    );
    this.cursors.set(id, newCursorPosition);
    return { result: blocks };
  }

  private async getPendingTransactionFilterChanges(_id: IntNumber) {
    // pending transaction filters are not supported
    return Promise.resolve(emptyResult());
  }

  private async setInitialCursorPosition(
    id: IntNumber,
    startBlock: IntBlockHeight
  ): Promise<number> {
    const currentBlockHeight = await this.getCurrentBlockHeight();
    const initialCursorPosition =
      typeof startBlock === 'number' && startBlock > currentBlockHeight
        ? startBlock
        : currentBlockHeight;
    this.cursors.set(id, initialCursorPosition);
    return initialCursorPosition;
  }

  private setFilterTimeout(id: IntNumber): void {
    const existing = this.timeouts.get(id);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timeout = window.setTimeout(() => {
      console.info(`Filter (${id}) timed out`);
      this.deleteFilter(id);
    }, TIMEOUT);
    this.timeouts.set(id, timeout);
  }

  private readonly REQUEST_THROTTLE_INTERVAL = 1000; // in milliseconds
  private lastFetchTimestamp = new Date(0);
  private currentBlockHeight?: IntNumber;
  private resolvers: Array<(value: IntNumber) => void> = [];

  // throttle eth_blockNumber requests
  async getCurrentBlockHeight(): Promise<IntNumber> {
    const now = new Date();

    if (now.getTime() - this.lastFetchTimestamp.getTime() > this.REQUEST_THROTTLE_INTERVAL) {
      this.lastFetchTimestamp = now;
      const height = await this._getCurrentBlockHeight();

      this.currentBlockHeight = height;
      this.resolvers.forEach((resolve) => resolve(height));
      this.resolvers = [];
    }

    if (!this.currentBlockHeight) {
      return new Promise((resolve) => this.resolvers.push(resolve));
    }

    return this.currentBlockHeight;
  }

  async _getCurrentBlockHeight(): Promise<IntNumber> {
    const { result } = await this.sendAsyncPromise({
      method: 'eth_blockNumber',
      params: [],
    });
    return intNumberFromHexString(ensureHexString(result));
  }

  private async getBlockHashByNumber(blockNumber: IntNumber): Promise<HexString | null> {
    const response = await this.sendAsyncPromise({
      method: 'eth_getBlockByNumber',
      params: [hexStringFromIntNumber(blockNumber), false],
    });
    const hash = (response.result as { hash?: string })?.hash;
    if (hash) {
      return ensureHexString(hash);
    }
    return null;
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
    topics: param.topics || [],
  };
}

function paramFromFilter(filter: Filter): FilterParam {
  const param: FilterParam = {
    fromBlock: hexBlockHeightFromIntBlockHeight(filter.fromBlock),
    toBlock: hexBlockHeightFromIntBlockHeight(filter.toBlock),
    topics: filter.topics,
  };
  if (filter.addresses !== null) {
    param.address = filter.addresses;
  }
  return param;
}

function intBlockHeightFromHexBlockHeight(
  value: RawHexBlockHeight | HexBlockHeight | undefined
): IntBlockHeight {
  if (value === undefined || value === 'latest' || value === 'pending') {
    return 'latest';
  } else if (value === 'earliest') {
    return IntNumber(0);
  } else if (isHexString(value)) {
    return intNumberFromHexString(value);
  }
  throw new Error(`Invalid block option: ${String(value)}`);
}

function hexBlockHeightFromIntBlockHeight(value: IntBlockHeight): HexBlockHeight {
  if (value === 'latest') {
    return value;
  }
  return hexStringFromIntNumber(value);
}

function filterNotFoundError() {
  return {
    error: { code: -32000, message: 'filter not found' },
  };
}

function emptyResult() {
  return { result: [] };
}
