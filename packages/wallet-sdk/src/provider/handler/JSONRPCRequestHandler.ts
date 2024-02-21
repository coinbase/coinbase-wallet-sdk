import { Chain } from '../../connector/ConnectorInterface';
import { standardErrors } from '../../core/error';
import { AddressString } from '../../core/type';
import { RequestArguments } from '../ProviderInterface';
import { RequestHandler } from './RequestHandler';

export class JSONRPCRequestHandler implements RequestHandler {
  canHandleRequest(_: RequestArguments): boolean {
    return true;
  }

  async handleRequest(request: RequestArguments, _accounts: AddressString[], chain: Chain) {
    if (!chain.rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');

    const requestBody = {
      ...request,
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
    };
    const res = await window.fetch(chain.rpcUrl, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await res.json();
    return response;
  }
}
