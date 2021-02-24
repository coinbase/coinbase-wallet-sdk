import SafeEventEmitter from "@metamask/safe-event-emitter"
import { Web3Provider } from "./Web3Provider"
const PollingBlockTracker = require("eth-block-tracker")
const createSubscriptionManager = require("eth-json-rpc-filters/subscriptionManager")
const noop = () => {}

export class SubscriptionManager {
  private readonly subscriptionMiddleware: any
  readonly events: SafeEventEmitter

  constructor(provider: Web3Provider) {
    const blockTracker = new PollingBlockTracker({
      provider: provider,
      pollingInterval: 15 * 1000, // 15 sec
      setSkipCacheFlag: true
    })

    const { events, middleware } = createSubscriptionManager({
      blockTracker: blockTracker,
      provider: provider
    })

    this.events = events
    this.subscriptionMiddleware = middleware
  }

  public async handleRequest(request: { method: string; params: any[] }) {
    let result = {}
    await this.subscriptionMiddleware(request, result, {}, noop)
    return result
  }

  public destroy() {
    this.subscriptionMiddleware.destroy()
  }
}
