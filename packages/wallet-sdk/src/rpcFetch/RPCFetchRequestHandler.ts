import { LIB_VERSION } from '../version';
import { standardErrors } from ':core/error';
import { Chain } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';
import { RequestHandler } from ':core/type/RequestHandlerInterface';

export class RPCFetchRequestHandler implements RequestHandler {
  canHandleRequest(_: RequestArguments): boolean {
    return true;
  }

  async handleRequest(request: RequestArguments, _: unknown, chain: Chain) {
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
      headers: { 'Content-Type': 'application/json', 'X-Cbw-Sdk-Version': LIB_VERSION },
    });
    const response = await res.json();
    return response.result;
  }
}
