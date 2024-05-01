import { Message, MessageID } from '../message';
import { standardErrors } from ':core/error';

export abstract class CrossDomainCommunicator {
  protected url: URL | undefined = undefined;
  private connected = false;

  protected abstract setupPeerWindow(): Promise<void>;
  // returns true if the message is handled
  protected abstract handleIncomingMessage(_: Message): Promise<boolean>;

  async connect() {
    if (this.connected) return;
    window.addEventListener('message', this.eventListener.bind(this));
    await this.setupPeerWindow();
    this.connected = true;
  }

  protected disconnect() {
    this.connected = false;
    window.removeEventListener('message', this.eventListener.bind(this));
    this.rejectWaitingRequests();
  }

  protected peerWindow: Window | null = null;

  private getTargetOrigin(options?: { bypassTargetOriginCheck: boolean }): string | undefined {
    if (this.url) return this.url.origin;
    if (options?.bypassTargetOriginCheck) return '*';
    return undefined;
  }

  async postMessage(message: Message, options?: { bypassTargetOriginCheck: boolean }) {
    const targetOrigin = this.getTargetOrigin(options);
    if (!targetOrigin || !this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }
    this.peerWindow.postMessage(message, targetOrigin);
  }

  async postMessageForResponse(message: Message): Promise<Message> {
    this.postMessage(message);
    return new Promise((resolve, reject) => {
      this.requestMap.set(message.id, {
        resolve,
        reject,
      });
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
      this.handleIncomingMessage(message);
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
