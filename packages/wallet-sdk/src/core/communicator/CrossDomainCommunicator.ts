import { createMessage, Message, MessageID, MessageWithOptionalId } from '../message';
import { standardErrors } from ':core/error';

type Fulfillment = {
  resolve: (_: Message) => void;
  reject: (_: Error) => void;
};

export abstract class CrossDomainCommunicator {
  protected url: URL | undefined = undefined;
  private connected = false;
  private requestMap = new Map<MessageID, Fulfillment>();

  protected abstract onConnect(): Promise<void>;
  protected abstract onDisconnect(): void;
  protected abstract onEvent(event: MessageEvent<Message>): void;

  async connect(): Promise<void> {
    if (this.connected) return;
    window.addEventListener('message', this.eventListner.bind(this));
    await this.onConnect();
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    window.removeEventListener('message', this.eventListner.bind(this));
    this.onDisconnect();
    this.requestMap.forEach((fulfillment, uuid, map) => {
      fulfillment.reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      map.delete(uuid);
    });
  }

  private eventListner(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    const { requestId } = message;
    if (!requestId) {
      this.onEvent(event);
      return;
    }

    const resolveFunction = this.requestMap.get(requestId)?.resolve;
    this.requestMap.delete(requestId);
    resolveFunction?.(message);
  }

  protected peerWindow: Window | null = null;

  postMessage<M extends Message>(
    params: MessageWithOptionalId<M>,
    options?: { bypassTargetOriginCheck: boolean }
  ) {
    let targetOrigin = this.url?.origin;
    if (targetOrigin === undefined) {
      if (options?.bypassTargetOriginCheck) {
        targetOrigin = '*';
      } else {
        throw standardErrors.rpc.internal('Communicator: No target origin');
      }
    }

    if (!this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }

    const message = createMessage(params);
    this.peerWindow.postMessage(message, targetOrigin);
  }

  async postMessageAndWait<M extends Message>(params: MessageWithOptionalId<M>): Promise<Message> {
    return new Promise((resolve, reject) => {
      const message = createMessage(params);
      this.requestMap.set(message.id, {
        resolve,
        reject,
      });
      this.postMessage(params);
    });
  }
}
