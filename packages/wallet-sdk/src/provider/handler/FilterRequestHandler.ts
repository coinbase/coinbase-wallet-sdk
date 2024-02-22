import { standardErrors } from '../../core/error';
import { ensureHexString } from '../../core/util';
import { FilterPolyfill } from '../FilterPolyfill';
import { JSONRPCResponse } from '../JSONRPC';
import { ProviderInterface, RequestArguments } from '../ProviderInterface';
import { RequestHandler } from './RequestHandler';

export class FilterRequestHandler implements RequestHandler {
  private readonly filterPolyfill: FilterPolyfill;

  constructor({ provider }: { provider: ProviderInterface }) {
    this.filterPolyfill = new FilterPolyfill(provider);
  }

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
    }

    return Promise.reject(standardErrors.rpc.methodNotFound());
  }

  private async eth_newFilter(params: unknown[]): Promise<JSONRPCResponse> {
    const param = params[0] as any;
    const filterId = await this.filterPolyfill.newFilter(param);
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async eth_newBlockFilter(): Promise<JSONRPCResponse> {
    const filterId = await this.filterPolyfill.newBlockFilter();
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async eth_newPendingTransactionFilter(): Promise<JSONRPCResponse> {
    const filterId = await this.filterPolyfill.newPendingTransactionFilter();
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async eth_uninstallFilter(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    const result = this.filterPolyfill.uninstallFilter(filterId);
    return { jsonrpc: '2.0', id: 0, result };
  }

  private eth_getFilterChanges(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    return this.filterPolyfill.getFilterChanges(filterId);
  }

  private eth_getFilterLogs(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    return this.filterPolyfill.getFilterLogs(filterId);
  }

  canHandleRequest(request: RequestArguments): boolean {
    const filterMethods = [
      'eth_newFilter',
      'eth_newBlockFilter',
      'eth_newPendingTransactionFilter',
      'eth_getFilterChanges',
      'eth_getFilterLogs',
    ];

    return filterMethods.includes(request.method);
  }
}
