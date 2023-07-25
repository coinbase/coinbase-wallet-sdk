import { PollingBlockTracker, Provider } from 'eth-block-tracker';
import { EventEmitter } from 'eventemitter3';
import { JsonRpcEngineEndCallback, JsonRpcEngineNextCallback } from 'json-rpc-engine';

import { RequestArguments, Web3Provider } from './Web3Provider';

// TODO: When we update this package we should be able to fix this
//  eslint-disable-next-line @typescript-eslint/no-var-requires
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const noop = () => {};

export interface SubscriptionResult {
  result?: unknown;
}

export interface SubscriptionNotification {
  method: string;
  params: {
    subscription: string;
    result: unknown;
  };
}

export class SubscriptionManager {
  private readonly subscriptionMiddleware: SubscriptionMiddleware;
  readonly events: EventEmitter;

  constructor(provider: Web3Provider & EventEmitter) {
    const blockTracker = new PollingBlockTracker({
      provider: provider as unknown as Provider,
      pollingInterval: 15 * 1000, // 15 sec
      setSkipCacheFlag: true,
    });

    const { events, middleware } = createSubscriptionManager({
      blockTracker,
      provider,
    });

    this.events = events;
    this.subscriptionMiddleware = middleware;
  }

  public async handleRequest(request: {
    method: string;
    params: any[];
  }): Promise<SubscriptionResult> {
    const result = {};
    await this.subscriptionMiddleware(request, result, noop, noop);
    return result;
  }

  public destroy() {
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
