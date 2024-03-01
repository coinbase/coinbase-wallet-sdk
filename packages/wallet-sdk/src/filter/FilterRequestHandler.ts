/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterPolyfill } from './FilterPolyfill';
import { standardErrors } from ':core/error';
import { ProviderInterface, RequestArguments } from ':core/type/ProviderInterface';
import { RequestHandler } from ':core/type/RequestHandlerInterface';
import { ensureHexString } from ':core/util';

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
