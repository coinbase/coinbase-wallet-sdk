import type {
  JsonRpcEngineEndCallback,
  JsonRpcEngineNextCallback,
} from '@metamask/json-rpc-engine';
import { PollingBlockTracker } from 'eth-block-tracker';
import { EventEmitter } from 'eventemitter3';

import { Chain } from '../../connector/ConnectorInterface';
import { AddressString } from '../../core/type';
import { ProviderInterface, RequestArguments } from '../ProviderInterface';
import { RequestHandler } from './RequestHandler';

// TODO: When we update this package we should be able to fix this
//  eslint-disable-next-line @typescript-eslint/no-var-requires
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const noop = () => {};

interface SubscriptionResult {
  result?: unknown;
}

export class SubscriptionRequestHandler implements RequestHandler {
  private readonly subscriptionMiddleware: SubscriptionMiddleware;
  readonly events: EventEmitter;

  constructor({ provider }: { provider: ProviderInterface }) {
    const blockTracker = new PollingBlockTracker({
      provider: provider as unknown as never,
      pollingInterval: 15_000,
      setSkipCacheFlag: true,
    });

    const { events, middleware } = createSubscriptionManager({
      blockTracker,
      provider,
    });

    this.events = events;
    this.subscriptionMiddleware = middleware;
  }

  canHandleRequest(request: RequestArguments): boolean {
    const subscriptionMethods = ['eth_subscribe', 'eth_unsubscribe'];
    return subscriptionMethods.includes(request.method);
  }

  async handleRequest(request: RequestArguments, _accounts: AddressString[], _chain: Chain) {
    const result = {};
    await this.subscriptionMiddleware(request, result, noop, noop);
    return result;
  }

  async onDisconnect() {
    this.subscriptionMiddleware.destroy();
  }
}

interface SubscriptionMiddleware {
  (
    req: RequestArguments,
    res: SubscriptionResult,
    next: JsonRpcEngineNextCallback,
    end: JsonRpcEngineEndCallback
  ): Promise<void>;

  destroy(): void;
}
