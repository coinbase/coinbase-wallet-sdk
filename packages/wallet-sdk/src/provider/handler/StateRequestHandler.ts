import { Chain } from '../../connector/ConnectorInterface';
import { standardErrors } from '../../core/error';
import { AddressString } from '../../core/type';
import { RequestArguments } from '../ProviderInterface';
import { RequestHandler } from './RequestHandler';

export class StateRequestHandler implements RequestHandler {
  async handleRequest(request: RequestArguments, accounts: AddressString[], chain: Chain) {
    switch (request.method) {
      case 'eth_chainId':
        return chain.id;
      case 'eth_accounts':
        return this._eth_accounts(accounts);
      case 'eth_coinbase':
        return this._eth_accounts(accounts)[0];
      case 'net_version':
        return chain.id;
    }

    return Promise.reject(standardErrors.rpc.methodNotFound());
  }

  private _eth_accounts(accounts: AddressString[]): AddressString[] {
    if (!accounts) {
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before 'eth_accounts'"
      );
    }
    return accounts;
  }

  canHandleRequest(request: RequestArguments): boolean {
    const subscriptionMethods = ['eth_chainId', 'eth_accounts', 'eth_coinbase', 'net_version'];
    return subscriptionMethods.includes(request.method);
  }
}
