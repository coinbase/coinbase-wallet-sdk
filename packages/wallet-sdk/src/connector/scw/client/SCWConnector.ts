import { standardErrors } from '../../../core/error';
import { Action, SupportedEthereumMethods } from '../type/Action';
import { ActionResponse } from '../type/ActionResponse';
import { Connector } from '../type/ConnectorInterface';
import { Request } from '../type/Request';
import { PopUpCommunicator } from './PopUpCommunicator';
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
    return await this.request({
      method: 'eth_requestAccounts',
      params: { appName: this.appName, appLogoUrl: this.appLogoUrl },
    });
  }

  private _checkMethod(method: string): boolean {
    return Object.values(SupportedEthereumMethods).includes(method as SupportedEthereumMethods);
  }

  public async request(request: RequestArguments): Promise<ActionResponse> {
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
      uuid: crypto.randomUUID(),
      timestamp: Date.now(),
      actions: [request as Action],
    };

    return this.puc
      .request(pucRequest)
      .then((responseEnvelope) => responseEnvelope.response.actionResponses[0])
      .catch((err) => {
        throw new Error(err.errorMessage);
      });
  }
}
