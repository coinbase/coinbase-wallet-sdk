/* eslint-disable @typescript-eslint/no-explicit-any */
import { LIB_VERSION } from 'src/version';

import { FilterPolyfill } from './FilterPolyfill';
import { RequestArguments } from ':core/provider/interface';
import { ensureHexString } from ':core/util';

export class FetchRequestHandler {
  private readonly filterPolyfill = new FilterPolyfill(this.fetchRPCRequest.bind(this));
  constructor(private readonly rpcUrl: string) {}

  handleRequest(request: RequestArguments) {
    const { method } = request;
    const params = request.params || [];

    switch (method) {
      case 'eth_newFilter':
        return this.eth_newFilter(params as any);
      case 'eth_newBlockFilter':
        return this.eth_newBlockFilter();
      case 'eth_newPendingTransactionFilter':
        return this.eth_newPendingTransactionFilter();
      case 'eth_getFilterChanges':
        return this.eth_getFilterChanges(params as any);
      case 'eth_getFilterLogs':
        return this.eth_getFilterLogs(params as any);
      case 'eth_uninstallFilter':
        return this.eth_uninstallFilter(params as any);
      default:
        return this.fetchRPCRequest(request);
    }
  }

  private async fetchRPCRequest(request: RequestArguments) {
    const rpcUrl = this.rpcUrl;
    const requestBody = {
      ...request,
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
    };
    const res = await window.fetch(rpcUrl, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'X-Cbw-Sdk-Version': LIB_VERSION },
    });
    const response = await res.json();
    return response.result;
  }

  private async eth_newFilter(params: unknown[]) {
    const param = params[0] as any;
    const filterId = await this.filterPolyfill.newFilter(param);
    return { result: filterId };
  }

  private async eth_newBlockFilter() {
    const filterId = await this.filterPolyfill.newBlockFilter();
    return { result: filterId };
  }

  private async eth_newPendingTransactionFilter() {
    const filterId = await this.filterPolyfill.newPendingTransactionFilter();
    return { result: filterId };
  }

  private async eth_uninstallFilter(params: unknown[]) {
    const filterId = ensureHexString(params[0]);
    const result = this.filterPolyfill.uninstallFilter(filterId);
    return { result };
  }

  private eth_getFilterChanges(params: unknown[]) {
    const filterId = ensureHexString(params[0]);
    return this.filterPolyfill.getFilterChanges(filterId);
  }

  private eth_getFilterLogs(params: unknown[]) {
    const filterId = ensureHexString(params[0]);
    return this.filterPolyfill.getFilterLogs(filterId);
  }
}
