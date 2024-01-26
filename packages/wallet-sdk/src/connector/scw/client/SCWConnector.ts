// Import necessary types and interfaces as needed

import { standardErrors } from '../../../core/error';
import { Action } from '../type/Action';
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

  private isMethodSupported(method: string) {
    const supportedMethods = ['eth_requestAccounts'];
    return supportedMethods.includes(method);
  }

  public async request(request: RequestArguments): Promise<ActionResponse> {
    if (!this.isMethodSupported(request.method)) {
      return Promise.reject(standardErrors.provider.unsupportedMethod);
    }
    if (!this.puc.connected) {
      await this.puc.connect();
    }

    const pucRequest: Request = {
      uuid: crypto.randomUUID(),
      timestamp: Date.now(),
      actions: [request as unknown as Action],
    };

    return this.puc
      .request(pucRequest)
      .then((responseEnvelope) => responseEnvelope.response.actionResponses[0])
      .catch((err) => {
        throw new Error(err.errorMessage);
      });
  }
}
