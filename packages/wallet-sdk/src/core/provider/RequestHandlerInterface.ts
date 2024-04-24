import { AddressString, Chain } from '../type';
import { RequestArguments } from './interface';
import { Method, MethodCategory } from './method';

export type RequestWithMethodCategory<C extends MethodCategory> = RequestArguments & {
  readonly method: Method<C>;
};

export interface RequestHandler<C extends MethodCategory> {
  handleRequest(
    request: RequestWithMethodCategory<C>,
    accounts: AddressString[],
    chain: Chain
  ): Promise<unknown>;
  onDisconnect?(): Promise<void>;
}
