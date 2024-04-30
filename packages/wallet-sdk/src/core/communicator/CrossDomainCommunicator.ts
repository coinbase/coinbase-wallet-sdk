import { createMessage, Message, MessageID, MessageWithOptionalId } from '../message';
import { standardErrors } from ':core/error';

export abstract class CrossDomainCommunicator {
  protected url: URL | undefined = undefined;
  private connected = false;

  protected abstract onConnect(): Promise<void>;
  protected abstract onDisconnect(): void;
  protected abstract onEvent(event: MessageEvent<Message>): void;

  async connect(): Promise<void> {
    if (this.connected) return;
    window.addEventListener('message', this.eventListener.bind(this));
    await this.onConnect();
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    window.removeEventListener('message', this.eventListener.bind(this));
    this.rejectWaitingRequests();
    this.onDisconnect();
  }

  protected peerWindow: Window | null = null;

  private getTargetOrigin(options?: { bypassTargetOriginCheck: boolean }): string | undefined {
    if (this.url) return this.url.origin;
    if (options?.bypassTargetOriginCheck) return '*';
    return undefined;
  }

  postMessage<M extends Message>(
    params: MessageWithOptionalId<M>,
    options?: { bypassTargetOriginCheck: boolean }
  ) {
    const targetOrigin = this.getTargetOrigin(options);
    if (!targetOrigin || !this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }

    const message = createMessage(params);
    this.peerWindow.postMessage(message, targetOrigin);
  }

  async postMessageForResponse<M extends Message>(
    params: MessageWithOptionalId<M>
  ): Promise<Message> {
    return new Promise((resolve, reject) => {
      const message = createMessage(params);
      this.requestMap.set(message.id, {
        resolve,
        reject,
      });
      this.postMessage(params);
    });
  }

  private requestMap = new Map<
    MessageID,
    {
      resolve: (_: Message) => void;
      reject: (_: Error) => void;
    }
  >();

  private eventListener(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    const { requestId } = message;
    if (!requestId) {
      this.onEvent(event);
      return;
    }

    this.requestMap.get(requestId)?.resolve?.(message);
    this.requestMap.delete(requestId);
  }

  private rejectWaitingRequests() {
    this.requestMap.forEach(({ reject }) => {
      reject(standardErrors.provider.userRejectedRequest('Request rejected'));
    });
    this.requestMap.clear();
  }
}
