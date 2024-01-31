import { standardErrors } from '../../core/error';
import { PopUpCommunicator } from '../../transport/PopUpCommunicator';
import { Connector } from '../ConnectorInterface';
import { Action, SupportedEthereumMethods } from './protocol/type/Action';
import { Request } from './protocol/type/Request';
import { AddressString } from ':wallet-sdk/src/core/type';
import { RequestArguments } from ':wallet-sdk/src/provider/ProviderInterface';

export class SCWConnector implements Connector {
  protected appName = '';
  private appLogoUrl: string | null = null;
  private puc: PopUpCommunicator;

  constructor(options: { appName: string; appLogoUrl: string | null; puc: PopUpCommunicator }) {
    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl;
    this.puc = options.puc;
  }

  public async handshake() {
    // first method called by provider, for now just returns ethereum accounts
    // later: handle passing dapp metadata, storing session, etc.
    // later: return spec-compliant errors for unsupported methods

    // request accounts
    return await this.request<AddressString[]>({
      method: 'eth_requestAccounts',
      params: { appName: this.appName, appLogoUrl: this.appLogoUrl },
    });
  }

  private _checkMethod(method: string): boolean {
    return Object.values(SupportedEthereumMethods).includes(method as SupportedEthereumMethods);
  }

  public async request<T>(request: RequestArguments): Promise<T> {
    if (!this._checkMethod(request.method)) {
      return Promise.reject(
        standardErrors.provider.unsupportedMethod(
          `${request.method} is not supported for SCW at this time`
        )
      );
    }
    // TODO: this check makes sense, but connected isn't set properly so it prevents
    // need to investigate
    // if (!this.puc.connected) {
    await this.puc.connect();
    // }

    const pucRequest: Request = {
      action: request as Action,
    };

    return this.puc.request<T>(pucRequest).then((response) => {
      const result = response.content.result;

      if ('error' in result) {
        throw result.error;
      }

      return result.value;
    });
  }
}
