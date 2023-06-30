import SafeEventEmitter from "@metamask/safe-event-emitter";

import { Web3Provider } from "./Web3Provider";

// const createSubscriptionManager = require("eth-json-rpc-filters/subscriptionManager");
// const noop = () => {};

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
  // private readonly subscriptionMiddleware: SubscriptionMiddleware;
  // readonly events: SafeEventEmitter;

  constructor(_: Web3Provider & SafeEventEmitter) {
    // const blockTracker = new PollingBlockTracker({
    //   provider: provider as any,
    //   pollingInterval: 15 * 1000, // 15 sec
    //   setSkipCacheFlag: true,
    // });

    // const { events, middleware } = createSubscriptionManager({
    //   blockTracker,
    //   provider,
    // });

    // this.events = events;
    // this.subscriptionMiddleware = middleware;
  }

  public async handleRequest(_: {
    method: string;
    params: any[];
  }): Promise<SubscriptionResult> {
    const result = {};
    await Promise.resolve();
    // await this.subscriptionMiddleware(request, result, noop, noop);
    return result;
  }

  public destroy() {
    // this.subscriptionMiddleware.destroy();
  }
}

// interface SubscriptionMiddleware {
//   (
//     req: RequestArguments,
//     res: SubscriptionResult,
//     next: JsonRpcEngineNextCallback,
//     end: JsonRpcEngineEndCallback,
//   ): Promise<void>;

//   destroy(): void;
// }
