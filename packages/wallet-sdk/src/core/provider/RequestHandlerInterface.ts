import { AddressString, Chain } from '../type';
import { RequestArguments } from './interface';
import { Method, MethodCategory } from './method';

type RequestArgumentsExt<C extends MethodCategory> = RequestArguments & {
  readonly method: Method<C>;
};

export interface RequestHandler<C extends MethodCategory> {
  canHandleRequest(request: RequestArgumentsExt<C>): boolean;
  handleRequest(
    request: RequestArgumentsExt<C>,
    accounts: AddressString[],
    chain: Chain
  ): Promise<unknown>;
  onDisconnect?(): Promise<void>;
}
