import { AddressString, Chain } from '../type';
import { RequestArguments } from './interface';

export interface RequestHandler {
  canHandleRequest(request: RequestArguments): boolean;
  handleRequest(
    request: RequestArguments,
    accounts: AddressString[],
    chain: Chain
  ): Promise<unknown>;
  onDisconnect?(): Promise<void>;
}
