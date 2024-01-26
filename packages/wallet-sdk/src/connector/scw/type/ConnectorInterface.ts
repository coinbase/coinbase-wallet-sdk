import { ActionResponse } from './ActionResponse';
import { RequestArguments } from ':wallet-sdk/src/provider/ProviderInterface';

export interface Connector {
  handshake(): Promise<ActionResponse>;
  request(request: RequestArguments): Promise<ActionResponse>;
}
