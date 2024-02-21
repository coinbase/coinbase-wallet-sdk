import { Chain } from '../../connector/ConnectorInterface';
import { AddressString } from '../../core/type';
import { RequestArguments } from '../ProviderInterface';

export interface RequestHandler {
  canHandleRequest(request: RequestArguments): boolean;
  handleRequest(
    request: RequestArguments,
    accounts: AddressString[],
    chain: Chain
  ): Promise<unknown>;
  onDisconnect?(): void;
}
