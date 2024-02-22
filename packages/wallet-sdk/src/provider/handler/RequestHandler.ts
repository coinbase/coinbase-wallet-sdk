import { AddressString, Chain } from '../../core/type';
import { RequestArguments } from '../ProviderInterface';

export interface RequestHandler {
  canHandleRequest(request: RequestArguments): boolean;
  handleRequest(
    request: RequestArguments,
    accounts: AddressString[],
    chain: Chain
  ): Promise<unknown>;
  onDisconnect?(): Promise<void>;
}
