import { Chain } from '../../connector/ConnectorInterface';
import { standardErrors } from '../../core/error';
import { AddressString } from '../../core/type';
import { ensureHexString } from '../../core/util';
import { FilterPolyfill } from '../FilterPolyfill';
import { JSONRPCResponse } from '../JSONRPC';
import { ProviderInterface, RequestArguments } from '../ProviderInterface';
import { RequestHandler } from './RequestHandler';

export class FilterRequestHandler implements RequestHandler {
  private readonly _filterPolyfill: FilterPolyfill;

  constructor({ provider }: { provider: ProviderInterface }) {
    this._filterPolyfill = new FilterPolyfill(provider);
  }

  handleRequest(request: RequestArguments, _accounts: AddressString[], _chain: Chain) {
    const { method } = request;
    const params = request.params || [];

    switch (method) {
      case 'eth_newFilter':
        return this._eth_newFilter(params as any);

      case 'eth_newBlockFilter':
        return this._eth_newBlockFilter();

      case 'eth_newPendingTransactionFilter':
        return this._eth_newPendingTransactionFilter();

      case 'eth_getFilterChanges':
        return this._eth_getFilterChanges(params as any);

      case 'eth_getFilterLogs':
        return this._eth_getFilterLogs(params as any);

      case 'eth_uninstallFilter':
        return this._eth_uninstallFilter(params as any);
    }

    return Promise.reject(standardErrors.rpc.methodNotFound());
  }

  private async _eth_newFilter(params: unknown[]): Promise<JSONRPCResponse> {
    const param = params[0] as any;
    const filterId = await this._filterPolyfill.newFilter(param);
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async _eth_newBlockFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newBlockFilter();
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async _eth_newPendingTransactionFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newPendingTransactionFilter();
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async _eth_uninstallFilter(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    const result = this._filterPolyfill.uninstallFilter(filterId);
    return { jsonrpc: '2.0', id: 0, result };
  }

  private _eth_getFilterChanges(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    return this._filterPolyfill.getFilterChanges(filterId);
  }

  private _eth_getFilterLogs(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    return this._filterPolyfill.getFilterLogs(filterId);
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
